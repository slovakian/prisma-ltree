import { describe, expect, it } from "vite-plus/test";
import type { NodeState } from "./ltree-demo-data";
import {
  demoOps,
  isAncestorOf,
  isDescendantOf,
  lca,
  matchesLquery,
  treeEdges,
  treeNodes,
} from "./ltree-demo-data";

/** Paths whose computed state matches `state`, for a given op id. */
function pathsWithState(opId: string, state: NodeState): string[] {
  const op = demoOps.find((o) => o.id === opId);
  if (!op) throw new Error(`unknown op: ${opId}`);
  const render = op.compute(treeNodes);
  return treeNodes
    .map((n) => n.path)
    .filter((p) => render[p].state === state)
    .sort();
}

describe("ltree semantics helpers", () => {
  it("isDescendantOf is inclusive and prefix-aware", () => {
    expect(isDescendantOf("Top.Science", "Top.Science")).toBe(true);
    expect(isDescendantOf("Top.Science.Biology", "Top.Science")).toBe(true);
    expect(isDescendantOf("Top.Hobbies", "Top.Science")).toBe(false);
    // Must not match on a non-boundary prefix.
    expect(isDescendantOf("Top.Scientific", "Top.Science")).toBe(false);
  });

  it("isAncestorOf is inclusive and prefix-aware", () => {
    expect(isAncestorOf("Top.Science", "Top.Science")).toBe(true);
    expect(isAncestorOf("Top", "Top.Science.Biology")).toBe(true);
    expect(isAncestorOf("Top.Hobbies", "Top.Science.Biology")).toBe(false);
  });

  it("matchesLquery treats * as zero-or-more labels", () => {
    expect(matchesLquery("Top.Science.Astronomy", "Top.*.Astronomy")).toBe(true);
    expect(matchesLquery("Top.Hobbies.Astronomy", "Top.*.Astronomy")).toBe(true);
    expect(matchesLquery("Top.Astronomy", "Top.*.Astronomy")).toBe(true); // * = zero labels
    expect(matchesLquery("Top.Science.Astronomy.Cosmology", "Top.*.Astronomy")).toBe(false);
    expect(matchesLquery("Top.Science.Biology", "Top.*.Astronomy")).toBe(false);
  });

  it("lca returns the longest shared prefix", () => {
    expect(lca(["Top.Science.Biology", "Top.Hobbies.Music"])).toBe("Top");
    expect(lca(["Top.Science.Astronomy", "Top.Science.Biology"])).toBe("Top.Science");
    expect(lca(["Top.Science", "Top.Science"])).toBe("Top.Science");
  });
});

describe("demo op highlight rules", () => {
  it("descendants lights the Top.Science subtree, dims the rest", () => {
    expect(pathsWithState("descendants", "primary")).toEqual([
      "Top.Science",
      "Top.Science.Astronomy",
      "Top.Science.Astronomy.Cosmology",
      "Top.Science.Biology",
    ]);
    expect(pathsWithState("descendants", "dim")).toEqual([
      "Top",
      "Top.Hobbies",
      "Top.Hobbies.Astronomy",
      "Top.Hobbies.Music",
    ]);
  });

  it("ancestors lights the 4-node lineage above Cosmology", () => {
    expect(pathsWithState("ancestors", "primary")).toEqual([
      "Top",
      "Top.Science",
      "Top.Science.Astronomy",
      "Top.Science.Astronomy.Cosmology",
    ]);
  });

  it("pattern match lights both Astronomy nodes", () => {
    expect(pathsWithState("lquery", "primary")).toEqual([
      "Top.Hobbies.Astronomy",
      "Top.Science.Astronomy",
    ]);
  });

  it("depth marks every node normal with a depth badge, nothing dimmed", () => {
    const op = demoOps.find((o) => o.id === "nlevel");
    if (!op) throw new Error("missing nlevel op");
    const render = op.compute(treeNodes);
    expect(pathsWithState("nlevel", "dim")).toEqual([]);
    expect(render["Top"]).toEqual({ state: "normal", badge: "1" });
    expect(render["Top.Science.Astronomy.Cosmology"]).toEqual({ state: "normal", badge: "4" });
  });

  it("lca marks the meeting point primary and both arg lineages secondary", () => {
    expect(pathsWithState("lca", "primary")).toEqual(["Top"]);
    expect(pathsWithState("lca", "secondary")).toEqual([
      "Top.Hobbies",
      "Top.Hobbies.Music",
      "Top.Science",
      "Top.Science.Biology",
    ]);
    expect(pathsWithState("lca", "dim")).toEqual([
      "Top.Hobbies.Astronomy",
      "Top.Science.Astronomy",
      "Top.Science.Astronomy.Cosmology",
    ]);
  });

  it("every op assigns a render entry to every node", () => {
    for (const op of demoOps) {
      const render = op.compute(treeNodes);
      expect(Object.keys(render).sort()).toEqual(treeNodes.map((n) => n.path).sort());
    }
  });
});

describe("tree structure", () => {
  it("derives one edge per non-root node", () => {
    expect(treeEdges).toHaveLength(treeNodes.length - 1);
  });

  it("every edge connects a node to its declared parent", () => {
    for (const edge of treeEdges) {
      expect(edge.to.parent).toBe(edge.from.path);
    }
  });
});
