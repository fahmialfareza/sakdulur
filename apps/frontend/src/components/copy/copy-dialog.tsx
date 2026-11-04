"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Loader2,
  Network,
  Orbit,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "@/lib/api/client";
import {
  keys,
  useCreateTree,
  useFamilies,
  useGraph,
  useImportBranch,
  useImportPreview,
  useMe,
} from "@/lib/api/hooks";
import type { ImportRequest, ImportResult, ImportScope } from "@/lib/api/types";
import { selectBranch } from "@/lib/branch";
import { lifeSpan } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Other trees where the user is owner or editor: valid sources to copy into `treeId`, or destinations to copy to. */
export function useCopySources(treeId: string) {
  const { data: me } = useMe();
  return (me?.trees ?? []).filter(
    (t) => t._id !== treeId && (t.role === "owner" || t.role === "editor"),
  );
}

export type CopyFromPerson = { treeId: string; personId: string; name: string };
/** Copying out of a tree: the person, family or everyone to send is picked in the dialog. */
export type CopyFromTree = { treeId: string; name: string; familyId?: string };

const SCOPES: { value: ImportScope; icon: typeof ArrowDown }[] = [
  { value: "descendants", icon: ArrowDown },
  { value: "ancestors", icon: ArrowUp },
  { value: "both", icon: ArrowUpDown },
  { value: "nearby", icon: Orbit },
  { value: "all", icon: Network },
];

// The destination choice that creates a tree first.
const NEW_TREE = "new";
// The API's maxImportPeople.
const MAX_PEOPLE = 1000;

/**
 * Copy people between trees, in either direction:
 * - into `treeId`: pick another tree, a person or family to start from (or the whole tree) and how far to go;
 * - from `fromPerson`: their branch goes to another tree the user picks;
 * - from `fromTree`: a person's branch, a family or the whole tree goes to another tree.
 * Copies out can also go to a new tree, created when the copy starts. The preview shows who is new; only
 * names, dates and places travel, and copies stay linked to their originals so they can be updated later.
 */
export function CopyDialog({
  treeId,
  fromPerson,
  fromTree,
  open,
  onOpenChange,
  onCopied,
}: {
  treeId?: string;
  fromPerson?: CopyFromPerson;
  fromTree?: CopyFromTree;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopied?: (rootId: string, destTreeId: string) => void;
}) {
  const t = useTranslations("copy");
  const tc = useTranslations("common");
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const outward = !!fromPerson || !!fromTree;
  const outSource = fromPerson?.treeId ?? fromTree?.treeId ?? "";
  const others = useCopySources(outward ? outSource : (treeId ?? ""));
  const sources = outward ? [] : others;
  const [destChoice, setDestChoice] = useState("");
  const dest = outward
    ? destChoice || others[0]?._id || NEW_TREE
    : (treeId ?? "");
  const newTree = outward && dest === NEW_TREE;
  const [newName, setNewName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const source = outward ? outSource : sourceId || sources[0]?._id || "";
  const sourceName =
    fromTree?.name ?? me?.trees?.find((x) => x._id === source)?.name ?? "";
  const [pickMode, setPickMode] = useState<"person" | "family">(
    fromTree?.familyId ? "family" : "person",
  );
  const [pickedId, setPersonId] = useState("");
  const [familyId, setFamilyId] = useState(fromTree?.familyId ?? "");
  const [scope, setScope] = useState<ImportScope>(
    fromTree && !fromTree.familyId ? "all" : "descendants",
  );
  const [steps, setSteps] = useState("2");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const { data: graph, isLoading: loadingGraph } = useGraph(source);
  const { data: families } = useFamilies(fromPerson ? "" : source);
  const candidates = useMemo(
    () =>
      (graph?.people ?? [])
        .filter((p) => p.canEdit)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [graph],
  );
  // Families whose head the user may copy.
  const familyChoices = useMemo(
    () =>
      (families ?? []).filter(
        (f) => f.person && candidates.some((p) => p._id === f.person?._id),
      ),
    [families, candidates],
  );
  const family = familyChoices.find((f) => f._id === familyId);
  const personId = fromPerson
    ? fromPerson.personId
    : pickMode === "family"
      ? (family?.person?._id ?? "")
      : pickedId;
  const startName = fromPerson
    ? fromPerson.name
    : pickMode === "family"
      ? family?.name
      : candidates.find((p) => p._id === personId)?.name;
  const request = useMemo(
    (): ImportRequest | null =>
      source && dest && (scope === "all" || personId)
        ? {
            sourceTreeId: source,
            personId: scope === "all" ? undefined : personId,
            scope,
            steps: scope === "nearby" ? Number(steps) : undefined,
            updateExisting,
          }
        : null,
    [source, dest, scope, personId, steps, updateExisting],
  );
  const preview = useImportPreview(
    newTree ? "" : dest,
    newTree ? null : request,
  );
  // A new tree has nobody yet: everyone in scope the user may copy is new.
  const localPreview = useMemo((): ImportResult | null => {
    if (!newTree || !request || !graph) return null;
    const ids = selectBranch(
      graph,
      request.personId ?? "",
      request.scope,
      request.steps,
    );
    const people = graph.people.filter((p) => ids.has(p._id) && p.canEdit);
    return {
      people: people.map((p) => ({
        _id: p._id,
        name: p.name,
        birthDate: p.birthDate,
        deathDate: p.deathDate,
        alreadyInTree: false,
      })),
      created: people.length,
      reused: 0,
      updated: 0,
      links: 0,
      dryRun: true,
      skipped: ids.size - people.length,
      selected: ids.size,
    };
  }, [newTree, request, graph]);
  const previewData = newTree ? localPreview : preview.data;
  const tooMany = (previewData?.selected ?? 0) > MAX_PEOPLE;
  const previewFetching = !newTree && preview.isFetching;
  const copy = useImportBranch(newTree ? "" : dest);
  const defaultName = t("newTreeDefault", {
    name: (scope === "all" ? sourceName : startName) || sourceName,
  });
  const destName = newTree
    ? newName.trim() || defaultName
    : (others.find((x) => x._id === dest)?.name ?? "");
  const createTree = useCreateTree();

  /** Makes the new tree and copies into it; a failed copy removes the empty tree again. */
  async function copyToNewTree(body: ImportRequest) {
    const tree = await createTree.mutateAsync(destName);
    try {
      const res = await api.post<ImportResult>(
        `/api/trees/${encodeURIComponent(tree._id)}/import`,
        { ...body, dryRun: false },
      );
      return { res, destId: tree._id };
    } catch (err) {
      await api
        .delete(`/api/trees/${encodeURIComponent(tree._id)}`)
        .catch(() => undefined);
      void qc.invalidateQueries({ queryKey: keys.me });
      throw err;
    }
  }

  async function submit() {
    if (!request) return;
    setBusy(true);
    try {
      const { res, destId } = newTree
        ? await copyToNewTree(request)
        : { res: await copy.mutateAsync(request), destId: dest };
      onOpenChange(false);
      if (outward) {
        toast.success(
          t("doneTo", {
            created: res.created,
            updated: res.updated,
            tree: destName,
          }),
          {
            action: {
              label: t("openTree"),
              onClick: () =>
                router.push(
                  `/app/t/${destId}${res.rootId ? `?focus=${res.rootId}` : ""}`,
                ),
            },
          },
        );
      } else {
        toast.success(
          t("done", { created: res.created, updated: res.updated }),
        );
      }
      if (res.rootId) onCopied?.(res.rootId, destId);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {fromPerson
              ? t("titleTo", { name: fromPerson.name })
              : fromTree
                ? t("titleFromTree", { name: fromTree.name })
                : t("title")}
          </DialogTitle>
          <DialogDescription>
            {fromPerson
              ? t("descriptionTo")
              : fromTree
                ? t("descriptionFromTree")
                : t("description")}
          </DialogDescription>
        </DialogHeader>

        {!outward && others.length === 0 ? (
          <p className="rounded-lg bg-secondary px-4 py-3 text-sm">
            {t("noSources")}
          </p>
        ) : (
          <div className="space-y-5">
            {outward ? (
              <div className="space-y-1.5">
                <Label>{t("toTree")}</Label>
                <Select value={dest} onValueChange={setDestChoice}>
                  <SelectTrigger className="w-full" aria-label={t("toTree")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_TREE}>{t("newTree")}</SelectItem>
                  </SelectContent>
                </Select>
                {newTree ? (
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={defaultName}
                    maxLength={120}
                    aria-label={t("newTreeName")}
                  />
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{t("fromTree")}</Label>
                <Select
                  value={source}
                  onValueChange={(v) => {
                    setSourceId(v);
                    setPersonId("");
                    setFamilyId("");
                  }}
                >
                  <SelectTrigger className="w-full" aria-label={t("fromTree")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {fromPerson || scope === "all" ? null : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("startFrom")}</Label>
                  <Tabs
                    value={pickMode}
                    onValueChange={(v) => setPickMode(v as "person" | "family")}
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="person" className="text-xs">
                        {t("startPerson")}
                      </TabsTrigger>
                      <TabsTrigger value="family" className="text-xs">
                        {t("startFamily")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Command
                  key={pickMode}
                  className="rounded-lg border"
                  shouldFilter
                >
                  <CommandInput
                    placeholder={
                      pickMode === "family"
                        ? t("searchFamily")
                        : t("searchPerson")
                    }
                  />
                  <CommandList className="max-h-48">
                    {loadingGraph ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      </div>
                    ) : (
                      <CommandEmpty>
                        {pickMode === "family"
                          ? t("noFamilies")
                          : t("noPeople")}
                      </CommandEmpty>
                    )}
                    <CommandGroup>
                      {pickMode === "family"
                        ? familyChoices.map((f) => (
                            <CommandItem
                              key={f._id}
                              value={`${f.name} ${f.person?.name ?? ""} ${f._id}`}
                              onSelect={() => {
                                setFamilyId(f._id);
                                setScope("descendants");
                              }}
                            >
                              <PersonAvatar
                                name={f.person?.name ?? f.name}
                                photoUrl={f.person?.photoUrl}
                                gender={f.person?.gender}
                                className="size-7 ring-1 ring-offset-1"
                              />
                              <span className="flex-1 truncate">{f.name}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {f.person?.name}
                              </span>
                              {f._id === familyId ? (
                                <Check
                                  className="size-4 text-primary"
                                  aria-hidden
                                />
                              ) : null}
                            </CommandItem>
                          ))
                        : candidates.map((p) => (
                            <CommandItem
                              key={p._id}
                              value={`${p.name} ${p.nickname ?? ""} ${p._id}`}
                              onSelect={() => setPersonId(p._id)}
                            >
                              <PersonAvatar
                                name={p.name}
                                photoUrl={p.photoUrl}
                                gender={p.gender}
                                className="size-7 ring-1 ring-offset-1"
                              />
                              <span className="flex-1 truncate">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {lifeSpan(p.birthDate, p.deathDate)}
                              </span>
                              {p._id === pickedId ? (
                                <Check
                                  className="size-4 text-primary"
                                  aria-hidden
                                />
                              ) : null}
                            </CommandItem>
                          ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {graph && candidates.length < graph.people.length ? (
                  <p className="text-xs text-muted-foreground">
                    {t("branchOnly")}
                  </p>
                ) : null}
              </div>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {scope !== "all" && (fromPerson || pickMode === "person")
                  ? t("howFar", { name: startName ?? t("thisPerson") })
                  : t("howMuch")}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {SCOPES.filter(
                  ({ value }) => value !== "all" || !fromPerson,
                ).map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={scope === value}
                    onClick={() => setScope(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left text-sm",
                      scope === value && "border-primary bg-secondary",
                    )}
                  >
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>
                      <span className="block font-medium">
                        {t(`scopes.${value}.title`)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`scopes.${value}.body`)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {scope === "nearby" ? (
                <Select value={steps} onValueChange={setSteps}>
                  <SelectTrigger className="w-40" aria-label={t("steps")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t("stepsN", { n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </fieldset>

            {newTree ? null : (
              <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
                <span>
                  <span
                    id="update-existing"
                    className="block text-sm font-medium"
                  >
                    {t("updateExisting")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("updateExistingHelp")}
                  </span>
                </span>
                <Switch
                  aria-labelledby="update-existing"
                  checked={updateExisting}
                  onCheckedChange={setUpdateExisting}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">{t("whatTravels")}</p>

            {request ? (
              <section
                aria-live="polite"
                className="space-y-2 rounded-xl bg-secondary/60 p-3"
              >
                {previewFetching ? (
                  <p className="flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" aria-hidden />{" "}
                    {t("previewing")}
                  </p>
                ) : tooMany ? (
                  <p className="text-sm text-destructive">
                    {t("tooMany", { max: MAX_PEOPLE })}
                  </p>
                ) : !newTree && preview.error ? (
                  <p className="text-sm text-destructive">
                    {errorMessage(preview.error)}
                  </p>
                ) : previewData ? (
                  <>
                    <p className="text-sm font-medium">
                      {t("previewSummary", {
                        created: previewData.created,
                        reused: previewData.reused,
                      })}
                      {previewData.skipped
                        ? ` ${t("previewSkipped", { skipped: previewData.skipped })}`
                        : ""}
                    </p>
                    <div className="max-h-40 overflow-y-auto overscroll-contain">
                      <ul className="flex flex-wrap gap-1.5">
                        {(previewData.people ?? []).map((p) => (
                          <li key={p._id}>
                            <Badge
                              variant={
                                p.alreadyInTree ? "outline" : "secondary"
                              }
                            >
                              {p.name}
                              {p.alreadyInTree ? ` · ${t("alreadyHere")}` : ""}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={
              !request ||
              busy ||
              previewFetching ||
              tooMany ||
              !previewData ||
              previewData.created + previewData.reused === 0
            }
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t("copy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
