# Handoff → Phase 1: Design Foundation (tokens + fonts)

You are the agent picking up **Phase 1** of the Tree-of-Life visual redesign.
Read these first, in order:

1. [`redesign-spec.md`](./redesign-spec.md) — the target feel, palette, type, and
   hard constraints. §3 (design language) and §4 (constraints) are load-bearing.
2. [`redesign-plan.md`](./redesign-plan.md) — your phase is **Phase 1**; skim the
   later phases so you don't do their work.
3. Inspiration (look, don't copy): `examples/Elegant ape phylogenetic tree/Ape
Phylogeny.dc.html` — note the EB Garamond + Spline Sans Mono pairing and the
   parchment hexes. **Do not** depend on this folder; it's deleted in Phase 5.

Before starting: load the `frontend-ui-engineering` skill. Run the project skill
check from the repo root per the root `CLAUDE.md` if you touch tooling.

## Your job (and only this)

Make the design system parchment + serif/mono. **No** component restructuring,
**no** layout changes — components inherit the new look through tokens. Two files:

### 1. `package.json`

- Remove `@fontsource-variable/geist`.
- Add `@fontsource-variable/eb-garamond` and `@fontsource-variable/spline-sans-mono`.
- Run `vp install` (or `pnpm install`) so the lockfile updates.

### 2. `src/styles/app.css`

- Swap the font import line(s): drop geist, import the two new fontsource packages.
- `@theme inline`: set `--font-sans` and `--font-heading` to `"EB Garamond
Variable", Georgia, serif`; add `--font-mono` → `"Spline Sans Mono Variable",
ui-monospace, monospace` (so the Tailwind `font-mono` utility resolves to it).
- Re-anchor the `:root` palette to spec §3.2 — convert these hex anchors to OKLCH,
  **keeping the existing token names**:
  - `--background` ← `#f3ede1`, `--foreground` ← `#2e2a22`
  - `--primary` ← `#a2542f`, `--primary-foreground` ← near-paper
  - `--card` / `--popover` ← `#faf6ec`
  - `--muted-foreground` ← `#9a8f7c`, `--border` / `--input` ← `#ddceb0`
  - `--secondary` / `--accent` ← warm sand a step off paper
  - keep `--ring` a rust-adjacent hue
- Add `::selection { background: #e7d4c5; }` (or token) in `@layer base`.
- Add radial-canvas-background variables for Phase 2 to consume, e.g.
  `--canvas-radial: radial-gradient(120% 120% at 30% 10%, #f6f1e6 0%, #efe8da 70%,
#e9e1d0 100%);` (declare now; Phase 2 wires it onto the canvas).
- Re-tune the `.dark` block to the same hue family (walnut brown + rust). Keep
  dark mode working — do not delete it.
- The showcase highlight tokens (`--lineage`, `--subtree`, `--mrca`, `--search`,
  `--slice`, `--graft`) can stay as-is for now; Phase 2/4 re-map them against the
  new palette. Don't remove them.

## Constraints

- Token **names** must not change (components reference them).
- No functional change. No new deps besides the two font packages.
- Don't touch `TreeCanvas`, `TaxonNode`, `SidePanel`, `Controls/*`, or routes.

## Verify before you hand off

- [ ] `vp check` green (format, lint, typecheck).
- [ ] `vp test` green.
- [ ] App boots (`vp dev`); body copy renders in EB Garamond; an element with the
      `font-mono` utility renders in Spline Sans Mono; no Geist remains.
- [ ] Light and dark mode both look coherent (toggle if there's a switch; else
      verify `.dark` values by eye in the CSS).
- [ ] Quick visual smoke (browser): the app is now warm parchment, not white;
      nothing is broken or unstyled.

## When done

1. Commit (branch `example/family-tree`): `style(family-tree): redesign Phase 1 —
parchment tokens + Garamond/Spline type foundation`.
2. Write `docs/redesign/phase-2-handoff.md` using **this file's structure**,
   pointing the next agent at Phase 2 (canvas) in the plan. Note anything you
   discovered that affects Phase 2 (e.g. exact token names, the radial variable
   name you chose, any font-weight quirks).
3. Leave the working tree clean.
