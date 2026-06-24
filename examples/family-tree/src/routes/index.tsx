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
import { type TaxonRow, getLineage, getSubtree, getTaxa } from "~/server/taxonomy.functions";

/**
 * Root view: Tree-of-Life interactive viewer.
 *
 * The loader streams every taxon (path asc) from `getTaxa` — a real ltree query,
 * no client-side tree assembly. `<TreeCanvas>` lays the paths out as a
 * horizontal dendrogram with React Flow. Clicking a node fetches its lineage
 * (`@>`) and subtree (`<@`) in parallel, paints the highlight, and opens the
 * `SidePanel` operator stack; the aside hosts the highlight legend/reset
 * (`LineageControls`) and the `lca()` MRCA picker (`MrcaControls`).
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
      <div className="flex min-h-0 flex-1">
        <section className="relative min-w-0 flex-1">
          <TreeCanvas
            taxa={taxa}
            highlight={highlight}
            onSelectTaxon={selectTaxon}
            onReady={onReady}
          />

          {/* Floating title + hint chrome. The wrapper never traps pointer
              events so the canvas pans/zooms beneath it; re-enable per-element
              only where something is interactive. */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute left-5 top-5 max-w-[26rem] motion-safe:animate-[overlayRise_0.5s_cubic-bezier(0.2,0.7,0.2,1)] sm:left-9 sm:top-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-primary">
                prisma-ltree
              </p>
              <h1 className="mt-2 font-heading text-4xl font-medium leading-none tracking-[0.01em] text-foreground sm:text-5xl">
                Tree of Life
              </h1>
              <div className="my-3.5 h-px w-14 bg-border" />
              <p className="max-w-sm font-heading text-[15px] italic leading-relaxed text-muted-foreground">
                A pannable phylogeny rooted at Catarrhini — every control maps to a real{" "}
                <code className="font-mono text-[13px] not-italic">ltree</code> query. {taxa.length}{" "}
                taxa.
              </p>
            </div>

            <div className="absolute right-5 top-6 hidden text-right font-mono text-[10.5px] uppercase leading-[1.9] tracking-[0.14em] text-muted-foreground motion-safe:animate-[overlayRise_0.5s_cubic-bezier(0.2,0.7,0.2,1)] sm:block">
              Drag to pan
              <br />
              Scroll to zoom
              <br />
              Click a node
            </div>
          </div>

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

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-sidebar lg:block">
          {/* One parchment surface (matching the Phase 4 panel): a mono section
              label header, then hairline-separated control sections — no boxy
              cards. Each section keeps its exact behavior + ltree query. */}
          <header className="px-4 pt-5 pb-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Operator showcase
            </h2>
            <p className="mt-1.5 font-heading text-[13px] italic leading-snug text-muted-foreground">
              Every control lowers to a real <code className="font-mono not-italic">ltree</code>{" "}
              query.
            </p>
          </header>
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
