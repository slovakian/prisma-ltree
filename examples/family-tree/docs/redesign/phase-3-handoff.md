# Handoff → Phase 3: Title overlay + chrome

You are the agent picking up **Phase 3** of the Tree-of-Life visual redesign.
Phase 1 (tokens + fonts) and Phase 2 (hairline dendrogram canvas + diamond/
portrait nodes) are **done and committed**. Read these first, in order:

1. [`redesign-spec.md`](./redesign-spec.md) — the target feel, palette, type, and
   hard constraints. **§3.4 (chrome)** is your load-bearing section; §3.1 (type
   moves: mono kicker → serif title → hairline rule → italic blurb) and §4
   (constraints) too.
2. [`redesign-plan.md`](./redesign-plan.md) — your phase is **Phase 3**; skim the
   later phases so you don't do their work (side panel = Phase 4; operator
   showcase + teardown = Phase 5).
3. Inspiration (look, don't copy): `examples/Elegant ape phylogenetic tree/Ape
Phylogeny.dc.html` — note the floating title block top-left and the quiet
   corner hint. **Do not** depend on this folder; it's deleted in Phase 5.

Before starting: load the `frontend-ui-engineering` skill, and add
`browser-testing-with-devtools` for visual verification **if a Chrome DevTools
MCP is configured** (see "Verify" caveat below). Run the project skill check from
the repo root per the root `CLAUDE.md` if you touch tooling.

## What Phases 1–2 left you (use these — don't re-roll)

All tokens live in `src/styles/app.css`; consume via Tailwind utilities or
`var(--token)`. Type/palette foundation from Phase 1 is unchanged.

- **Type:** body/headings render EB Garamond (`font-sans`/`font-heading`);
  `font-mono` resolves to **Spline Sans Mono**. Use `font-mono` + uppercase +
  `tracking-[0.14em]`–`tracking-[0.26em]` for the kicker and corner hint.
- **Palette:** parchment `--background`, ink `--foreground`, rust `--primary`,
  `--card`/`--popover` panel surface, hairline `--border`, `--muted-foreground`.
  `::selection` is warm rose. Dark mode is re-tuned walnut+rust — keep it working.
- **Canvas chrome tones (Phase 2 added Tailwind color mappings):** `canvas-link`,
  `canvas-axis`, `canvas-divider` are now real utilities (`bg-canvas-link`,
  `border-canvas-axis`, etc.) — Phase 2 mapped them in `@theme inline`.
  `--canvas-radial` stays a raw `var()` gradient (it's not a color) and is applied
  on the canvas wrapper `<div>` in `TreeCanvas.tsx`.
- **Highlight tokens** (`--lineage`/`--subtree`/`--mrca`/`--search`/`--slice`/
  `--graft` + `-foreground`) are unchanged. Phase 2 re-mapped the _node_ ring/edge
  styling to the parchment palette (rust selection, rust active-lineage edge) but
  **left the token values as-is** — re-tuning their hues into a single harmonious
  parchment scheme is still open if Phase 4/5 wants it. Keep the token names.

### Where Phase 2 put things (so your overlay doesn't collide)

- **Zoom/fit controls** now live **bottom-right**, as a custom `CanvasControls`
  component (a React Flow `<Panel position="bottom-right">`) inside `TreeCanvas`
  — hairline `+ / − / FIT` buttons on `bg-card`. The default React Flow
  `<Controls>` is **gone**. Your title overlay goes **top-left**, the corner hint
  **top-right**; both corners are free. Don't reintroduce `<Controls>`.
- **Edge type** is `step` (sharp orthogonal), set in `lib/nodes.ts#toFlowEdge`
  (not in `TreeCanvas`). Inactive links = `--canvas-link` hairline; active lineage
  = rust (`--primary`), heavier — folded in `TreeCanvas`'s `EDGE_STROKE`.
- **The dotted `<Background>` is gone**; the radial field is a CSS gradient on the
  wrapper `div` around `<ReactFlow>`. Don't add a `<Background>` back.
- **Node leaf/clade split:** `lib/layout.ts` now computes `isLeaf` structurally
  and `TaxonNode` renders tips as circular portraits, clades as diamond markers.
  No bearing on Phase 3, but don't break `TaxonNodeData.isLeaf`.

## Your job (and only this)

Replace the solid header bar with floating overlay chrome over the canvas
(spec §3.4). **No** side-panel restyle (Phase 4), **no** operator-showcase /
`Controls/*` restyle (Phase 5). Files:

### 1. `src/routes/index.tsx`

- Remove the `<header>` bar. Add an **absolutely-positioned title overlay** over
  the canvas section, top-left: mono rust **kicker** → big serif **title** →
  hairline rule → italic serif **blurb**. Preserve the existing copy — the taxa
  count and the "every control maps to a real `ltree` query" line must survive
  (move them into the blurb).
- Add the **top-right mono hint block** (uppercase, letter-spaced): pan / zoom /
  click affordances.
- **Pointer events:** the overlay container must be `pointer-events-none` so it
  doesn't trap canvas drag/zoom; re-enable `pointer-events-auto` only on the
  interactive bits (e.g. links in the blurb, if any). The bottom-right
  `CanvasControls` already handle their own events — don't cover them.
- Mobile: overlay collapses gracefully (don't blanket the canvas at 320/768).

## Constraints

- Every operator control keeps its exact behavior and the `ltree` query it fires.
- React Flow stays the engine; pan/zoom/fit/`focusNode`/highlight folding all
  preserved (you're not touching `TreeCanvas` logic, just the surrounding chrome).
- Client-only canvas mount + server skeleton stays (hydration-safe).
- Token **names** must not change. No new deps.
- Don't touch `TreeCanvas`/`TaxonNode` internals, `SidePanel`, or `Controls/*`.

## Environment note (read this — it has cost prior phases time)

The server tests (`test/server/taxonomy.test.ts`) need a **running, seeded
Postgres**. If `vp test` shows `42P01` / connection errors, the DB is down or
empty. Bring it up before testing:

```
open -a OrbStack            # Docker daemon (this Mac uses OrbStack)
pnpm db:up                  # start postgres
pnpm emit && pnpm db:plan && pnpm db:init && pnpm seed   # if tables are missing
```

**Important:** `pnpm emit` / `pnpm db:init` regenerate `migrations/**` and
`src/prisma/contract.*`. Those are **out of scope** — if you run setup, `git
checkout --` those generated files before committing so your diff stays clean.
`vp test` prints a harmless `close timed out after 10000ms` teardown warning and a
stray `module is not defined` line after `Tests … passed` — both are pre-existing
noise; ignore them as long as the test count is green.

## Verify before you hand off

- [ ] `vp check` green (format, lint) and `vp run typecheck` green. (Note: `vp
check` on this package runs format + lint only — run `vp run typecheck`
      separately for tsc.)
- [ ] `vp test` green (DB up + seeded; see note above — Phase 2 saw 44 passing).
- [ ] Browser (`vp dev`): overlay does **not** trap pointer events — canvas still
      pans/zooms _under_ the title block; the bottom-right controls still click;
      clicking a node still opens the panel.
- [ ] Title reads kicker → serif title → rule → italic blurb; corner hint legible;
      taxa count + `ltree` line preserved.
- [ ] Light **and** dark mode both coherent.
- [ ] Responsive at 1440 / 1024 / 768 / 320; overlay doesn't blanket the canvas on
      mobile; focus visible; no a11y regressions.

> **Visual-verification caveat:** Phase 2 had **no Chrome DevTools MCP** available,
> so its browser pass was limited to booting `vp dev` and confirming the route
> serves 200 with no compile/runtime errors — it could not screenshot or drive the
> canvas. If your environment also lacks the MCP, say so in your handoff and do the
> same boot-and-serve check rather than claiming a visual pass you couldn't run.

## When done

1. Commit (branch `example/family-tree`): `style(family-tree): redesign Phase 3 —
floating title overlay + corner hint chrome`.
2. Write `docs/redesign/phase-4-handoff.md` using **this file's structure**,
   pointing the next agent at Phase 4 (side panel / detail card) in the plan. Note
   anything that affects Phase 4 (e.g. final overlay z-index/placement, any new
   tokens, how the taxa-count/`ltree` copy is now wired).
3. Leave the working tree clean.
