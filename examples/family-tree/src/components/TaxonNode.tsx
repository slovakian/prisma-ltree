import { Handle, type NodeProps, Position } from "@xyflow/react";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { NODE_HEIGHT, NODE_WIDTH, type TaxonFlowNode } from "~/lib/nodes";

/**
 * Custom React Flow node for a single taxon, styled as a natural-history plate
 * label (spec §3.3). Tips read as circular portraits with a serif common name +
 * italic mono scientific name; internal clades read as a small rotated-square
 * (diamond) marker with a mono uppercase clade label. The label body sits on a
 * solid `bg-card` surface with a hairline border (no halo) so it stays legible
 * across crossing dendrogram links. Registered via the `nodeTypes` map in
 * `TreeCanvas.tsx`; that mapping must live outside the component per React Flow.
 */

/** Two-letter clade glyph for taxa without a Wikipedia page image. */
function cladeGlyph(scientificName: string): string {
  const cleaned = scientificName.replace(/[^A-Za-z ]/g, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

/** Per-highlight ring + surface tint applied to the node body. */
const HIGHLIGHT_CLASS: Record<NonNullable<TaxonFlowNode["data"]["highlight"]>, string> = {
  selected: "ring-2 ring-primary ring-offset-2 ring-offset-background",
  lineage: "ring-1 ring-[var(--lineage-foreground)] bg-lineage text-lineage-foreground",
  subtree: "ring-1 ring-[var(--subtree-foreground)] bg-subtree text-subtree-foreground",
  mrca: "ring-2 ring-[var(--mrca)] bg-mrca text-mrca-foreground",
  search: "ring-1 ring-[var(--search-foreground)] bg-search text-search-foreground",
};

/** Mono uppercase apparatus kicker (rank label). */
const KICKER = "font-mono text-[0.55rem] uppercase leading-none tracking-[0.18em]";

export function TaxonNode({ data }: NodeProps<TaxonFlowNode>) {
  const { taxon, isLeaf, highlight } = data;
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 rounded-sm border bg-card px-2.5 py-1.5 text-card-foreground",
        "transition-colors hover:border-primary/60",
        taxon.extinct && "border-dashed opacity-90",
        highlight && HIGHLIGHT_CLASS[highlight],
      )}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-canvas-link" />

      {isLeaf ? <TipPortrait taxon={taxon} /> : <CladeMarker highlighted={Boolean(highlight)} />}

      <div className="min-w-0 flex-1">
        {isLeaf ? <TipLabel taxon={taxon} /> : <CladeLabel taxon={taxon} />}
      </div>

      {taxon.wikiUrl ? (
        <a
          href={taxon.wikiUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 self-start text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Wikipedia: ${taxon.scientificName}`}
        >
          <ExternalLink className="size-3" />
        </a>
      ) : null}

      <Handle type="source" position={Position.Right} className="!border-0 !bg-canvas-link" />
    </div>
  );
}

/** Circular portrait for a tip taxon. */
function TipPortrait({ taxon }: { taxon: TaxonFlowNode["data"]["taxon"] }) {
  return (
    <Avatar size="lg" className="shrink-0 ring-1 ring-border ring-offset-1 ring-offset-card">
      {taxon.thumbnailUrl ? (
        <AvatarImage src={taxon.thumbnailUrl} alt={taxon.scientificName} />
      ) : null}
      <AvatarFallback className="font-mono text-[0.7rem] font-medium tracking-tight">
        {cladeGlyph(taxon.scientificName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Tip label: serif common name over an italic mono scientific name. */
function TipLabel({ taxon }: { taxon: TaxonFlowNode["data"]["taxon"] }) {
  const hasCommon = taxon.commonName != null && taxon.commonName.length > 0;
  return (
    <>
      <div className={cn(KICKER, "text-primary/80")}>
        {taxon.rank}
        {taxon.extinct ? " · extinct" : ""}
      </div>
      <div className="truncate font-heading text-sm font-semibold leading-tight">
        {hasCommon ? taxon.commonName : <span className="italic">{taxon.scientificName}</span>}
      </div>
      {hasCommon ? (
        <div className="truncate font-mono text-[0.7rem] italic leading-tight text-muted-foreground">
          {taxon.scientificName}
        </div>
      ) : null}
    </>
  );
}

/** Diamond marker for an internal clade node. */
function CladeMarker({ highlighted }: { highlighted: boolean }) {
  return (
    <span className="flex w-10 shrink-0 justify-center" aria-hidden>
      <span
        className={cn(
          "size-3 rotate-45 border",
          highlighted ? "border-current bg-current" : "border-canvas-axis bg-canvas-divider",
        )}
      />
    </span>
  );
}

/** Clade label: mono uppercase clade name over an italic mono scientific name. */
function CladeLabel({ taxon }: { taxon: TaxonFlowNode["data"]["taxon"] }) {
  const hasCommon = taxon.commonName != null && taxon.commonName.length > 0;
  return (
    <>
      <div className={cn(KICKER, "text-primary/80")}>
        {taxon.rank}
        {taxon.extinct ? " · extinct" : ""}
      </div>
      <div className="truncate font-mono text-[0.78rem] font-medium uppercase leading-tight tracking-[0.12em]">
        {hasCommon ? taxon.commonName : taxon.scientificName}
      </div>
      {hasCommon ? (
        <div className="truncate font-mono text-[0.7rem] italic leading-tight text-muted-foreground">
          {taxon.scientificName}
        </div>
      ) : null}
    </>
  );
}
