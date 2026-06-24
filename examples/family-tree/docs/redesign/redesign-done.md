# Tree-of-Life Redesign — Done

The phased visual redesign of `examples/family-tree` is **complete**. This
replaces the per-phase handoff chain (`phase-1..5-handoff.md`) with a single
summary of what shipped, where it lives, and confirmation that every spec §5
acceptance criterion is met. Companion docs: [`redesign-spec.md`](./redesign-spec.md),
[`redesign-plan.md`](./redesign-plan.md).

## What each phase delivered

- **Phase 1 — Foundation (tokens + fonts).** Swapped Geist for **EB Garamond**
  (serif body/headings) + **Spline Sans Mono** (apparatus) via fontsource.
  Re-anchored the `:root` / `.dark` OKLCH palette to the parchment scheme (paper
  `--background`, ink `--foreground`, rust `--primary`, `--card` surface,
  hairline `--border`, `--muted-foreground`). Added `::selection`, the radial
  `--canvas-*` variables, and the showcase highlight tokens.
- **Phase 2 — Canvas (`TreeCanvas` + `TaxonNode`).** Hairline dendrogram:
  orthogonal `step` edges in `--canvas-link`, rust active lineage, radial cream
  paper background, faint axis guides. Tips render as **circular portraits**
  (serif common name + italic mono scientific name); internal clades as small
  **rotated-square (diamond)** markers with mono uppercase labels. Minimal
  `+ / − / FIT` `CanvasControls` (bottom-right).
- **Phase 3 — Title overlay + chrome.** Removed the header bar for a floating
  top-left overlay (mono rust kicker → big serif title → hairline rule → italic
  blurb with taxa count + the `ltree` line) and a top-right mono hint block. The
  overlay wrapper is `pointer-events-none` so the canvas pans beneath it.
- **Phase 4 — Side panel (`SidePanel`).** The per-node inspector became one
  parchment `--card` detail card: kicker → serif name → italic scientific sub →
  hairline key/value rows → hairline operator sections (rust method chip + faint
  mono SQL) → mono `ltree`-path breadcrumb footer. One soft shadow, no nested
  halos. Slide-in via the `panelIn` keyframe.
- **Phase 5 — Operator-showcase aside + polish + teardown (this phase).** The
  aside became one parchment `bg-sidebar` surface (mono section-label header →
  hairline-separated control sections — no boxy `Card`s). The six `Controls/*`
  were restyled to the shared idioms (mono section labels, hairline separators,
  the rust operator-tag chip, restrained inputs/buttons); the `OperatorLegend`
  active state is now rust. Stock `Badge`/`Card` chips were removed from the
  controls. Added the `overlayRise` keyframe for the floating chrome, deleted the
  inspiration folder, and updated the README.

## Token & keyframe inventory (final)

All in `src/styles/app.css`.

- **Fonts:** `--font-sans` / `--font-heading` → EB Garamond; `--font-mono` →
  Spline Sans Mono (mapped into the Tailwind theme so `font-mono` resolves).
- **Palette (light + dark):** `--background`, `--foreground`, `--card`,
  `--popover`, `--primary`, `--secondary`, `--muted` / `--muted-foreground`,
  `--accent`, `--destructive`, `--border`, `--input`, `--ring`, the `--sidebar-*`
  set, and `::selection`.
- **Canvas chrome:** `--canvas-radial` (gradient), `--canvas-link`,
  `--canvas-axis`, `--canvas-divider`.
- **Showcase highlights:** `--lineage` / `--subtree` / `--mrca` / `--search` /
  `--slice` / `--graft` (+ `-foreground`). Names unchanged — the canvas
  highlight folding and the legend read them.
- **Keyframes:** `panelIn` (Phase 4, side panel slide-in) and `overlayRise`
  (Phase 5, floating title + corner hint settle). Both `motion-safe`, CSS-only,
  applied to distinct elements — never doubled up.

## Where things live

- **Canvas:** `src/components/TreeCanvas.tsx`, `src/components/TaxonNode.tsx`,
  `src/lib/nodes.ts` (edge/node geometry). Bottom-right zoom/fit in
  `CanvasControls` (inside `TreeCanvas`).
- **Overlay chrome + aside:** `src/routes/index.tsx` (floating title overlay,
  corner hint, and the operator-showcase aside).
- **Side panel:** `src/components/SidePanel.tsx`.
- **Aside controls:** `src/components/Controls/*` (`LineageControls`,
  `MrcaControls`, `SearchControls`, `SliceControls`, `GraftControls`,
  `OperatorLegend`) sharing `src/components/Controls/primitives.tsx`
  (`ControlSection`, `OperatorTag`, `controlInputClass`, `resultBlockClass`).

## Spec §5 acceptance criteria — all met

- [x] EB Garamond + Spline Sans Mono load and render; Geist removed.
- [x] Parchment palette applied via tokens; light **and** dark mode coherent.
- [x] Canvas reads as a hairline dendrogram: orthogonal links, diamond clades vs.
      circular tips, radial paper background, faint axis treatment.
- [x] Floating title overlay + corner hint + minimal zoom/fit controls replace
      the header bar.
- [x] Side panel restyled to the kicker → serif name → italic sub → hairline rows
      → breadcrumb detail card.
- [x] Operator-showcase controls restyled to match (mono labels, hairline groups,
      rust active states); behavior + the `ltree` query each fires are unchanged.
- [x] All operator showcases still work end-to-end (lineage, subtree, MRCA,
      search, slice, graft). `vp check`, `vp run typecheck`, `vp test` (44 passing),
      and `vp run build` green.
- [x] Responsive at 1440 / 1024 / 768 / 320 (aside is `lg:block` — hidden below
      `lg`, matching Phases 1–4; the canvas + overlay carry small breakpoints).
      Keyboard-navigable; `focus-visible` rings on inputs, buttons, and recenter
      crumbs; contrast holds for body copy.
- [x] Inspiration folder (`examples/Elegant ape phylogenetic tree/`) removed; no
      code, README, or config references it.

## Verification note

No Chrome DevTools MCP was configured in this environment (as in Phases 3 & 4),
so the Phase 5 browser pass was the same boot-and-serve check: `vp dev` serves
`/` with HTTP 200, the `app.css` module includes both `panelIn` and `overlayRise`
keyframes, all restyled component modules compile (200 in the module graph), and
the dev log is error-free. The route is client-hydrated, so overlay/panel/aside
text is not in the raw SSR HTML — that is expected. A full pointer-driven canvas
walkthrough (clicking nodes, firing each operator visually) was not scriptable
here; the behavior is covered by the unchanged DB-backed test suite.
