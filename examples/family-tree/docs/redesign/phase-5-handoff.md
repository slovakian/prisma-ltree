# Handoff → Phase 5: Operator showcase aside + polish + teardown (final)

You are the agent picking up **Phase 5**, the **final** phase of the Tree-of-Life
visual redesign. Phase 1 (tokens + fonts), Phase 2 (hairline dendrogram canvas +
diamond/portrait nodes), Phase 3 (floating title overlay + corner hint chrome),
and Phase 4 (side-panel detail card) are **done and committed**. Read these
first, in order:

1. [`redesign-spec.md`](./redesign-spec.md) — the target feel, palette, type, and
   hard constraints. Your load-bearing sections: **§3.1 (type moves)**, **§3.2
   (palette; conservation-status dots)**, **§3.3 (hairlines over shadows;
   restrained radii)**, **§3.4 (chrome — note the bottom-right zoom/fit controls
   were done in Phase 2's `CanvasControls`)**, **§4 (constraints)**, and **§5
   (acceptance criteria — you close these out)**.
2. [`redesign-plan.md`](./redesign-plan.md) — your phase is **Phase 5**; it is the
   last one. There is **no further handoff** — when done you write a short
   `redesign-done.md` summary instead (see "When done").
3. Inspiration (look, don't copy): `examples/Elegant ape phylogenetic tree/Ape
Phylogeny.dc.html` — mono section labels, hairline group separators, rust
   active states on the controls. **You delete this folder in this phase** once
   nothing references it (`grep -ri "Elegant ape"` the repo first).

Before starting: load the `frontend-ui-engineering` skill, and add
`browser-testing-with-devtools` for visual verification **if a Chrome DevTools
MCP is configured** (see "Verify" caveat below). Run the project skill check from
the repo root per the root `CLAUDE.md` if you touch tooling.

## What Phases 1–4 left you (use these — don't re-roll)

All tokens live in `src/styles/app.css`; consume via Tailwind utilities or
`var(--token)`. Type/palette foundation from Phase 1 is unchanged.

- **Type:** body/headings render EB Garamond (`font-sans`/`font-heading`);
  `font-mono` resolves to **Spline Sans Mono**. The established **kicker idiom** is
  `font-mono` + uppercase + `tracking-[0.14em]`–`tracking-[0.26em]` +
  `text-primary` (rust). **Mono section-label idiom** (introduced in Phase 4's
  panel for sub-headers): `font-mono text-[10px] uppercase tracking-[0.18em]
text-muted-foreground`. Reuse this for the aside heading + each `Controls/*`
  group label so the aside matches the panel.
- **Palette:** parchment `--background`, ink `--foreground`, rust `--primary`,
  `--card`/`--popover` panel surface, hairline `--border`, `--muted-foreground`.
  Dark mode is re-tuned walnut+rust — keep it working.
- **Highlight tokens** (`--lineage`/`--subtree`/`--mrca`/`--search`/`--slice`/
  `--graft` + `-foreground`) are unchanged and still drive the legend/highlight.
  Re-tuning their hues into one harmonious parchment scheme is **still open** if
  you want it for the legend chips — but keep the token **names** (the canvas
  highlight folding and `OperatorLegend` both read them).
- **Operator-tag idiom** (Phase 4, panel): a rust method chip + faint mono SQL —
  `<span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5
font-mono text-[0.7rem] text-primary">{method}</span>` next to `<code
className="font-mono text-[0.7rem] text-muted-foreground">{sql}</code>`. If any
  `Controls/*` panel shows an operator name + SQL, match this so the aside and the
  panel read as one system. **Don't** re-introduce stock `Badge variant=...` chips
  (Phase 4 removed them from the panel).
- **Conservation-status dots** (spec §3.2): still **not wired** — `TaxonRow`
  (`src/server/taxonomy.ts`) carries **no status field** (only
  `extinct`/`maOrigin`/`maExtinct`). Phase 4 used an `Extant`/`Extinct` status row
  and a `Range` era row instead. **Don't invent a status field**; if you want
  IUCN dots you'd have to add real data + a migration, which is **out of scope**
  (spec §6). Leave the extinct/extant treatment.

### What Phase 4 changed (so your aside restyle stays consistent)

- **`src/components/SidePanel.tsx` is fully restyled** — kicker → serif name →
  italic scientific sub → hairline key/value rows → hairline operator sections →
  mono `ltree`-path breadcrumb footer. It is now **one parchment `--card` surface**
  (`bg-card/95 backdrop-blur`, `rounded-md`, **one** soft shadow
  `shadow-[0_12px_40px_rgba(60,44,28,0.18)]`, no nested cards/halos). **Panel
  geometry is unchanged from Phase 3:** `absolute top-3 right-3 bottom-3 z-10`,
  `w-[22rem] max-w-[calc(100%-1.5rem)]`. z-index stayed at `z-10` (≥ the overlay,
  so the corner hint never bleeds through). It still sits clear of the
  bottom-right `CanvasControls`. **You don't need to touch the panel** — it's done;
  just match its visual language in the aside.
- **Panel motion was added** in Phase 4: a `@keyframes panelIn` (defined at the
  **end of `src/styles/app.css`**) applied via
  `motion-safe:animate-[panelIn_0.28s_cubic-bezier(0.2,0.7,0.2,1)]`. **Your polish
  pass must not double this up** — if you add aside/overlay transitions, give them
  their own keyframes or reuse `panelIn` deliberately; don't re-apply `panelIn` to
  the panel or wrap it in a second animation.
- Phase 4 touched **only** `SidePanel.tsx` + `app.css` (the keyframe). No data,
  query, `TreeCanvas`/`TaxonNode`, `routes/index.tsx` chrome, or `Controls/*`
  changes — those last two are partly **yours** this phase (aside heading +
  controls).

### Where things live (so your restyle doesn't collide)

- **The aside** is in `routes/index.tsx` (`<aside className="hidden w-80 shrink-0
… border-l bg-sidebar p-4 lg:block">` around line 167). Its heading is the
  stock `<h2 className="text-xs font-semibold uppercase tracking-wide
text-muted-foreground">Operator showcase</h2>` — restyle it to the mono
  section-label idiom. **Only touch the aside** in `index.tsx`; the floating title
  overlay + corner hint (Phase 3) and the canvas mount are **done — leave them**.
- **`Controls/*`** (6 files): `LineageControls`, `MrcaControls`, `SearchControls`,
  `SliceControls`, `GraftControls`, `OperatorLegend`. These are **yours** — restyle
  to mono labels, hairline group separators, rust active states, restrained
  inputs/buttons. **Every control keeps its exact behavior and the `ltree` query
  it fires.**
- **Shared `ui/*` primitives** may be restyled lightly or wrapped — but they're
  shared, so prefer per-call-site Tailwind overrides unless a token-level change is
  cleaner. Don't churn primitives the panel/canvas already depend on without
  re-checking them.
- **Don't touch** `TreeCanvas`/`TaxonNode`/`CanvasControls` (Phase 2 canvas
  chrome, done) or `SidePanel` (Phase 4, done).

## Your job (Phase 5 — the whole rest)

1. **Aside + `Controls/*` restyle** (spec §3.4 / plan Phase 5): mono section
   labels, hairline group separators, rust active states, restrained
   inputs/buttons. Match the panel/overlay language. Behavior + queries unchanged.
2. **Polish pass:** motion (aside/overlay transitions — don't double-up `panelIn`),
   dark-mode coherence, `focus-visible` rings, contrast check (≥ 4.5:1 body),
   responsive 320 / 768 / 1024 / 1440. Note the aside is `lg:block` (hidden below
   `lg`) — confirm the controls are still reachable on smaller breakpoints or that
   their absence is intentional (check how Phase 1–4 handled mobile controls).
3. **Teardown:** `grep -ri "Elegant ape"` the repo; once nothing references it,
   **delete** `examples/Elegant ape phylogenetic tree/` (it's untracked — `rm -rf`,
   it won't show in `git`).
4. **README:** update `examples/family-tree/README.md` screenshots/description if
   they describe the old (Geist/header-bar/boxy) look.
5. Close out **all** spec §5 acceptance criteria.

## Constraints

- Every operator control keeps its exact behavior and the `ltree` query it fires.
- React Flow stays the engine; pan/zoom/fit/`focusNode`/highlight folding all
  preserved.
- Client-only canvas mount + server skeleton stays (hydration-safe).
- Token **names** must not change. No new deps (no animation libs — CSS keyframes
  only). Don't invent data fields that aren't in `TaxonRow`.
- `KNOWN_LIMITATIONS.md` invariants and existing tests keep passing.

## Environment note (read this — it has cost prior phases time)

The server tests (`test/server/taxonomy.test.ts`) need a **running, seeded
Postgres**. If `vp test` shows `42P01` / connection errors, the DB is down or
empty. Bring it up before testing (this Mac uses **OrbStack** as the Docker
daemon):

```
open -a OrbStack            # Docker daemon
pnpm db:up                  # start postgres
pnpm emit && pnpm db:plan && pnpm db:init && pnpm seed   # if tables are missing
```

**Important:** `pnpm emit` / `pnpm db:init` regenerate `migrations/**` and
`src/prisma/contract.*`. Those are **out of scope** — if you run setup, `git
checkout --` those generated files before committing so your diff stays clean.
`vp test` prints a harmless `close timed out after 10000ms` teardown warning and a
stray `module is not defined` line after `Tests … passed` — both are pre-existing
noise; ignore them as long as the test count is green (**Phase 4 saw 44 passing**,
same as Phase 3).

## Verify before you finish

- [ ] `vp check` green (format + lint). Run `vp run typecheck` **separately** for
      tsc (note: `vp check` on this package runs format + lint only).
- [ ] `vp test` green (DB up + seeded; **44 passing** as of Phase 4).
- [ ] `vp run ready` green (full validation incl. `check-pins`).
- [ ] Browser (`vp dev`): full operator walkthrough — lineage, subtree, MRCA,
      search, slice, graft all fire the same `ltree` queries; node click opens the
      Phase 4 panel; legend/reset and the `lca()` MRCA picker work.
- [ ] Aside + controls read in the redesign language (mono labels, hairline
      groups, rust active states); consistent with the panel and overlay.
- [ ] Light **and** dark mode both coherent; focus-visible rings; contrast ≥ 4.5:1
      body; responsive 1440 / 1024 / 768 / 320.
- [ ] Inspiration folder deleted; nothing references it; README matches the new look.

> **Visual-verification caveat:** Phases 3 **and 4** had **no Chrome DevTools MCP**
> available, so their browser pass was limited to booting `vp dev`, confirming the
> route serves 200 with CSS loaded (incl. the `panelIn` keyframe) and no
> compile/runtime errors in the dev log — they could **not** screenshot or drive
> the canvas/panel. (The route is client-hydrated, so overlay/panel/aside text is
> **not** in the raw SSR HTML — `curl` won't show it; that's expected, not a bug.)
> If your environment also lacks the MCP, say so in your summary and do the same
> boot-and-serve check rather than claiming a visual pass you couldn't run.

## When done (final phase — no further handoff)

1. Commit (branch `example/family-tree`): `style(family-tree): redesign Phase 5 —
operator-showcase aside + polish + teardown`. The inspiration-folder removal can
   share this commit or be its own `chore(family-tree): remove redesign
inspiration folder` — your call.
2. Write `docs/redesign/redesign-done.md`: a short summary of the finished
   redesign (what each phase delivered, final token/keyframe inventory, where the
   panel/aside/canvas/overlay live, and confirmation that all spec §5 acceptance
   criteria are met). This replaces the per-phase handoff.
3. Leave the working tree clean.
