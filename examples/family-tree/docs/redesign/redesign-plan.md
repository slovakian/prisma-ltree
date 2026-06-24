# Tree-of-Life Redesign — Phased Plan

Companion to [`redesign-spec.md`](./redesign-spec.md). Each phase is one agent's
turn. At the end of a phase, the agent writes the **next** phase's handoff doc
(`phase-N-handoff.md`) following the same format, runs `vp check` + `vp test`, and
commits. Agents take turns from there.

**Sequencing rule:** phases are ordered by dependency. Phase 1 (foundation)
unblocks everything; do not start a later phase before its predecessor lands,
because they share the token + font layer.

**Per-phase skills:** load `frontend-ui-engineering` for all phases. Add
`browser-testing-with-devtools` for visual verification (Phases 2–5). Use
`code-simplification` before committing if a phase grew complex.

---

## Phase 1 — Design foundation (tokens + fonts)

**Goal:** the bedrock every other phase paints on. No layout or component
restructuring yet — just make the design system parchment + serif/mono.

- Add `@fontsource-variable/eb-garamond` + `@fontsource-variable/spline-sans-mono`
  to `package.json`; import in `src/styles/app.css`. Remove `@fontsource-variable/geist`.
- In `app.css`: set `--font-sans`/`--font-heading` to EB Garamond; add
  `--font-mono` → Spline Sans Mono (and a Tailwind `--font-mono` theme mapping so
  `font-mono` utility resolves to it).
- Re-anchor the `:root` and `.dark` token palettes to §3.2 (paper, ink, rust,
  card, hairline border, muted). Convert hex anchors to OKLCH; keep token names.
- Add `::selection` color and the radial canvas-background variables.
- **Verify:** `vp check` + `vp test` green; app boots; text renders in Garamond,
  any existing `font-mono` renders in Spline Sans Mono; no functional change.

**Touches:** `package.json`, `src/styles/app.css`. (Components unchanged — they
inherit via tokens.) **Handoff out:** `phase-2-handoff.md`.

---

## Phase 2 — The canvas (TreeCanvas + TaxonNode)

**Goal:** the dendrogram reads as a hairline natural-history plate.

- `TreeCanvas.tsx`: switch edge `type` to `step` (sharp orthogonal); link stroke
  `#cabd9f` hairline; active lineage = rust, heavier. Replace the dotted
  `<Background>` with the radial cream gradient (CSS on the wrapper, or a subtle
  `Background` variant). Restyle/replace `<Controls>` to minimal `+ / − / FIT`.
- `TaxonNode.tsx`: leaf tips = circular portrait + serif common name + italic mono
  sci-name (drop the `Badge` rank pill or render it as a mono kicker). Internal
  clade nodes = small rotated-square (diamond) marker with a mono uppercase clade
  label. Replace card halo with hairline/none. Keep highlight ring states but
  re-map to the new palette (rust selection, etc.).
- Keep node dimensions / handles / `nodeTypes` identity / highlight folding intact.
- **Verify (browser):** pan/zoom/fit work; clicking a node still opens the panel
  and paints lineage/subtree; highlights legible; 320–1440 widths OK.

**Touches:** `TreeCanvas.tsx`, `TaxonNode.tsx`, maybe `lib/nodes.ts` (edge type),
small CSS. **Handoff out:** `phase-3-handoff.md`.

---

## Phase 3 — Title overlay + chrome

**Goal:** replace the header bar with floating overlay chrome.

- `routes/index.tsx`: remove the `<header>` bar. Add an absolutely-positioned
  title overlay over the canvas section (mono rust kicker → big serif title →
  hairline rule → italic blurb with taxa count + the `ltree` line). Add the
  top-right mono hint block (pan / zoom / click). Ensure overlays are
  `pointer-events:none` except interactive bits, and don't block canvas drag.
- Confirm the bottom-right zoom/fit controls (from Phase 2) sit correctly with
  the overlay. Mobile: overlay collapses gracefully (don't cover the canvas).
- **Verify (browser):** overlay doesn't trap pointer events; canvas still pans
  under it; responsive at 768/320.

**Touches:** `routes/index.tsx`, small CSS. **Handoff out:** `phase-4-handoff.md`.

---

## Phase 4 — Side panel (detail card)

**Goal:** the selected-taxon panel becomes the elegant detail card.

- `SidePanel.tsx`: kicker (mono uppercase rust, e.g. rank · parent) → serif name →
  italic sci-name sub → hairline divider → mono key / serif value rows (range,
  lineage depth, subtree size, etc., from existing `lineage`/`subtree` props) →
  blurb → hairline → mono breadcrumb of the ltree path. Slide-in animation
  (`apePanelIn`-style) on the panel. Keep the close + recenter affordances and
  the operator stack the panel currently drives.
- Re-map the per-operator accent chips to the new palette.
- **Verify (browser):** open via node click; all rows populate; close + recenter
  work; operator stack unchanged in behavior.

**Touches:** `SidePanel.tsx`, small CSS. **Handoff out:** `phase-5-handoff.md`.

---

## Phase 5 — Operator showcase aside + polish + teardown

**Goal:** finish the controls, harden, verify, remove the inspiration.

- Restyle the `Controls/*` panels (`Lineage`, `Mrca`, `Search`, `Slice`, `Graft`,
  `OperatorLegend`) and the aside heading: mono section labels, hairline group
  separators, rust active states, restrained inputs/buttons (restyle the shared
  `ui/*` primitives or wrap them). Behavior unchanged.
- Polish pass: motion (panel/overlay transitions), dark-mode coherence,
  focus-visible rings, contrast check, responsive 320/768/1024/1440.
- Run `frontend-ui-engineering` verification checklist + a `browser-testing` pass.
- **Delete** `examples/Elegant ape phylogenetic tree/` once nothing references it.
- Update `README.md` screenshots/description if they describe the old look.
- **Verify:** `vp check` + `vp test` + `vp run ready` green; full operator
  walkthrough; a11y checklist clean.

**Touches:** `Controls/*`, `components/ui/*` (light), `routes/index.tsx` (aside),
`README.md`, remove inspiration folder. **Handoff out:** none (final) — write a
short `redesign-done.md` summary instead.

---

## Definition of done (whole effort)

All §5 acceptance criteria in the spec met; inspiration folder gone; tests +
`vp run ready` green; light & dark coherent; no functional regression in any
operator showcase.
