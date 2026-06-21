# Spec: Interactive ltree Demo Hero (home page)

## Objective

Replace the static, text-heavy top of the prisma-ltree docs home page with an
**interactive hero** that visually teaches what the extension does: _an ltree
query selects a subset of nodes in a hierarchy._

A small fixed category tree is rendered as SVG. Picking an operation highlights
the matching nodes and shows the typed method + the SQL it lowers to. The hero
auto-plays through a curated set of operations and can also be driven by
click/tap. The existing operator/code reference grid is kept, demoted to a
"reference" section below the hero.

Who it's for: developers evaluating prisma-ltree who need to grasp the value in
the first few seconds. Success = the mental model ("a path query filters a
subtree / predicate over nodes") is conveyed visually, the page stays fast and
accessible, and nothing in the existing reference content is lost.

## Tech Stack

- TanStack Start + React 19 (SSR), TanStack Router file routes
- Tailwind CSS v4 (monochrome tokens, `--radius: 0`, JetBrains Mono everywhere)
- Brand accent: green `oklch(0.72 0.14 165)` (matches the author shimmer)
- Shiki (server-side, `tokyo-night`) for code highlighting via the route loader
- Vitest + @testing-library/react + jsdom for tests
- Hand-built SVG/CSS for the tree (no graph/charting dependency)

## Commands

```
Dev:        pnpm --filter web dev      (or: vp dev)
Build:      pnpm --filter web build     (or: vp run build)
Test:       pnpm --filter web test      (or: vp test)
Typecheck:  pnpm --filter web typecheck
Lint:       pnpm --filter web lint
Format chk: pnpm --filter web check
Full:       vp check && vp test
```

## Project Structure

```
apps/web/src/
  routes/index.tsx                  → home route; loader highlights demo + setup code
  lib/ltree-demo-data.ts            → tree nodes, edges, ops + pure evaluate() logic, raw snippets
  components/home/
    ltree-demo.tsx                  → client orchestrator: op rail, code strip, auto-play, a11y
    ltree-tree.tsx                  → SVG tree: nodes/edges rendered from per-node state
  lib/ltree-demo-data.test.ts       → unit tests for evaluate() per op
docs/spec/home-ltree-demo-spec.md   → this spec
```

## Code Style

Match the existing repo: 2-space indent, double quotes, named exports, `cn()` for
class merging, sharp corners, monospace. Pure logic separated from rendering.

```ts
// Pure, testable highlight evaluation — no React, no DOM.
export type NodeState = "primary" | "secondary" | "dim" | "normal";

export interface NodeRender {
  state: NodeState;
  badge?: string;
}

export function evaluate(op: DemoOp, nodes: readonly TreeNode[]): Record<string, NodeRender> {
  // returns one NodeRender per node path
}
```

## Testing Strategy

- Unit-test the pure `evaluate()` for every op against the fixed tree:
  - `isDescendantOf("Top.Science")` → Science subtree (4 nodes) primary, rest dim
  - `isAncestorOf("Top.Science.Astronomy.Cosmology")` → 4-node lineage primary
  - `matchesLquery("Top.*.Astronomy")` → both Astronomy nodes primary
  - `nlevel()` → every node `normal` with a depth badge, nothing dimmed
  - `lca(...)` → common ancestor primary, the two arg paths secondary, rest dim
- Tests live next to the data module; no component snapshot tests (rendering is
  exercised by build + manual/browser check). Coverage target: 100% of `evaluate`
  branches.

## Boundaries

- **Always:** keep the existing reference grid + setup section; run typecheck +
  test + build before declaring done; respect `prefers-reduced-motion`; keep
  first paint correct without JS (SSR a default op state).
- **Ask first:** adding any npm dependency; changing global theme tokens; altering
  the documented public API shapes shown in snippets.
- **Never:** introduce a charting/graph dependency; ship SQL/method text that
  misrepresents the real operators; remove reference content.

## Success Criteria

1. Hero renders a fixed SVG category tree; selecting any of 5 ops highlights the
   correct nodes and updates the method + SQL shown.
2. Auto-play cycles ops on a timer, pauses on hover/interaction; clicking/tapping
   an op selects it. `prefers-reduced-motion` disables auto-advance + transitions.
3. Desktop layout: op rail + tree side-by-side with code strip below. Mobile:
   stacked tree → op pills (horizontal) → code; no horizontal page overflow.
4. Ops are real buttons; active op announced via `aria-live`; nodes carry
   `aria-label` with path + match state.
5. SSR first paint shows op[0] active with no animation; hydration starts timer.
6. `typecheck`, `lint`, `test`, `build` all pass. Existing reference grid retained.

## Open Questions

None blocking. (Resolved: SVG hand-built; auto-play + click; 5 curated ops
incl. `lca` rendered as a 3-path convergence.)
