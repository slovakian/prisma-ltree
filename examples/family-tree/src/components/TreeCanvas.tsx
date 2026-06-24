import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Minus, Plus } from "lucide-react";
import type { TaxonRow } from "../server/taxonomy";
import { buildTree } from "~/lib/layout";
import { type HighlightState, edgeKind, isActive, nodeKind } from "~/lib/highlight";
import { NODE_HEIGHT, NODE_WIDTH, type TaxonFlowNode } from "~/lib/nodes";
import { cn } from "~/lib/utils";
import { TaxonNode } from "./TaxonNode";

/**
 * React Flow wrapper for the phylogeny dendrogram.
 *
 * `nodeTypes` is declared module-level (immutable identity) per React Flow
 * guidance — re-creating it each render thrashes the canvas. The whole tree is
 * rendered client-only: TanStack Start SSR + React Flow's measured layout
 * produce hydration warnings, so we gate the `<ReactFlow>` mount behind a
 * `useEffect` flag and render a matching-height skeleton on the server.
 *
 * The base layout (`buildTree`) is computed once per taxa set; the active
 * `highlight` is folded into per-node `data` and per-edge stroke each render so
 * clicking a taxon paints its lineage/subtree and the MRCA picker can recolor +
 * recenter the canvas. `focusNode` is handed back to the parent via `onReady`
 * so breadcrumb and MRCA controls can recenter.
 */
const nodeTypes: NodeTypes = { taxon: TaxonNode };

/**
 * Active-edge stroke per kind. The lineage path is the rust accent (spec §3.3
 * "active lineage … is the rust accent, slightly heavier"); subtree/search keep
 * their semantic highlight hues. Inactive links stay the `--canvas-link`
 * hairline set in `lib/nodes.ts`.
 */
const EDGE_STROKE = {
  lineage: { stroke: "var(--primary)", strokeWidth: 2.5 },
  subtree: { stroke: "var(--subtree-foreground)", strokeWidth: 2 },
  search: { stroke: "var(--search-foreground)", strokeWidth: 2 },
} as const;

export type CanvasHandle = {
  /** Smoothly center + zoom the viewport on a taxon by its ltree path. */
  focusNode: (path: string) => void;
};

export type TreeCanvasProps = {
  taxa: TaxonRow[];
  highlight: HighlightState;
  onSelectTaxon: (taxon: TaxonRow) => void;
  onReady?: (handle: CanvasHandle) => void;
};

export function TreeCanvas(props: TreeCanvasProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="grid size-full place-items-center text-sm text-muted-foreground">
        Loading tree…
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

function Flow({ taxa, highlight, onSelectTaxon, onReady }: TreeCanvasProps) {
  const { setCenter } = useReactFlow();

  // Geometry is a pure function of the taxa; recompute only when they change.
  const base = useMemo(() => buildTree(taxa), [taxa]);

  // Fold the active highlight into node data + edge stroke. Muted (non-matching)
  // elements fade so the highlighted lineage/subtree reads cleanly.
  const active = isActive(highlight);
  const nodes = useMemo<TaxonFlowNode[]>(
    () =>
      base.nodes.map((n) => {
        const kind = nodeKind(n.id, highlight);
        return {
          ...n,
          data: { ...n.data, highlight: active ? kind : undefined },
          className: active && !kind ? "opacity-40 transition-opacity" : "transition-opacity",
        };
      }),
    [base.nodes, highlight, active],
  );
  const edges = useMemo<Edge[]>(
    () =>
      base.edges.map((e) => {
        const kind = edgeKind(e.source, e.target, highlight);
        if (!kind) {
          return {
            ...e,
            className: active ? "opacity-25 transition-opacity" : "transition-opacity",
          };
        }
        return {
          ...e,
          animated: kind === "lineage",
          style: EDGE_STROKE[kind],
          className: "transition-opacity",
        };
      }),
    [base.edges, highlight, active],
  );

  const focusNode = useCallback(
    (path: string) => {
      const node = base.nodes.find((n) => n.id === path);
      if (!node) return;
      void setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, {
        zoom: 1.1,
        duration: 600,
      });
    },
    [base.nodes, setCenter],
  );

  useEffect(() => {
    onReady?.({ focusNode });
  }, [onReady, focusNode]);

  const onNodeClick = useCallback<NodeMouseHandler<TaxonFlowNode>>(
    (_event, node) => onSelectTaxon(node.data.taxon),
    [onSelectTaxon],
  );

  return (
    // The radial cream/walnut field replaces React Flow's dotted `<Background>`;
    // the canvas pane is transparent so the gradient reads through (spec §3.2).
    <div className="size-full" style={{ background: "var(--canvas-radial)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <CanvasControls />
      </ReactFlow>
    </div>
  );
}

/**
 * Minimal zoom/fit controls on the paper surface (spec §3.4), replacing React
 * Flow's default `<Controls>`. Pan/zoom/fit behavior is unchanged — these just
 * drive the same `useReactFlow` imperative API in a hairline, parchment skin.
 * Sits bottom-right so the Phase 3 title overlay (top-left) won't collide.
 */
function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const btn =
    "flex h-8 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <Panel position="bottom-right">
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-sm border border-border bg-card/90 backdrop-blur-sm">
        <button
          type="button"
          className={btn}
          onClick={() => void zoomIn({ duration: 200 })}
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => void zoomOut({ duration: 200 })}
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          className={cn(btn, "font-mono text-[0.6rem] uppercase tracking-[0.14em]")}
          onClick={() => void fitView({ padding: 0.15, duration: 400 })}
          aria-label="Fit tree to view"
        >
          Fit
        </button>
      </div>
    </Panel>
  );
}
