/**
 * Data + pure highlight logic for the interactive ltree hero demo.
 *
 * Everything here is framework-free and deterministic so the highlight rules
 * (which mirror the real PostgreSQL ltree operator semantics) can be unit
 * tested directly. Rendering lives in the `components/home` components.
 */

export type NodeState = "primary" | "secondary" | "dim" | "normal";

export interface NodeRender {
  state: NodeState;
  /** Optional badge text (e.g. depth for nlevel). */
  badge?: string;
}

export interface TreeNode {
  /** Full ltree path, dot-separated. Acts as the node id. */
  path: string;
  /** Last path label, shown inside the node. */
  label: string;
  /** Parent path, or null for the root. */
  parent: string | null;
  /** Layout coordinates in the fixed SVG viewBox. */
  x: number;
  y: number;
}

/** Fixed demo tree. Coordinates target a 760×360 viewBox. */
export const treeNodes: readonly TreeNode[] = [
  { path: "Top", label: "Top", parent: null, x: 380, y: 44 },
  { path: "Top.Science", label: "Science", parent: "Top", x: 200, y: 138 },
  { path: "Top.Hobbies", label: "Hobbies", parent: "Top", x: 560, y: 138 },
  { path: "Top.Science.Astronomy", label: "Astronomy", parent: "Top.Science", x: 110, y: 232 },
  { path: "Top.Science.Biology", label: "Biology", parent: "Top.Science", x: 290, y: 232 },
  { path: "Top.Hobbies.Music", label: "Music", parent: "Top.Hobbies", x: 470, y: 232 },
  // Shares the "Astronomy" label with the Science branch — makes lquery shine.
  { path: "Top.Hobbies.Astronomy", label: "Astronomy", parent: "Top.Hobbies", x: 650, y: 232 },
  {
    path: "Top.Science.Astronomy.Cosmology",
    label: "Cosmology",
    parent: "Top.Science.Astronomy",
    x: 110,
    y: 316,
  },
];

export interface TreeEdge {
  from: TreeNode;
  to: TreeNode;
}

const nodeByPath = new Map(treeNodes.map((n) => [n.path, n]));

/** Parent→child edges derived from the node list. */
export const treeEdges: readonly TreeEdge[] = treeNodes
  .filter((n) => n.parent !== null)
  .map((n) => ({ from: nodeByPath.get(n.parent as string) as TreeNode, to: n }));

// --- ltree semantics (mirrors PostgreSQL operators) -------------------------

const labelsOf = (path: string): string[] => path.split(".");

/** `path <@ anc` — is `path` the same as, or below, `anc`? */
export const isDescendantOf = (path: string, anc: string): boolean =>
  path === anc || path.startsWith(`${anc}.`);

/** `path @> desc` — is `path` the same as, or an ancestor of, `desc`? */
export const isAncestorOf = (path: string, desc: string): boolean =>
  path === desc || desc.startsWith(`${path}.`);

/**
 * `path ~ lquery` for the subset of lquery used here: literal labels and `*`,
 * where `*` matches zero or more whole labels. Implemented as classic wildcard
 * matching so the demo stays honest about the operator's behaviour.
 */
export function matchesLquery(path: string, pattern: string): boolean {
  const labels = labelsOf(path);
  const tokens = labelsOf(pattern);
  const m = labels.length;
  const n = tokens.length;
  const dp: boolean[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => false),
  );
  dp[0][0] = true;
  for (let j = 1; j <= n; j++) {
    if (tokens[j - 1] === "*") dp[0][j] = dp[0][j - 1];
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokens[j - 1] === "*") {
        dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
      } else {
        dp[i][j] = dp[i - 1][j - 1] && labels[i - 1] === tokens[j - 1];
      }
    }
  }
  return dp[m][n];
}

/** All inclusive prefixes of a path: `Top.A.B` → [`Top`, `Top.A`, `Top.A.B`]. */
function ancestorsInclusive(path: string): string[] {
  const labels = labelsOf(path);
  return labels.map((_, i) => labels.slice(0, i + 1).join("."));
}

/** `lca(...)` — the longest path prefix shared by every argument. */
export function lca(paths: readonly string[]): string {
  if (paths.length === 0) return "";
  let common = labelsOf(paths[0]);
  for (const p of paths.slice(1)) {
    const labels = labelsOf(p);
    const next: string[] = [];
    for (let i = 0; i < Math.min(common.length, labels.length); i++) {
      if (common[i] === labels[i]) next.push(common[i]);
      else break;
    }
    common = next;
  }
  return common.join(".");
}

// --- Operations -------------------------------------------------------------

export interface DemoOp {
  id: string;
  /** Short label for the rail / pills. */
  label: string;
  /** The typed method call shown to the user. */
  method: string;
  /** The SQL it lowers to. */
  sql: string;
  /** One-line plain-English caption. */
  caption: string;
  /** Pure highlight rule over the tree, keyed by node path. */
  compute: (nodes: readonly TreeNode[]) => Record<string, NodeRender>;
}

const renderFilter = (
  nodes: readonly TreeNode[],
  pred: (path: string) => boolean,
): Record<string, NodeRender> =>
  Object.fromEntries(nodes.map((n) => [n.path, { state: pred(n.path) ? "primary" : "dim" }]));

const LCA_ARGS: [string, string] = ["Top.Science.Biology", "Top.Hobbies.Music"];

export const demoOps: readonly DemoOp[] = [
  {
    id: "descendants",
    label: "Descendants",
    method: 'path.isDescendantOf("Top.Science")',
    sql: "path <@ 'Top.Science'",
    caption: "Filter a whole branch with one path.",
    compute: (nodes) => renderFilter(nodes, (p) => isDescendantOf(p, "Top.Science")),
  },
  {
    id: "ancestors",
    label: "Ancestors",
    method: 'path.isAncestorOf("Top.Science.Astronomy.Cosmology")',
    sql: "path @> 'Top.Science.Astronomy.Cosmology'",
    caption: "Walk the lineage above a leaf.",
    compute: (nodes) =>
      renderFilter(nodes, (p) => isAncestorOf(p, "Top.Science.Astronomy.Cosmology")),
  },
  {
    id: "lquery",
    label: "Pattern match",
    method: 'path.matchesLquery("Top.*.Astronomy")',
    sql: "path ~ 'Top.*.Astronomy'",
    caption: "Wildcards match across branches.",
    compute: (nodes) => renderFilter(nodes, (p) => matchesLquery(p, "Top.*.Astronomy")),
  },
  {
    id: "nlevel",
    label: "Depth",
    method: "path.nlevel()",
    sql: "nlevel(path)",
    caption: "Every path carries its depth for free.",
    compute: (nodes) =>
      Object.fromEntries(
        nodes.map((n) => [n.path, { state: "normal", badge: String(labelsOf(n.path).length) }]),
      ),
  },
  {
    id: "lca",
    label: "Common ancestor",
    method: `path.lca("${LCA_ARGS[0]}", "${LCA_ARGS[1]}")`,
    sql: "lca(path, …)",
    caption: "Find where two branches meet.",
    compute: (nodes) => {
      const meet = lca(LCA_ARGS);
      const lineage = new Set(LCA_ARGS.flatMap(ancestorsInclusive));
      return Object.fromEntries(
        nodes.map((n) => {
          if (n.path === meet) return [n.path, { state: "primary" }];
          if (lineage.has(n.path)) return [n.path, { state: "secondary" }];
          return [n.path, { state: "dim" }];
        }),
      );
    },
  },
];

export type DemoOpId = (typeof demoOps)[number]["id"];

/** Raw code snippets, highlighted server-side by the route loader. */
export const demoCodeBlocks = [
  {
    id: "demo.descendants",
    code: `// All categories in the Top.Science branch
sql.from(tables.category)
  .where(tables.category.columns.path.isDescendantOf("Top.Science"));`,
    lang: "typescript",
  },
  {
    id: "demo.ancestors",
    code: `// The lineage above a leaf node
sql.from(tables.category)
  .where(tables.category.columns.path
    .isAncestorOf("Top.Science.Astronomy.Cosmology"));`,
    lang: "typescript",
  },
  {
    id: "demo.lquery",
    code: `// Any "Astronomy" node, regardless of branch
sql.from(tables.category)
  .where(tables.category.columns.path.matchesLquery("Top.*.Astronomy"));`,
    lang: "typescript",
  },
  {
    id: "demo.nlevel",
    code: `// Project each node's depth in the tree
sql.from(tables.category)
  .select({ depth: tables.category.columns.path.nlevel() });`,
    lang: "typescript",
  },
  {
    id: "demo.lca",
    code: `// Where do two branches meet?
sql.from(tables.category)
  .select({
    meet: tables.category.columns.path
      .lca("Top.Science.Biology", "Top.Hobbies.Music"),
  });`,
    lang: "typescript",
  },
] as const;
