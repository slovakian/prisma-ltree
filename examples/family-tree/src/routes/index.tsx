import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type CanvasHandle, TreeCanvas } from "~/components/TreeCanvas";
import { SidePanel } from "~/components/SidePanel";
import { LineageControls } from "~/components/Controls/LineageControls";
import { MrcaControls } from "~/components/Controls/MrcaControls";
import { SearchControls } from "~/components/Controls/SearchControls";
import { SliceControls } from "~/components/Controls/SliceControls";
import { GraftControls } from "~/components/Controls/GraftControls";
import { OperatorLegend } from "~/components/Controls/OperatorLegend";
import {
  EMPTY_HIGHLIGHT,
  type HighlightState,
  isActive,
  matchHighlight,
  selectionHighlight,
} from "~/lib/highlight";
import { type TaxonRow, getLineage, getSubtree, getTaxa } from "~/server/taxonomy";

/**
 * Root view: Tree-of-Life interactive viewer.
 *
 * The loader streams every taxon (path asc) from `getTaxa` — a real ltree query,
 * no client-side tree assembly. `<TreeCanvas>` lays the paths out as a
 * horizontal dendrogram with React Flow. Phase 4 wires interactivity: clicking a
 * node fetches its lineage (`@>`) and subtree (`<@`) in parallel, paints the
 * highlight, and opens the `SidePanel` operator stack; the aside hosts the
 * highlight legend/reset (`LineageControls`) and the `lca()` MRCA picker
 * (`MrcaControls`). Search/graft controls land in Phases 5–6.
 */
export const Route = createFileRoute("/")({
  loader: () => getTaxa(),
  component: Home,
});

type Selection = { taxon: TaxonRow; lineage: TaxonRow[]; subtree: TaxonRow[] };

/** Operators a node-click highlight exercises, marked active in the legend. */
const SELECTION_OPS = ["isAncestorOf", "isDescendantOf"];

function Home() {
  const taxa = Route.useLoaderData();
  const router = useRouter();

  const [highlight, setHighlight] = useState<HighlightState>(EMPTY_HIGHLIGHT);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [activeOps, setActiveOps] = useState<ReadonlySet<string>>(new Set());
  const canvasRef = useRef<CanvasHandle | null>(null);
  // After a graft, the new node only exists once the refetched taxa render; defer
  // the recenter to the effect below so the canvas has rebuilt around it.
  const pendingFocus = useRef<string | null>(null);

  const onReady = useCallback((handle: CanvasHandle) => {
    canvasRef.current = handle;
  }, []);
  const recenter = useCallback((path: string) => canvasRef.current?.focusNode(path), []);

  // Once the (possibly refetched) taxa include the pending node, the child canvas
  // has rebuilt and re-registered `focusNode`, so centering on it now resolves.
  useEffect(() => {
    const path = pendingFocus.current;
    if (path && taxa.some((t) => t.path === path)) {
      canvasRef.current?.focusNode(path);
      pendingFocus.current = null;
    }
  }, [taxa]);

  const selectTaxon = useCallback(async (taxon: TaxonRow) => {
    const [lineage, subtree] = await Promise.all([
      getLineage({ data: taxon.path }),
      getSubtree({ data: taxon.path }),
    ]);
    setSelection({ taxon, lineage, subtree });
    setHighlight(selectionHighlight(taxon.path, lineage, subtree));
    setActiveOps(new Set(SELECTION_OPS));
  }, []);

  // Unified apply for the standalone query controls (MRCA, search, slices):
  // swap in their highlight, mark the operator(s) they fired, and optionally
  // recenter on a representative match.
  const apply = useCallback((state: HighlightState, ops: string[], focusPath?: string) => {
    setSelection(null);
    setHighlight(state);
    setActiveOps(new Set(ops));
    if (focusPath) canvasRef.current?.focusNode(focusPath);
  }, []);

  const applyMrca = useCallback(
    (state: HighlightState, focusPath: string) => apply(state, ["lca"], focusPath),
    [apply],
  );

  const reset = useCallback(() => {
    setHighlight(EMPTY_HIGHLIGHT);
    setSelection(null);
    setActiveOps(new Set());
  }, []);

  // Graft: highlight the new node, mark `concatText` active, refetch the taxa
  // (so the canvas grows the node), then recenter once it has rendered.
  const onGrafted = useCallback(
    async (newPath: string) => {
      setSelection(null);
      setHighlight(matchHighlight([newPath]));
      setActiveOps(new Set(["concatText"]));
      pendingFocus.current = newPath;
      await router.invalidate();
    },
    [router],
  );

  const onPruned = useCallback(async () => {
    reset();
    await router.invalidate();
  }, [reset, router]);

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight">
          prisma-ltree · <span className="text-primary">Tree of Life</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          A pannable phylogeny rooted at <em>Catarrhini</em> — every control maps to a real{" "}
          <code>ltree</code> query. {taxa.length} taxa.
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="relative min-w-0 flex-1">
          <TreeCanvas
            taxa={taxa}
            highlight={highlight}
            onSelectTaxon={selectTaxon}
            onReady={onReady}
          />
          {selection ? (
            <SidePanel
              taxon={selection.taxon}
              lineage={selection.lineage}
              subtree={selection.subtree}
              allTaxa={taxa}
              onClose={reset}
              onRecenter={recenter}
            />
          ) : null}
        </section>

        <aside className="hidden w-80 shrink-0 space-y-3 overflow-y-auto border-l bg-sidebar p-4 lg:block">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Operator showcase
          </h2>
          <LineageControls
            selected={selection?.taxon ?? null}
            active={isActive(highlight)}
            onReset={reset}
          />
          <MrcaControls allTaxa={taxa} onApply={applyMrca} />
          <SearchControls onApply={apply} />
          <SliceControls allTaxa={taxa} onApply={apply} onRecenter={recenter} />
          <GraftControls allTaxa={taxa} onGrafted={onGrafted} onPruned={onPruned} />
          <OperatorLegend activeOps={activeOps} />
        </aside>
      </div>
    </main>
  );
}
