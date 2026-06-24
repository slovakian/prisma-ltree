import { useMemo, useState } from "react";
import { Eraser, Sprout } from "lucide-react";
import type { TaxonRow } from "../../server/taxonomy";
import { graftTaxon, pruneUserTaxa } from "../../server/taxonomy.functions";
import { validateTaxonLabel } from "~/lib/taxon-label";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ControlSection, OperatorTag, controlInputClass } from "./primitives";

/**
 * Graft-a-taxon: the viewer's one *mutating* control. Pick any existing taxon as
 * the parent and a new ltree label; the server builds the child path with the
 * extension's `concatText` (`||`) operator and inserts a row. The card previews
 * the exact lowering (`{{self}} || ({{arg0}})::text`) and the resulting path as a
 * dry run before commit, so the mutation's ltree mechanics stay visible.
 *
 * After a successful graft the parent refetches `getTaxa()` (router invalidate),
 * so the new node appears on the canvas attached to its parent. "Prune grafted
 * taxa" removes every visitor-added row (those with an empty `wiki_url`),
 * restoring the seeded tree.
 */

export type GraftControlsProps = {
  allTaxa: TaxonRow[];
  /** Called with the new node's path after a successful insert + refetch. */
  onGrafted: (newPath: string) => void | Promise<void>;
  /** Called after grafted rows are pruned and the canvas refetched. */
  onPruned: () => void | Promise<void>;
};

const RANKS = ["species", "subspecies", "genus", "clade"] as const;

const LOWERING = "{{self}} || ({{arg0}})::text";

export function GraftControls({ allTaxa, onGrafted, onPruned }: GraftControlsProps) {
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [commonName, setCommonName] = useState("");
  const [rank, setRank] = useState<string>("species");
  const [extinct, setExtinct] = useState(false);
  const [pending, setPending] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Live label validation drives both the inline hint and the submit guard.
  const trimmedLabel = label.trim();
  const labelError = trimmedLabel ? validateTaxonLabel(trimmedLabel) : null;
  const previewPath =
    parentPath && trimmedLabel && !labelError ? `${parentPath}.${trimmedLabel}` : null;

  const graftedCount = useMemo(() => allTaxa.filter((t) => t.wikiUrl === "").length, [allTaxa]);

  const ready = parentPath != null && trimmedLabel.length > 0 && !labelError;

  async function graft() {
    if (!ready || !parentPath) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const inserted = await graftTaxon({
        data: {
          parentPath,
          label: trimmedLabel,
          commonName: commonName.trim() || null,
          rank,
          extinct,
        },
      });
      setLabel("");
      setCommonName("");
      setStatus(`Grafted ${inserted.scientificName}.`);
      await onGrafted(inserted.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Graft failed.");
    } finally {
      setPending(false);
    }
  }

  async function prune() {
    setPruning(true);
    setError(null);
    setStatus(null);
    try {
      const removed = await pruneUserTaxa();
      setStatus(removed === 0 ? "No grafted taxa to prune." : `Pruned ${removed} grafted taxa.`);
      await onPruned();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prune failed.");
    } finally {
      setPruning(false);
    }
  }

  return (
    <ControlSection
      title="Graft a taxon"
      hint={
        <>
          Insert a child via ltree’s <code className="font-mono not-italic">||</code> (
          <code className="font-mono not-italic">concatText</code>).
        </>
      }
    >
      <OperatorTag name="concatText" sql="path || $label::ltree" />
      <Select value={parentPath ?? undefined} onValueChange={setParentPath}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="Parent taxon…" />
        </SelectTrigger>
        <SelectContent>
          {allTaxa.map((t) => (
            <SelectItem key={t.path} value={t.path}>
              {t.scientificName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void graft();
        }}
        placeholder="New label, e.g. Homo_longaevus"
        spellCheck={false}
        aria-label="New taxon label"
        aria-invalid={labelError != null}
        className={`${controlInputClass} aria-[invalid=true]:border-destructive`}
      />

      <input
        type="text"
        value={commonName}
        onChange={(e) => setCommonName(e.target.value)}
        placeholder="Common name (optional)"
        aria-label="Common name"
        className={`${controlInputClass} font-sans text-sm`}
      />

      <div className="flex items-center gap-2">
        <Select value={rank} onValueChange={setRank}>
          <SelectTrigger size="sm" className="w-[7.5rem] shrink-0 capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANKS.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={extinct}
            onChange={(e) => setExtinct(e.target.checked)}
            className="size-3.5 accent-[var(--primary)]"
          />
          Extinct
        </label>
      </div>

      {labelError ? <p className="text-xs text-destructive">{labelError}</p> : null}

      {/* Dry-run preview: the exact lowering + the path the insert will build. */}
      <div className="space-y-1 rounded-sm border border-border/60 bg-primary/[0.035] p-2.5">
        <code className="block font-mono text-[0.7rem] text-muted-foreground">{LOWERING}</code>
        <code
          className="block truncate font-mono text-[0.7rem] text-foreground"
          title={previewPath ?? undefined}
        >
          {previewPath ?? "Pick a parent and label to preview the new path."}
        </code>
      </div>

      <Button
        size="sm"
        className="w-full"
        onClick={() => void graft()}
        disabled={!ready || pending}
      >
        <Sprout />
        {pending ? "Grafting…" : "Graft"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => void prune()}
        disabled={pruning || graftedCount === 0}
      >
        <Eraser />
        {pruning
          ? "Pruning…"
          : graftedCount > 0
            ? `Prune grafted taxa (${graftedCount})`
            : "Prune grafted taxa"}
      </Button>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {status && !error ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    </ControlSection>
  );
}
