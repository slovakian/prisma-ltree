import { useState } from "react";
import { ExternalLink, GitMerge } from "lucide-react";
import type { TaxonRow } from "../../server/taxonomy";
import { getLineage, getMrcaViaLca } from "../../server/taxonomy.functions";
import { type HighlightState, mrcaHighlight } from "~/lib/highlight";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ControlSection, OperatorTag, resultBlockClass } from "./primitives";

/**
 * MRCA picker: two taxa → `lca()` most-recent-common-ancestor. On "Find common
 * ancestor" it resolves the MRCA server-side, fetches both leaves' lineages to
 * paint their converging paths, then asks the canvas to recenter on the result.
 * The section surfaces the resolved clade (name + rank + Wiki) and the depth at
 * which the two paths split — the graphical "why" behind the MRCA.
 */

export type MrcaControlsProps = {
  allTaxa: TaxonRow[];
  onApply: (state: HighlightState, focusPath: string) => void;
};

const lastLabel = (path: string) => path.slice(path.lastIndexOf(".") + 1);

export function MrcaControls({ allTaxa, onApply }: MrcaControlsProps) {
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [result, setResult] = useState<TaxonRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = a != null && b != null && a !== b;

  async function findAncestor() {
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      const [mrca, lineageA, lineageB] = await Promise.all([
        getMrcaViaLca({ data: { a, b } }),
        getLineage({ data: a }),
        getLineage({ data: b }),
      ]);
      if (!mrca) {
        setResult(null);
        setError("No common ancestor found.");
        return;
      }
      setResult(mrca);
      onApply(mrcaHighlight(mrca.path, lineageA, lineageB), mrca.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setPending(false);
    }
  }

  const splitDepth = result ? result.path.split(".").length : null;

  return (
    <ControlSection title="Common ancestor" hint="Most-recent-common-ancestor of two taxa.">
      <OperatorTag name="lca" sql="lca($a, $b)" />
      <TaxonSelect value={a} onChange={setA} placeholder="First taxon…" taxa={allTaxa} />
      <TaxonSelect value={b} onChange={setB} placeholder="Second taxon…" taxa={allTaxa} />
      <Button size="sm" className="w-full" onClick={findAncestor} disabled={!ready || pending}>
        <GitMerge />
        {pending ? "Finding…" : "Find common ancestor"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {result ? (
        <div className={`${resultBlockClass} space-y-1`}>
          <div className="flex items-center gap-1.5">
            <span className="font-heading text-[15px] font-medium italic">
              {result.scientificName}
            </span>
            {result.wikiUrl ? (
              <a
                href={result.wikiUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label={`Wikipedia: ${result.scientificName}`}
              >
                <ExternalLink className="size-3" />
              </a>
            ) : null}
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {result.rank}
            </span>
          </div>
          <p className="font-heading text-[13px] leading-snug text-muted-foreground">
            Paths split at depth <span className="font-medium text-foreground">{splitDepth}</span> (
            {lastLabel(result.path)}).
          </p>
        </div>
      ) : null}
    </ControlSection>
  );
}

function TaxonSelect({
  value,
  onChange,
  placeholder,
  taxa,
}: {
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  taxa: TaxonRow[];
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {taxa.map((t) => (
          <SelectItem key={t.path} value={t.path}>
            {t.scientificName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
