import type { Edge, Node, Position } from "@xyflow/react";
import type { HighlightKind } from "./highlight";
import type { TaxonRow } from "../server/taxonomy";

/**
 * Row → React Flow node/edge mapping for the phylogeny canvas.
 *
 * The dendrogram is laid out by `lib/layout.ts` (d3-hierarchy). This module
 * owns the *shape* of a Flow node — its `type`, handle positions, and the
 * `data` payload the `TaxonNode` component reads — so the layout engine stays
 * focused on geometry and the rendering layer stays islanded from d3.
 */

/** Custom node `type` key registered on the canvas via `nodeTypes`. */
export const TAXON_NODE_TYPE = "taxon" as const;

/**
 * Node footprint used both for the d3 `tree().nodeSize(...)` spacing and the
 * CSS box. The dendrogram reads horizontally (root left, tips right), so the
 * *breadth* axis (sibling separation) becomes vertical and the *depth* axis
 * becomes horizontal after `lib/layout.ts` swaps x/y.
 */
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 56;
/** Sibling separation (vertical after swap) fed to `nodeSize`. */
export const ROW_GAP = NODE_HEIGHT + 22;
/** Depth separation (horizontal after swap) fed to `nodeSize`. */
export const COL_GAP = NODE_WIDTH + 110;

export type TaxonNodeData = {
  taxon: TaxonRow;
  /**
   * Whether this taxon is a tip (no children in the laid-out tree). Tips render
   * as circular portraits; internal clades render as diamond markers (spec §3.3).
   * Resolved structurally by `lib/layout.ts` from the d3 hierarchy.
   */
  isLeaf: boolean;
  /** On-canvas highlight kind; `null` = neutral, `undefined` = no highlight active. */
  highlight?: HighlightKind | null;
};

export type TaxonFlowNode = Node<TaxonNodeData, typeof TAXON_NODE_TYPE>;

/**
 * Build a Flow node from a taxon row and its already-resolved canvas
 * coordinates. The node id is the ltree `path` — globally unique by
 * construction, so a taxon can never render twice.
 */
export function toFlowNode(taxon: TaxonRow, x: number, y: number, isLeaf: boolean): TaxonFlowNode {
  return {
    id: taxon.path,
    type: TAXON_NODE_TYPE,
    position: { x, y },
    data: { taxon, isLeaf },
    // String literals match the `Position` enum values ("right"/"left"); kept
    // as type-only imports so this geometry module pulls no React Flow runtime
    // (and the node-env layout test stays clean).
    sourcePosition: "right" as Position,
    targetPosition: "left" as Position,
  };
}

/** Build the parent→child edge for a non-root taxon. */
export function toFlowEdge(parentPath: string, childPath: string): Edge {
  return {
    id: `${parentPath}->${childPath}`,
    source: parentPath,
    target: childPath,
    // `step` = sharp orthogonal right-angle connectors (spec §3.3 "orthogonal
    // links"), drawn as a hairline in the muted dendrogram link tone.
    type: "step",
    selectable: false,
    style: { stroke: "var(--canvas-link)", strokeWidth: 1.5 },
  };
}
