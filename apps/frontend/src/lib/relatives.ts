import type { Graph, GraphPerson, GraphUnion, ParentKind } from "@/lib/api/types";

/** How two siblings are related: kandung, seayah/seibu (half), tiri, angkat, asuh (foster or guardian), susuan. */
export type SiblingKind = "full" | "half" | "step" | "adopted" | "foster" | "milk";

/** `order` (children only): the position set by hand on the link ("anak ke-"), when there is one. */
export type ParentLink = { person: GraphPerson; kind: ParentKind; order?: number; twin?: boolean };
export type PartnerLink = { person: GraphPerson; union: GraphUnion; widowed: boolean };
/** `twin`: kembar, a full sibling born the same day (of this person or of another sibling). */
export type SiblingLink = { person: GraphPerson; kind: SiblingKind; twin?: boolean };

export type Relatives = {
  parents: GraphPerson[];
  partners: GraphPerson[];
  children: GraphPerson[];
  siblings: GraphPerson[];
  /** The same people with the kind of each link. */
  parentLinks: ParentLink[];
  partnerLinks: PartnerLink[];
  childLinks: ParentLink[];
  siblingLinks: SiblingLink[];
  /** "Anak ke-{index} dari {total}": place among the birth children of the person's first birth parent. */
  birthPosition?: { index: number; total: number };
  /** Some children's order is a guess: they have no position set by hand and tie on (or lack) a birth date. */
  childrenUncertain: boolean;
};

const SIBLING_ORDER: SiblingKind[] = ["full", "half", "step", "adopted", "foster", "milk"];

/** A child with the position set by hand on their link ("anak ke-"), when there is one. */
export type OrderedChild = { order?: number; person: GraphPerson };

/**
 * Compares two birth dates only as precisely as both are known: "1990" and "1990-05-03" tie, since either could
 * be first. Undefined when either date is unknown.
 */
export function compareBirthDates(a: GraphPerson, b: GraphPerson): number | undefined {
  if (!a.birthDate || !b.birthDate) return undefined;
  const parts = (p: GraphPerson) => {
    const [y, m, d] = p.birthDate!.slice(0, 10).split("-");
    const precision = p.birthDatePrecision ?? "day";
    return [y, precision === "year" ? undefined : m, precision === "day" ? d : undefined];
  };
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] === undefined || pb[i] === undefined) return 0;
    if (pa[i] !== pb[i]) return pa[i]! < pb[i]! ? -1 : 1;
  }
  return 0;
}

/** Twins (kembar): the same birth day, known to the day. */
export const sameBirthDay = (a: GraphPerson, b: GraphPerson) =>
  !!a.birthDate &&
  (a.birthDatePrecision ?? "day") === "day" &&
  (b.birthDatePrecision ?? "day") === "day" &&
  a.birthDate.slice(0, 10) === b.birthDate?.slice(0, 10);

const byName = (a: OrderedChild, b: OrderedChild) =>
  a.person.name.localeCompare(b.person.name) || (a.person._id < b.person._id ? -1 : a.person._id > b.person._id ? 1 : 0);
const hasOrder = (c: OrderedChild) => !!c.order && c.order > 0;

/**
 * A parent's children, left to right ("anak ke-" order):
 * 1. Children with a position set by hand keep it.
 * 2. The others go in by birth date, just before the first numbered sibling born later, so a child added after
 *    the order was set still lands in their place; without a known birth date they go last.
 * 3. Birth dates are compared as precisely as both are known (see compareBirthDates); a tie (twins, or a year
 *    against a full date) falls back to the name.
 * `uncertain` is set when two siblings without a set position tie or have no birth date: their order is a guess.
 */
export function sortChildren<T extends OrderedChild>(children: T[]): { sorted: T[]; uncertain: boolean } {
  // By date, then name. Insertion sort so a precision tie keeps the name order (the comparison isn't transitive
  // across precisions: "1990" ties both "1990-01" and "1990-12").
  const byDate = (list: T[]) => {
    const out: T[] = [];
    for (const c of [...list].sort(byName)) {
      let at = out.length;
      while (at > 0 && (compareBirthDates(out[at - 1].person, c.person) ?? 0) > 0) at--;
      out.splice(at, 0, c);
    }
    return out;
  };
  const numbered = [...children.filter(hasOrder)].sort((a, b) => a.order! - b.order! || byName(a, b));
  const free = children.filter((c) => !hasOrder(c));
  const dated = byDate(free.filter((c) => c.person.birthDate));
  const undated = free.filter((c) => !c.person.birthDate).sort(byName);

  const sorted: T[] = [...numbered];
  for (const c of dated) {
    const later = sorted.findIndex((n) => hasOrder(n) && (compareBirthDates(n.person, c.person) ?? 0) > 0);
    sorted.splice(later < 0 ? sorted.length : later, 0, c);
  }
  sorted.push(...undated);

  const tie = (a: T, b: T) => !hasOrder(a) && !hasOrder(b) && (compareBirthDates(a.person, b.person) ?? 0) === 0;
  const uncertain = sorted.some((c, i) => i > 0 && tie(sorted[i - 1], c));
  return { sorted, uncertain };
}

const empty = (): Relatives => ({
  parents: [],
  partners: [],
  children: [],
  siblings: [],
  parentLinks: [],
  partnerLinks: [],
  childLinks: [],
  siblingLinks: [],
  childrenUncertain: false,
});

/** Immediate family of a person, derived from the tree graph, with birth and other parents told apart. */
export function relativesOf(graph: Graph | undefined, id: string): Relatives {
  if (!graph) return empty();
  const byId = new Map(graph.people.map((p) => [p._id, p]));
  const kindOf = (k?: ParentKind): ParentKind => k ?? "birth";

  const parentsOf = (x: string) => graph.parentChild.filter((pc) => pc.child === x);
  const childrenOf = (x: string) => graph.parentChild.filter((pc) => pc.parent === x);
  const partnersOf = (x: string) => graph.unions.filter((u) => u.partners.includes(x));
  const birthParents = (x: string) => new Set(parentsOf(x).filter((pc) => kindOf(pc.kind) === "birth").map((pc) => pc.parent));

  // Adds the person (when they are in the graph) to a list, once.
  const link = <T extends { person: GraphPerson }>(list: T[], personId: string, make: (p: GraphPerson) => T) => {
    const p = byId.get(personId);
    if (p && !list.some((l) => l.person._id === personId)) list.push(make(p));
  };

  const parentLinks: ParentLink[] = [];
  for (const pc of parentsOf(id)) link(parentLinks, pc.parent, (person) => ({ person, kind: kindOf(pc.kind) }));
  // A parent's children with the order on each link, sorted (see sortChildren).
  const orderedChildren = (x: string, onlyBirth = false) =>
    sortChildren(
      childrenOf(x)
        .filter((pc) => !onlyBirth || kindOf(pc.kind) === "birth")
        .flatMap((pc) => {
          const person = byId.get(pc.child);
          return person ? [{ pc, person, order: pc.order }] : [];
        }),
    );
  const sameBirthParents = (a: string, b: string) => {
    const pa = birthParents(a);
    const pb = birthParents(b);
    return pa.size > 0 && pa.size === pb.size && [...pa].every((p) => pb.has(p));
  };
  const mine = orderedChildren(id);
  const childLinks: ParentLink[] = [];
  for (const { pc } of mine.sorted) {
    link(childLinks, pc.child, (person) => ({
      person,
      kind: kindOf(pc.kind),
      order: pc.order,
      twin: mine.sorted.some((o) => o.person._id !== person._id && sameBirthDay(o.person, person) && sameBirthParents(o.person._id, person._id)),
    }));
  }
  const partnerLinks: PartnerLink[] = [];
  for (const u of partnersOf(id)) {
    const other = u.partners[0] === id ? u.partners[1] : u.partners[0];
    // Widowed (cerai mati): still married when the partner died.
    link(partnerLinks, other, (person) => ({ person, union: u, widowed: !u.status && person.status === "deceased" }));
  }

  // Siblings: anyone sharing a parent, or a child of a parent's partner (step), classified by the closest bond.
  const myBirth = birthParents(id);
  const myParents = parentLinks.map((l) => l.person._id);
  const candidates = new Set<string>();
  for (const p of myParents) for (const pc of childrenOf(p)) candidates.add(pc.child);
  for (const p of myBirth) for (const u of partnersOf(p)) for (const q of u.partners) for (const pc of childrenOf(q)) candidates.add(pc.child);
  candidates.delete(id);

  const siblingLinks: SiblingLink[] = [];
  for (const other of candidates) {
    const theirBirth = birthParents(other);
    const sharedBirth = [...myBirth].filter((p) => theirBirth.has(p)).length;
    let kind: SiblingKind | undefined;
    if (sharedBirth > 0) {
      // Full when they share both birth parents, or the only one either of them has recorded.
      kind = sharedBirth >= 2 || (myBirth.size <= 1 && theirBirth.size <= 1) ? "full" : "half";
    } else {
      const shared = parentsOf(other).filter((pc) => myParents.includes(pc.parent));
      const sharedKinds = new Set([
        ...shared.map((pc) => kindOf(pc.kind)),
        ...parentLinks.filter((l) => shared.some((pc) => pc.parent === l.person._id)).map((l) => l.kind),
      ]);
      if (sharedKinds.has("adopted")) kind = "adopted";
      else if (sharedKinds.has("foster") || sharedKinds.has("guardian")) kind = "foster";
      else if (sharedKinds.has("milk")) kind = "milk";
      else kind = "step"; // shares only a step-parent, or is the child of a birth parent's partner
    }
    link(siblingLinks, other, (person) => ({ person, kind: kind! }));
  }
  // The first birth parent (father first, as on the canvas) decides birth order among siblings.
  const firstParent = [...myBirth].sort((a, b) => Number(byId.get(b)?.gender === "male") - Number(byId.get(a)?.gender === "male") || (a < b ? -1 : 1))[0] ?? myParents[0];
  const orderVia = (child: string) => (firstParent ? childrenOf(firstParent).find((pc) => pc.child === child)?.order : undefined);
  const sortedSiblings = SIBLING_ORDER.flatMap(
    (kind) => sortChildren(siblingLinks.filter((l) => l.kind === kind).map((l) => ({ link: l, person: l.person, order: orderVia(l.person._id) }))).sorted,
  ).map((s) => s.link);
  siblingLinks.splice(0, siblingLinks.length, ...sortedSiblings);
  const self = byId.get(id);
  const fullFamily = [...(self ? [self] : []), ...siblingLinks.filter((l) => l.kind === "full").map((l) => l.person)];
  for (const l of siblingLinks) {
    if (l.kind === "full") l.twin = fullFamily.some((o) => o._id !== l.person._id && sameBirthDay(o, l.person));
  }

  let birthPosition: Relatives["birthPosition"];
  if (firstParent && myBirth.has(firstParent)) {
    const born = orderedChildren(firstParent, true).sorted;
    const index = born.findIndex((c) => c.person._id === id);
    if (index >= 0) birthPosition = { index: index + 1, total: born.length };
  }

  return {
    parents: parentLinks.map((l) => l.person),
    partners: partnerLinks.map((l) => l.person),
    children: childLinks.map((l) => l.person),
    siblings: siblingLinks.map((l) => l.person),
    parentLinks,
    partnerLinks,
    childLinks,
    siblingLinks,
    birthPosition,
    childrenUncertain: mine.uncertain,
  };
}
