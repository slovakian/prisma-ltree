import { type Edge } from "@xyflow/react";
import { type HierarchyNode, stratify, tree } from "d3-hierarchy";
import type { TaxonRow } from "../server/taxonomy";
import { COL_GAP, ROW_GAP, type TaxonFlowNode, toFlowEdge, toFlowNode } from "./nodes";

/**
 * Turn a flat, path-ascending `TaxonRow[]` into React Flow `{ nodes, edges }`
 * laid out as a **horizontal left-to-right dendrogram** (root on the left,
 * tips on the right — the standard phylogenetic orientation).
 *
 * The tree is purely a function of the ltree `path` list: a taxon's parent is
 * the path with its last label stripped (`A.B.C` → `A.B`). We `stratify` that
 * parent/child relation into a d3 hierarchy, run `d3.tree().nodeSize([h, w])`
 * to assign dendrogram coordinates, then **swap x and y** so the layout
 * engine keeps its breadth-first sibling spacing while the canvas reads
 * horizontally. This islands the rendering layer from the extension — nothing
 * here knows about ltree operators, only about the emitted path strings.
 */
export type TreeLayout = {
  nodes: TaxonFlowNode[];
  edges: Edge[];
};

/** Parent ltree path of `path`, or `null` for a root (no `.`). */
export function parentPath(path: string): string | null {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? null : path.slice(0, idx);
}

export function buildTree(taxa: TaxonRow[]): TreeLayout {
  if (taxa.length === 0) return { nodes: [], edges: [] };

  // Stratify the flat list into a hierarchy keyed by ltree path. d3 throws on
  // a missing parent or multiple roots, which surfaces a malformed dataset
  // immediately rather than silently dropping nodes.
  const root: HierarchyNode<TaxonRow> = stratify<TaxonRow>()
    .id((d) => d.path)
    .parentId((d) => parentPath(d.path))(taxa);

  // nodeSize([breadth, depth]); after the x/y swap below, breadth controls the
  // vertical separation between siblings and depth the horizontal step per
  // generation. Fixed node size keeps tip-dense subfamilies from colliding.
  tree<TaxonRow>().nodeSize([ROW_GAP, COL_GAP])(root);

  const nodes: TaxonFlowNode[] = [];
  const edges: Edge[] = [];

  for (const node of root.descendants()) {
    // Swap: d3's x (breadth) → canvas y, d3's y (depth) → canvas x. A node with
    // no children is a tip (circular portrait); otherwise an internal clade.
    const isLeaf = !node.children || node.children.length === 0;
    nodes.push(toFlowNode(node.data, node.y ?? 0, node.x ?? 0, isLeaf));
    const parent = parentPath(node.data.path);
    if (parent !== null) {
      edges.push(toFlowEdge(parent, node.data.path));
    }
  }

  return { nodes, edges };
}
