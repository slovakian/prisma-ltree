# Handoff → Phase 2: The canvas (TreeCanvas + TaxonNode)

You are the agent picking up **Phase 2** of the Tree-of-Life visual redesign.
Phase 1 (parchment tokens + Garamond/Spline type) is **done and committed**
(`style(family-tree): redesign Phase 1 …`). Read these first, in order:

1. [`redesign-spec.md`](./redesign-spec.md) — the target feel, palette, type, and
   hard constraints. §3.3 (shape & surface) and §3.4 (chrome, for the controls
   bit) plus §4 (constraints) are load-bearing for you.
2. [`redesign-plan.md`](./redesign-plan.md) — your phase is **Phase 2**; skim the
   later phases so you don't do their work (title overlay = Phase 3; side panel =
   Phase 4; controls + teardown = Phase 5).
3. Inspiration (look, don't copy): `examples/Elegant ape phylogenetic tree/Ape
Phylogeny.dc.html` — note the orthogonal hairline dendrogram, parchment
   radial field, diamond clades vs. circular tips. **Do not** depend on this
   folder; it's deleted in Phase 5.

Before starting: load the `frontend-ui-engineering` skill, and add
`browser-testing-with-devtools` for visual verification (this is the first
visual phase). Run the project skill check from the repo root per the root
`CLAUDE.md` if you touch tooling.

## What Phase 1 left you (use these — don't re-roll hexes)

All tokens live in `src/styles/app.css`. Token **names are stable**; consume them
via the Tailwind utilities (`bg-background`, `text-foreground`, `border-border`,
`bg-primary`, `text-muted-foreground`, `font-mono`, etc.) or `var(--token)`.

- **Type:** body/headings now render EB Garamond (`--font-sans`/`--font-heading`);
  the `font-mono` utility now resolves to **Spline Sans Mono**
  (`--font-mono = "Spline Sans Mono Variable", …`). Use `font-mono` + uppercase +
  `tracking-[0.14em]`–`tracking-[0.26em]` for ranks, sci-name apparatus, ticks.
- **Palette (light):** `--background` parchment `#f3ede1`, `--foreground` ink
  `#2e2a22`, `--primary` rust `#a2542f`, `--card`/`--popover` `#faf6ec`,
  `--border`/`--input` hairline `#ddceb0`, `--muted-foreground` `#9a8f7c`. Dark
  mode is re-tuned walnut+rust in the same hue family — keep it working.
- **Canvas variables I added for you (consume them now):**
  - `--canvas-radial` — the radial cream gradient (`#f6f1e6 → #efe8da →
#e9e1d0`, walnut in dark). Put this on the canvas wrapper to replace the
    dotted React Flow `<Background>`.
  - `--canvas-link` — `#cabd9f` hairline for inactive dendrogram links.
  - `--canvas-axis` — `#cfc2a9` for axis/guide chrome (if you add any).
  - `--canvas-divider` — `#e6d9be` for faint dividers.
    These are raw `var(--canvas-*)` (no Tailwind color mapping); use them in
    inline styles / CSS, or add `@theme inline` color mappings if you prefer
    utilities. The radius scale also shrank (`--radius: 0.3rem`) per §3.3
    (restrained radii) — cards/markers will already read tighter.
- The showcase highlight tokens (`--lineage`, `--subtree`, `--mrca`, `--search`,
  `--slice`, `--graft` + `-foreground`) are **unchanged from before Phase 1** —
  they still read on the old warm palette. You'll re-map the node highlight
  states against the new parchment palette as part of this phase (rust selection,
  etc.); keep the token names.

## Your job (and only this)

Make the dendrogram read as a hairline natural-history plate. **No** title-bar /
overlay work (Phase 3), **no** side-panel restyle (Phase 4), **no** controls
restyle (Phase 5). Files:

### 1. `src/components/TreeCanvas.tsx`

- Switch edge `type` to `step` (sharp orthogonal right-angle connectors), not
  `smoothstep`. (Edge type may be set here or in `lib/nodes.ts` — check both.)
- Inactive link stroke → `--canvas-link` hairline weight; active lineage path →
  rust (`--primary`), slightly heavier.
- Replace the dotted `<Background>` with the `--canvas-radial` field (CSS on the
  wrapper is simplest; or a subtle `Background` variant).
- Restyle/replace React Flow `<Controls>` to minimal `+ / − / FIT` on the paper
  surface. Keep pan/zoom/fit + `focusNode` behavior intact.

### 2. `src/components/TaxonNode.tsx`

- Leaf tips = circular portrait + serif common name + italic mono sci-name (drop
  the `Badge` rank pill or render it as a mono uppercase kicker).
- Internal clade nodes = small rotated-square (diamond) marker + mono uppercase
  clade label.
- Replace the card halo/shadow with a hairline border (or none) per §3.3.
- Keep the highlight ring states but re-map them to the new palette (rust
  selection; lineage/subtree/etc. tokens).

Keep node dimensions, handles, `nodeTypes` identity, and the highlight-folding
logic intact (hard constraint §4.2).

## Constraints

- Every operator control keeps its exact behavior and the `ltree` query it fires.
- React Flow stays the engine; pan/zoom/fit/`focusNode`/highlight folding all
  preserved.
- Client-only mount + server skeleton stays (hydration-safe).
- Token **names** must not change. No new deps.
- Don't touch `routes/index.tsx`, `SidePanel`, or `Controls/*` (later phases).

## Environment note (read this — it cost Phase 1 time)

The server tests (`test/server/taxonomy.test.ts`, 28 of them) need a **running,
seeded Postgres**. If `vp test` shows `42P01` / connection errors, the DB is
down or empty. Bring it up before testing:

```
open -a OrbStack            # Docker daemon (this Mac uses OrbStack)
pnpm db:up                  # start postgres
pnpm emit && pnpm db:plan && pnpm db:init && pnpm seed   # if tables are missing
```

**Important:** `pnpm emit` / `pnpm db:init` regenerate `migrations/**` and
`src/prisma/contract.*`. Those are **out of scope** for the redesign — if you run
setup for testing, `git checkout --` those generated files before committing so
your diff stays clean (Phase 1 only committed `package.json`, `pnpm-lock.yaml`,
`app.css`). The `vp test` run also prints a harmless `close timed out after
10000ms` teardown warning after `Test Files … passed` — ignore it.

## Verify before you hand off

- [ ] `vp check` green (format, lint, typecheck).
- [ ] `vp test` green (DB up + seeded; see note above).
- [ ] Browser (`vp dev`): pan / zoom / fit all work; clicking a node still opens
      the panel and paints lineage/subtree; highlights legible on parchment.
- [ ] Links are orthogonal hairlines; active lineage is rust; clades read as
      diamonds, tips as circles; canvas is a radial cream field, not dotted.
- [ ] Light **and** dark mode both coherent.
- [ ] Responsive at 1440 / 1024 / 768 / 320; focus visible; no a11y regressions.

## When done

1. Commit (branch `example/family-tree`): `style(family-tree): redesign Phase 2 —
hairline dendrogram canvas + diamond/portrait nodes`.
2. Write `docs/redesign/phase-3-handoff.md` using **this file's structure**,
   pointing the next agent at Phase 3 (title overlay + chrome) in the plan. Note
   anything that affects Phase 3 (e.g. where the zoom/fit controls ended up so
   the overlay doesn't collide, any new tokens you added, edge-type location).
3. Leave the working tree clean.
