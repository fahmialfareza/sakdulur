import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";
import type { Graph, GraphPerson, ParentKind, PartnerStatus } from "@/lib/api/types";
import { sortChildren } from "@/lib/relatives";

// Genealogy layout on top of ELK's layered (Sugiyama) algorithm.
//
// Partners are laid out as one block: everyone joined by marriage (including earlier, divorced ones, and
// co-parents who never married) sits side by side, in chain order, so someone who remarried stands between
// their partners (Joyo, Wati, Slamet, Lastri) and the couple lines never cross other people. ELK places the
// blocks (generations as layers, fewest crossings); the people, and a small "union" dot under each couple, are
// then placed inside their block. Children hang below their parents' dot.
//
// A child can also have parents of other kinds (adoptive, step, foster, guardian, milk). Only the primary set
// is laid out: birth parents when recorded, else adoptive, else whatever exists. The other links are dashed
// edges (step ones hidden until someone involved is in focus: the marriage already says it) and a mark on the
// child's card.
//
// Siblings stand left to right in birth order: an order set by hand ("anak ke-") first, else birth date. ELK
// may swap siblings to save a crossing (an in-law family pulling one of them aside); when it does, the siblings
// are put back in order within the places they took and ELK runs again with that order kept.

export const PERSON_WIDTH = 208;
export const PERSON_HEIGHT = 72;
const UNION_SIZE = 10;
const PARTNER_GAP = 28; // between partners in a block
const UNION_DROP = 26; // union dot below the cards

export type PersonNodeData = {
  person: GraphPerson;
  focused: boolean;
  isSelf: boolean;
  /** Kinds of this person's non-primary parents (e.g. foster), shown as a small mark on the card. */
  otherParents?: Exclude<ParentKind, "birth">[];
};
export type PersonFlowNode = Node<PersonNodeData, "person">;
export type UnionFlowNode = Node<{ status?: PartnerStatus }, "union">;
export type FlowNode = PersonFlowNode | UnionFlowNode;
/** Data on the dashed edges of non-primary parents; `people` are the ids involved, to highlight (or show) it. */
export type LinkEdgeData = { people: string[]; kind: Exclude<ParentKind, "birth"> };

const elk = new ELK();

/**
 * How the canvas orders siblings. "compact" (Rapi): birth order where it keeps families together, else ELK's
 * compact layout. "strict" (Sesuai kelahiran): every family left to right in birth order, even if lines get longer.
 */
export type ChildOrder = "compact" | "strict";

const unionId = (a: string, b: string) => (a < b ? `u:${a}:${b}` : `u:${b}:${a}`);

/**
 * Keeps people within `depth` relationship steps of the focus person (all people when depth is Infinity).
 * Large trees stay readable; the rest is reachable by re-focusing.
 */
export function neighbourhood(graph: Graph, focusId: string | undefined, depth: number): Set<string> {
  const ids = new Set(graph.people.map((p) => p._id));
  if (!focusId || !ids.has(focusId) || !Number.isFinite(depth)) return ids;
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  };
  graph.unions.forEach((u) => link(u.partners[0], u.partners[1]));
  graph.parentChild.forEach((pc) => link(pc.parent, pc.child));
  const seen = new Set([focusId]);
  let frontier = [focusId];
  for (let d = 0; d < depth && frontier.length; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (!seen.has(n) && ids.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

/**
 * Orders a group of partners so each stands next to their partners where possible: a chain (A–B–C–D) is walked
 * from one end; someone with several partners stands in the middle of them.
 */
function chainOrder(members: string[], adj: Map<string, Set<string>>): string[] {
  const degree = (id: string) => adj.get(id)?.size ?? 0;
  if (members.length <= 2) return [...members].sort();
  const hubs = members.filter((id) => degree(id) > 2);
  if (hubs.length === 0) {
    // A path (or a ring): start at an end and walk.
    const start = members.find((id) => degree(id) === 1) ?? [...members].sort()[0];
    const order = [start];
    const seen = new Set(order);
    for (let cur = start; ; ) {
      const next = [...(adj.get(cur) ?? [])].sort().find((n) => !seen.has(n));
      if (!next) break;
      order.push(next);
      seen.add(next);
      cur = next;
    }
    return [...order, ...members.filter((id) => !seen.has(id)).sort()];
  }
  // Someone with three or more partners: half of them on each side, the rest of the group after them.
  const hub = hubs.sort((a, b) => degree(b) - degree(a))[0];
  const around = [...(adj.get(hub) ?? [])].sort();
  const left = around.slice(0, Math.floor(around.length / 2));
  const order = [...left, hub, ...around.slice(left.length)];
  const seen = new Set(order);
  return [...order, ...members.filter((id) => !seen.has(id)).sort()];
}

/**
 * Strict birth order ("Sesuai kelahiran"): the order of every row, from the top down, so each family stands
 * under its parents and left to right in birth order.
 * - A child's place comes from their parents' place in the rows above and their birth rank; a couple standing
 *   between two families (cousins who married) goes where both families meet.
 * - A couple with no parents on the canvas (in-laws, or the top generation) stands next to the family their
 *   child married into, on the side where that child stands; with no such link it keeps ELK's place.
 * - Siblings are then put in birth order in the places they took, and two-person couples are turned so each
 *   partner faces their own family. `blocks` is updated in place for that.
 */
function strictRows(
  rowOrder: string[][],
  g: {
    blocks: Map<string, string[]>;
    blockOf: Map<string, string>;
    primaryParents: Map<string, string[]>;
    families: Map<string, string[]>;
    orderOf: Map<string, number>;
    personOf: Map<string, GraphPerson>;
  },
): string[][] {
  const { blocks, blockOf, primaryParents, families, orderOf, personOf } = g;
  // Each child's birth rank within their family.
  const rankOf = new Map<string, { rank: number; size: number; family: string }>();
  for (const [family, kids] of families) {
    const sorted = sortChildren(kids.map((id) => ({ id, order: orderOf.get(id), person: personOf.get(id)! }))).sorted;
    sorted.forEach((c, i) => rankOf.set(c.id, { rank: i, size: sorted.length, family }));
  }
  const parentBlock = (child: string) => blockOf.get(primaryParents.get(child)![0])!;
  const childrenOfBlock = new Map<string, string[]>();
  for (const child of primaryParents.keys()) {
    const pb = parentBlock(child);
    if (pb !== blockOf.get(child)) childrenOfBlock.set(pb, [...(childrenOfBlock.get(pb) ?? []), child]);
  }
  // How many people stand below a block: the biggest family goes first among couples with no parents.
  const below = new Map<string, number>();
  const countBelow = (b: string, seen = new Set<string>()): number => {
    if (below.has(b)) return below.get(b)!;
    if (seen.has(b)) return 0;
    seen.add(b);
    const kids = [...new Set((childrenOfBlock.get(b) ?? []).map((c) => blockOf.get(c)!))];
    const n = kids.reduce((sum, k) => sum + blocks.get(k)!.length + countBelow(k, seen), 0);
    below.set(b, n);
    return n;
  };
  const elkIndex = new Map<string, number>();
  rowOrder.forEach((r) => r.forEach((b, i) => elkIndex.set(b, i)));
  const place = new Map<string, number>(); // block -> start of its place in its row, from 0 to 1
  const width = new Map<string, number>();
  // A child's place from their parents' place above and their birth rank.
  const childPlace = (m: string) => {
    const r = rankOf.get(m);
    const pb = r && parentBlock(m);
    if (!r || !pb || !place.has(pb)) return undefined;
    return place.get(pb)! + (width.get(pb)! * (r.rank + 1)) / (r.size + 1);
  };
  const out: string[][] = [];

  for (const row of rowOrder) {
    const value = new Map<string, number>();
    for (const b of row) {
      const v = blocks.get(b)!.map(childPlace).filter((x): x is number => x !== undefined);
      if (v.length) value.set(b, v.reduce((a, c) => a + c, 0) / v.length);
    }
    const line = row.filter((b) => value.has(b)).sort((a, b) => value.get(a)! - value.get(b)! || elkIndex.get(a)! - elkIndex.get(b)!);
    const familyOfBlock = (b: string) => blocks.get(b)!.map((m) => rankOf.get(m)?.family).find((f) => f);
    // Couples with no parents here: beside the family their child married into, else where ELK had them.
    const roots = row.filter((b) => !value.has(b)).sort((a, b) => countBelow(b) - countBelow(a) || elkIndex.get(a)! - elkIndex.get(b)!);
    for (const r of roots) {
      let at = -1;
      for (const c of childrenOfBlock.get(r) ?? []) {
        for (const m of blocks.get(blockOf.get(c)!)!.filter((x) => x !== c && rankOf.has(x))) {
          const p = line.indexOf(parentBlock(m));
          if (p < 0) continue;
          // That parent's whole family of siblings stays together: go to its left or right end.
          const fam = familyOfBlock(line[p]);
          let lo = p;
          let hi = p;
          while (fam && lo > 0 && familyOfBlock(line[lo - 1]) === fam) lo--;
          while (fam && hi < line.length - 1 && familyOfBlock(line[hi + 1]) === fam) hi++;
          const { rank, size } = rankOf.get(m)!;
          at = (rank + 0.5) / size < 0.5 ? lo : hi + 1;
          break;
        }
        if (at >= 0) break;
      }
      if (at < 0) {
        const left = line.filter((b) => elkIndex.get(b)! < elkIndex.get(r)!).sort((a, b) => elkIndex.get(b)! - elkIndex.get(a)!);
        at = left.length ? line.indexOf(left[0]) + 1 : 0;
      }
      line.splice(at, 0, r);
    }
    // Siblings in birth order within the places they took.
    for (const kids of families.values()) {
      const own = (b: string) => blocks.get(b)!.find((m) => kids.includes(m));
      const slots = line.flatMap((b, i) => (own(b) ? [i] : []));
      if (slots.length < 2) continue;
      const wanted = slots.map((i) => line[i]).sort((a, b) => rankOf.get(own(a)!)!.rank - rankOf.get(own(b)!)!.rank);
      slots.forEach((slot, i) => (line[slot] = wanted[i]));
    }
    line.forEach((b, i) => {
      place.set(b, i / line.length);
      width.set(b, 1 / line.length);
    });
    out.push(line);
  }

  // Two-person couples: each partner on the side of their own parents.
  for (const [b, members] of blocks) {
    if (members.length !== 2) continue;
    const [a, c] = members.map(childPlace);
    if (a !== undefined && c !== undefined && a > c) blocks.set(b, [members[1], members[0]]);
  }
  return out;
}

export async function layoutGraph(
  graph: Graph,
  visible: Set<string>,
  opts: { focusId?: string; selfId?: string; order?: ChildOrder },
): Promise<{ nodes: FlowNode[]; edges: Edge[] }> {
  const people = graph.people.filter((p) => visible.has(p._id));
  const unionStatus = new Map(graph.unions.map((u) => [unionId(u.partners[0], u.partners[1]), u.status]));

  // Each child's visible parents by kind; the primary set is laid out, the rest drawn on demand.
  const linksOf = new Map<string, Map<ParentKind, string[]>>();
  const personOf = new Map(graph.people.map((p) => [p._id, p]));
  const linkOrder = new Map<string, number>(); // "parent>child" -> order set by hand
  for (const pc of graph.parentChild) {
    if (!visible.has(pc.parent) || !visible.has(pc.child)) continue;
    const byKind = linksOf.get(pc.child) ?? new Map<ParentKind, string[]>();
    const kind = pc.kind ?? "birth";
    byKind.set(kind, [...new Set([...(byKind.get(kind) ?? []), pc.parent])]);
    linksOf.set(pc.child, byKind);
    if (pc.order && pc.order > 0) linkOrder.set(`${pc.parent}>${pc.child}`, pc.order);
  }
  const primaryParents = new Map<string, string[]>();
  const otherParents = new Map<string, Exclude<ParentKind, "birth">[]>();
  const extra: { parents: string[]; child: string; kind: Exclude<ParentKind, "birth"> }[] = [];
  for (const [child, byKind] of linksOf) {
    const primary: ParentKind = byKind.has("birth") ? "birth" : byKind.has("adopted") ? "adopted" : [...byKind.keys()][0];
    primaryParents.set(child, [...byKind.get(primary)!].sort());
    for (const [kind, parents] of byKind) {
      if (kind === primary || kind === "birth") continue;
      otherParents.set(child, [...(otherParents.get(child) ?? []), kind]);
      extra.push({ parents: [...parents].sort(), child, kind });
    }
  }
  // A child's order among their primary parents' children: the father's (or first parent's) hand-set order.
  const orderOf = new Map<string, number>();
  for (const [child, parents] of primaryParents) {
    const byFather = [...parents].sort((a, b) => Number(personOf.get(b)?.gender === "male") - Number(personOf.get(a)?.gender === "male"));
    const order = byFather.map((p) => linkOrder.get(`${p}>${child}`)).find((o) => o !== undefined);
    if (order !== undefined) orderOf.set(child, order);
  }

  // Partner groups: unions, plus co-parents who aren't partners (they still share a dot over their children).
  const couples = new Set<string>();
  const adj = new Map<string, Set<string>>();
  const pair = (a: string, b: string) => {
    if (a === b || !visible.has(a) || !visible.has(b)) return;
    couples.add(unionId(a, b));
    adj.set(a, (adj.get(a) ?? new Set()).add(b));
    adj.set(b, (adj.get(b) ?? new Set()).add(a));
  };
  for (const u of graph.unions) pair(u.partners[0], u.partners[1]);
  for (const parents of primaryParents.values()) if (parents.length === 2) pair(parents[0], parents[1]);

  const blockOf = new Map<string, string>();
  const blocks = new Map<string, string[]>();
  for (const p of people) {
    if (blockOf.has(p._id)) continue;
    const members: string[] = [];
    const stack = [p._id];
    blockOf.set(p._id, "");
    while (stack.length) {
      const id = stack.pop()!;
      members.push(id);
      for (const n of adj.get(id) ?? []) {
        if (!blockOf.has(n)) {
          blockOf.set(n, "");
          stack.push(n);
        }
      }
    }
    const order = chainOrder(members, adj);
    const id = `b:${order[0]}`;
    blocks.set(id, order);
    for (const m of order) blockOf.set(m, id);
  }

  // ELK lays out blocks. Each block has a port under every couple's dot (and every parent) and one above every
  // member, so crossing minimisation puts each child under their own parents, not under a parent's other partner.
  const slot = (i: number) => i * (PERSON_WIDTH + PARTNER_GAP);
  // Where each couple's dot sits in its block. Partners side by side: between them. Not side by side (a third
  // spouse, past the second): lower, in the gap beside the partner with fewer partners, so it isn't read as the
  // dot of the person standing between them.
  // Placed again if strict order turns a couple around.
  const dotOf = new Map<string, { dx: number; drop: number }>();
  const placeDots = () => {
    dotOf.clear();
    for (const uid of couples) {
      const [, a, b] = uid.split(":");
      const members = blocks.get(blockOf.get(a)!)!;
      const ia = members.indexOf(a);
      const ib = members.indexOf(b);
      if (Math.abs(ia - ib) <= 1) {
        dotOf.set(uid, { dx: (slot(ia) + slot(ib) + PERSON_WIDTH) / 2, drop: UNION_DROP });
      } else {
        const [near, far] = (adj.get(a)?.size ?? 0) <= (adj.get(b)?.size ?? 0) ? [ia, ib] : [ib, ia];
        const gap = near < far ? near : near - 1; // the gap after slot `gap`
        dotOf.set(uid, { dx: slot(gap) + PERSON_WIDTH + PARTNER_GAP / 2, drop: UNION_DROP + 18 });
      }
    }
  };
  placeDots();
  // Children family by family (same parents), each family in birth order (see sortChildren).
  const families = new Map<string, string[]>();
  for (const [child, parents] of primaryParents) families.set(parents.join("+"), [...(families.get(parents.join("+")) ?? []), child]);
  const children = [...families.values()].flatMap(
    (kids) => sortChildren(kids.map((id) => ({ id, order: orderOf.get(id), person: personOf.get(id)! }))).sorted.map((c) => c.id),
  );
  // Blocks stay in the people's order: reordering them by children (to nudge birth order) let ELK pull families
  // apart in trees where cousins married into each other's families.
  const elkNodesOf = (): ElkNode[] =>
    [...blocks].map(([id, members]) => {
      const bottom = members.map((m, i) => ({ id: `pb:${m}`, x: slot(i) + PERSON_WIDTH / 2 }));
      for (const [uid, dot] of dotOf) if (blockOf.get(uid.split(":")[1]) === id) bottom.push({ id: `pb:${uid}`, x: dot.dx });
      return {
        id,
        width: slot(members.length - 1) + PERSON_WIDTH,
        height: PERSON_HEIGHT,
        layoutOptions: { "elk.portConstraints": "FIXED_POS" },
        ports: [
          ...bottom.map((port) => ({ ...port, y: PERSON_HEIGHT, width: 1, height: 1, layoutOptions: { "elk.port.side": "SOUTH" } })),
          ...members.map((m, i) => ({ id: `pt:${m}`, x: slot(i) + PERSON_WIDTH / 2, y: 0, width: 1, height: 1, layoutOptions: { "elk.port.side": "NORTH" } })),
        ],
      };
    });
  const elkNodes = elkNodesOf();
  const elkEdges: ElkExtendedEdge[] = [];
  const tied: [string, string][] = []; // parent block, child block
  for (const child of children) {
    const parents = primaryParents.get(child)!;
    if (blockOf.get(parents[0]) === blockOf.get(child)) continue;
    const from = parents.length === 2 && couples.has(unionId(parents[0], parents[1])) ? `pb:${unionId(parents[0], parents[1])}` : `pb:${parents[0]}`;
    elkEdges.push({ id: `be:${child}`, sources: [from], targets: [`pt:${child}`] });
    tied.push([blockOf.get(parents[0])!, blockOf.get(child)!]);
  }
  // Other parents (foster, step, ...) only when nothing else ties them to the child's family, so an unrelated
  // foster couple sits a generation above the child instead of floating off to the side. Relatives who also
  // fostered keep the place their blood links give them (a sibling who is a guardian stays a sibling).
  const component = new Map<string, string>();
  const find = (b: string): string => {
    const up = component.get(b) ?? b;
    if (up === b) return b;
    const root = find(up);
    component.set(b, root);
    return root;
  };
  for (const [a, b] of tied) component.set(find(a), find(b));
  for (const x of extra) {
    if (find(blockOf.get(x.parents[0])!) === find(blockOf.get(x.child)!)) continue;
    const from = x.parents.length === 2 && couples.has(unionId(x.parents[0], x.parents[1])) ? `pb:${unionId(x.parents[0], x.parents[1])}` : `pb:${x.parents[0]}`;
    elkEdges.push({ id: `bx:${x.kind}:${x.child}`, sources: [from], targets: [`pt:${x.child}`] });
  }

  const layoutOptions = {
    "elk.algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.layered.spacing.nodeNodeBetweenLayers": "84",
    "elk.spacing.nodeNode": "36",
    "elk.spacing.componentComponent": "84",
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.layered.crossingMinimization.forceNodeModelOrder": "false",
    "elk.edgeRouting": "ORTHOGONAL",
  };
  // How far children stand from their parents' dot (or parent), summed: the measure that keeps a reordered layout
  // from scattering families.
  const spread = (laid: ElkNode) => {
    const x = new Map((laid.children ?? []).map((b) => [b.id, b.x ?? 0]));
    let total = 0;
    for (const child of children) {
      const parents = primaryParents.get(child)!;
      const cb = blockOf.get(child)!;
      const pb = blockOf.get(parents[0])!;
      if (cb === pb || !x.has(cb) || !x.has(pb)) continue;
      const uid = parents.length === 2 ? unionId(parents[0], parents[1]) : "";
      const from = uid && dotOf.has(uid) ? x.get(pb)! + dotOf.get(uid)!.dx : x.get(pb)! + slot(blocks.get(pb)!.indexOf(parents[0])) + PERSON_WIDTH / 2;
      total += Math.abs(x.get(cb)! + slot(blocks.get(cb)!.indexOf(child)) + PERSON_WIDTH / 2 - from);
    }
    return total;
  };
  // ELK fills in the graph it is given, so each run gets its own copy.
  const run = (nodes: ElkNode[], options: Record<string, string>) =>
    elk.layout({ id: "root", layoutOptions: options, children: structuredClone(nodes), edges: structuredClone(elkEdges) });
  let result = await run(elkNodes, layoutOptions);

  // Siblings out of birth order: when they stand together (no other family's block between them), put them back
  // in order in the places they took, keep every other block where ELK put it, and lay out again with that order
  // forced. Siblings split up by another family are left where ELK put them: moving one across that family pulls
  // whole generations apart.
  const siblingBlocks = new Map<string, string[]>(); // parents -> their children's blocks, in birth order
  for (const child of children) {
    const parents = primaryParents.get(child)!;
    const block = blockOf.get(child)!;
    if (block === blockOf.get(parents[0])) continue;
    const key = parents.join("+");
    const list = siblingBlocks.get(key) ?? [];
    if (!list.includes(block)) list.push(block);
    siblingBlocks.set(key, list);
  }
  const rows = new Map<number, ElkNode[]>();
  for (const b of result.children ?? []) {
    const y = Math.round(b.y ?? 0);
    rows.set(y, [...(rows.get(y) ?? []), b]);
  }
  const rowOrder = [...rows].sort(([a], [b]) => a - b).map(([, r]) => r.sort((a, b) => (a.x ?? 0) - (b.x ?? 0)).map((b) => b.id));
  // Blocks with children of their own on the canvas: moving one moves a whole family below it.
  const hasFamily = new Set(children.map((c) => blockOf.get(primaryParents.get(c)![0])!));
  // The rows with siblings put in birth order where they stand together; `leavesOnly` limits it to siblings
  // without children on the canvas, which can always move. Null when nothing changes.
  const reordered = (leavesOnly: boolean) => {
    const out = rowOrder.map((r) => [...r]);
    let moved = false;
    for (const wanted of siblingBlocks.values()) {
      if (wanted.length < 2) continue;
      for (const row of out) {
        const slots = row.flatMap((id, i) => (wanted.includes(id) ? [i] : []));
        if (slots.length < 2) continue;
        if (slots[slots.length - 1] - slots[0] !== slots.length - 1) continue; // split up by another family
        const inOrder = wanted.filter((id) => row.includes(id));
        if (leavesOnly && inOrder.some((id) => hasFamily.has(id))) continue;
        if (slots.every((slot, i) => row[slot] === inOrder[i])) continue;
        slots.forEach((slot, i) => (row[slot] = inOrder[i]));
        moved = true;
      }
    }
    return moved ? out : null;
  };
  // Families who married into each other can make birth order and a compact tree pull against each other (the
  // eldest's in-laws stand at the far end). Birth order wins only while families stay as close to their parents
  // as in ELK's own layout; otherwise only the childless siblings are put in order, else ELK's layout stays.
  const forcedOptions = {
    ...layoutOptions,
    "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
    // The greedy switch pass swaps neighbours to save crossings even with a forced order; off here.
    "elk.layered.crossingMinimization.greedySwitch.type": "OFF",
  };
  const inRowOrder = (rowsWanted: string[][], nodes: ElkNode[]) => {
    const rank = new Map(rowsWanted.flat().map((id, i) => [id, i]));
    return [...nodes].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  };
  // Strict: rows rebuilt from the top (see strictRows), couples turned to face their own families, and ELK
  // places the blocks with that order kept, however long the lines get.
  const strict = opts.order === "strict";
  if (strict) {
    const rowsWanted = strictRows(rowOrder, { blocks, blockOf, primaryParents, families, orderOf, personOf });
    placeDots();
    result = await run(inRowOrder(rowsWanted, elkNodesOf()), forcedOptions);
  }
  const base = spread(result);
  const tried = new Set<string>();
  for (const leavesOnly of strict ? [] : [false, true]) {
    const rowsWanted = reordered(leavesOnly);
    if (!rowsWanted || tried.has(JSON.stringify(rowsWanted))) continue;
    tried.add(JSON.stringify(rowsWanted));
    const forced = await run(inRowOrder(rowsWanted, elkNodes), forcedOptions);
    if (spread(forced) <= base * 1.1 + PERSON_WIDTH) {
      result = forced;
      break;
    }
  }

  // People inside their block, in chain order.
  const pos = new Map<string, { x: number; y: number }>();
  for (const b of result.children ?? []) {
    blocks.get(b.id)!.forEach((id, i) => pos.set(id, { x: (b.x ?? 0) + i * (PERSON_WIDTH + PARTNER_GAP), y: b.y ?? 0 }));
  }
  const nodes: FlowNode[] = people.map((person) => ({
    id: person._id,
    type: "person",
    position: pos.get(person._id) ?? { x: 0, y: 0 },
    data: {
      person,
      focused: person._id === opts.focusId,
      isSelf: person._id === opts.selfId,
      otherParents: otherParents.get(person._id),
    },
    width: PERSON_WIDTH,
    height: PERSON_HEIGHT,
  }));

  // A dot under each couple, between the two partners.
  const edges: Edge[] = [];
  const edge = (id: string, source: string, target: string, className: string): Edge => ({
    id,
    source,
    target,
    type: "smoothstep",
    selectable: false,
    focusable: false,
    className,
  });
  const unionAt = new Map<string, { x: number; y: number }>();
  for (const uid of couples) {
    const [, a, b] = uid.split(":");
    const pa = pos.get(a);
    const pb = pos.get(b);
    if (!pa || !pb) continue;
    const dot = dotOf.get(uid)!;
    const left = blocks.get(blockOf.get(a)!)![0];
    const at = { x: pos.get(left)!.x + dot.dx - UNION_SIZE / 2, y: pa.y + PERSON_HEIGHT + dot.drop };
    unionAt.set(uid, at);
    nodes.push({
      id: uid,
      type: "union",
      position: at,
      data: { status: unionStatus.get(uid) },
      width: UNION_SIZE,
      height: UNION_SIZE,
      selectable: false,
      focusable: false,
    });
    const cls = `partner-edge partner-${unionStatus.get(uid) ?? "married"}`;
    edges.push(edge(`e:${a}:${uid}`, a, uid, cls), edge(`e:${b}:${uid}`, b, uid, cls));
  }

  // Children from their parents' dot (or the one parent).
  for (const child of children) {
    const parents = primaryParents.get(child)!;
    if (parents.length === 2 && unionAt.has(unionId(parents[0], parents[1]))) {
      const uid = unionId(parents[0], parents[1]);
      edges.push(edge(`e:${uid}:${child}`, uid, child, "child-edge"));
    } else {
      for (const p of parents) edges.push(edge(`e:${p}:${child}`, p, child, "child-edge"));
    }
  }

  // Other parents: dashed (the child's card says "asuh", "tiri", ...); step links hidden until in focus.
  for (const x of extra) {
    const uid = x.parents.length === 2 ? unionId(x.parents[0], x.parents[1]) : "";
    const sources = uid && unionAt.has(uid) ? [uid] : x.parents;
    for (const source of sources) {
      edges.push({
        ...edge(`x:${x.kind}:${source}:${x.child}`, source, x.child, `child-edge link-edge link-${x.kind}`),
        hidden: x.kind === "step",
        data: { people: [...x.parents, x.child], kind: x.kind } satisfies LinkEdgeData,
      });
    }
  }
  return { nodes, edges };
}
