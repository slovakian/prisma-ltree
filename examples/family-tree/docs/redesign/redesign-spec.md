# Tree-of-Life Viewer — Visual Redesign Spec

> **Status:** approved direction, phased delivery.
> **Scope guard:** This is a **redesign**, not a rebuild. Visual + basic UX only.
> **No change** to data, ltree queries, server functions, React Flow engine, or
> the operator-showcase behavior. If a change would alter what a control _does_,
> it is out of scope.

## 1. Why

The viewer is functionally complete but looks generic: Geist sans throughout,
stock shadcn cards/badges/avatars, a plain header bar, boxy control panels. It
reads "AI default," not "sophisticated academic instrument."

## 2. The target feel

A scholarly, print-inspired natural-history plate — the way an academic site on
Darwinian evolution would present a phylogeny. Warm parchment, serif body, mono
for taxonomic apparatus (ranks, scientific names, axis ticks). Quiet, confident,
hairline-thin. Reference artifact: `examples/Elegant ape phylogenetic tree/`
(inspiration only — **do not** copy 1:1; we adapt the _language_, not the markup).

> The inspiration folder is **deleted in the final phase**, once the redesign
> stands on its own. Do not take a runtime dependency on it.

## 3. Design language

### 3.1 Typography

| Role             | Family                     | Usage                                                                                                                       |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Serif (primary)  | **EB Garamond** (variable) | Headings, common names, body/blurbs. Italic for scientific names + lead paragraphs.                                         |
| Mono (apparatus) | **Spline Sans Mono**       | Kickers, rank labels, axis ticks, breadcrumbs, key/value labels, hint text. Often uppercase, letter-spaced `0.14em–0.26em`. |

Install via fontsource (`@fontsource-variable/eb-garamond`,
`@fontsource-variable/spline-sans-mono`). Geist is removed.

Type moves: mono **kicker** (uppercase, rust) → large serif **name** → hairline
rule → italic serif **blurb**. Scientific names always italic; common/display
names roman.

### 3.2 Color (parchment palette)

Anchor hexes (convert to the existing OKLCH token system in `app.css`; keep token
_names_ so components don't churn):

| Token intent              | Hex anchor            | Notes                                                                  |
| ------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `--background` (paper)    | `#f3ede1`             | Canvas uses a radial cream gradient `#f6f1e6 → #efe8da → #e9e1d0`.     |
| `--foreground` (ink)      | `#2e2a22`             |                                                                        |
| `--primary` (rust accent) | `#a2542f`             | Selection, active operator, lineage path, kickers.                     |
| `--card` / `--popover`    | `#faf6ec`             | Panel + control surfaces.                                              |
| `--muted-foreground`      | `#9a8f7c`             | Labels, secondary text (`#a99e89` for the faintest).                   |
| body secondary            | `#6f6655` / `#574e3f` | Blurbs.                                                                |
| `--border` (hairline)     | `#ddceb0`             | Dividers `#e6d9be`; dendrogram links `#cabd9f`; axis guides `#cfc2a9`. |
| `::selection`             | `#e7d4c5`             |                                                                        |

Conservation-status dots (used in the side panel): `LC #6f7d57`, `NT #9c8a3f`,
`VU #b0823c`, `EN #b06a37`, `CR #9a4528`. (Only wire if the data carries a status
field; otherwise leave the existing extinct/extant treatment.)

**Dark mode:** keep the existing walnut-brown dark variant; re-tune it to the new
palette but do not drop it. The inspiration is light-only; we keep both.

### 3.3 Shape & surface

- **Hairlines over shadows.** 1px warm borders, faint dividers. At most one soft,
  low-opacity shadow on the floating detail panel. Remove the layered card halos.
- **Restrained radii.** Small (`3–5px`), not `rounded-2xl`. No pill-everything.
- **Diamonds vs. circles.** Internal/clade nodes read as small rotated squares
  (diamonds); leaf/taxon tips as circular portraits. (Adapt to React Flow nodes.)
- **Orthogonal links.** Sharp right-angle dendrogram connectors (React Flow
  `step`, not `smoothstep`), hairline weight, link color `#cabd9f`. The active
  lineage path is the rust accent, slightly heavier.

### 3.4 Chrome

- Replace the solid header bar with a **floating title overlay** (top-left):
  mono kicker → big serif title → hairline rule → italic blurb. Keep the taxa
  count and the "every control maps to a real `ltree` query" line.
- **Corner hint** (top-right, mono, uppercase): pan / zoom / click affordances.
- **Minimal zoom/fit controls** (bottom-right): `+`, `−`, `FIT` on the paper
  surface — restyle React Flow's `<Controls>` or replace with custom buttons.
- **Operator showcase aside** and **side panel** restyled to match (see phases).

## 4. Hard constraints (do not break)

1. Every operator control keeps its exact behavior and the `ltree` query it fires.
2. React Flow stays the canvas engine (pan/zoom/fit, `focusNode`, highlight
   folding all preserved).
3. Client-only mount + server skeleton stays (hydration-safe).
4. `KNOWN_LIMITATIONS.md` invariants and existing tests keep passing.
5. No new heavyweight deps beyond the two font packages. No functional libraries.

## 5. Acceptance criteria

- [ ] EB Garamond + Spline Sans Mono load and render; Geist removed.
- [ ] Parchment palette applied via tokens; light **and** dark mode coherent.
- [ ] Canvas reads as a hairline dendrogram: orthogonal links, diamond clades vs.
      circular tips, radial paper background, faint axis/guide treatment.
- [ ] Floating title overlay + corner hint + minimal zoom/fit controls replace the
      header bar.
- [ ] Side panel restyled to the kicker → serif name → italic sub → hairline rows
      → breadcrumb detail card.
- [ ] Operator showcase controls restyled to match (mono labels, hairline groups).
- [ ] All operator showcases still work end-to-end (lineage, subtree, MRCA,
      search, slice, graft). `vp check` + `vp test` green.
- [ ] Responsive at 1440 / 1024 / 768 / 320; keyboard-navigable; no a11y
      regressions (contrast ≥ 4.5:1 body, focus visible).
- [ ] Inspiration folder removed in the final phase.

## 6. Out of scope

- Custom SVG canvas rewrite (decided: restyle React Flow in place).
- New data, new operators, schema/migration changes.
- A time axis driven by real divergence data (the inspiration's `Ma` axis is
  illustrative; only add axis chrome if it can be derived from existing layout).
