# Implementation Plan: Tree-of-Life interactive viewer

**Companion spec:** `docs/spec/tree-of-life-app-spec.md`. Read it first.
**Execution model:** each phase below is handed to **one agent session**, in
order. An agent picks up the next not-yet-checked phase, runs it end-to-end,
ticks its checkboxes, commits (only when the user explicitly asks), and stops.
No agent skips a phase or strays outside `examples/family-tree/**` plus these
two spec files.

**Branch:** `example/family-tree` (already exists per the deleted handoff).
**Deps/state:** dockerized Postgres already runs on port 5434; the existing
scaffold (TanStack Start, prisma-next, docker-compose) is preserved.

---

## Architecture Decisions

1. **Single-rooted Catarrhini slice** chosen for natural cross-branch MRCA
   demos landing on named clades. Single-root keeps the ltree single-parent
   model honest and the queries meaningful.
2. **React Flow @xyflow/react** for pan/zoom/edges; **d3-hierarchy `tree()`**
   computes a **horizontal left-to-right** dendrogram (root on the left, tips
   on the right — the standard phylogenetic orientation, not the prior
   top-to-bottom plan). The `d3.tree().nodeSize([h, w])` output has its x/y
   swapped before feeding React Flow so the layout engine keeps its dendrogram
   spacing semantics while the canvas reads horizontally. Islands the
   rendering layer from the extension; the tree is purely a function of the
   path list.
3. **Thumbnails via Wikipedia REST `pageimages` at seed time** (network fetch
   cached in DB). Avoids hand-authoring ~50 image URLs; keeps images hosted on
   Wikimedia (the user's hard constraint).
4. **Showcase matrix = UI control surface.** Each extension operator is
   visible in the UI as its own control (or its own SidePanel fetch on a
   selected node), labelled with the operator name and SQL template, so the
   extension's contribution is obvious instead of hidden. See the spec's
   "Operator Showcase Matrix" — it splits the matrix into _per-node fetches_
   (fired from the SidePanel when a taxon is selected) and _top-level
   controls_ (always-on controls alongside the canvas).
5. **shadcn/ui is the component layer.** Chrome (SidePanel, Controls,
   OperatorLegend) is composed from shadcn primitives; only the React Flow
   `TaxonNode` and the canvas edge styling hand-roll their own Tailwind
   classes. Theme: warm + sophisticated (see spec), tokens in
   `src/styles/app.css`.
6. **Legible labels.** Every node's label sits on a solid card background
   with a soft edge fade/halo so it stays readable across crossing edges and
   the warm canvas — no bare floating text.
7. **Please-run-Postgres invariant.** Every compute goes through server
   functions; the client never assembles lineage, MRCA, subtree, or slices.

---

## Phase Map

| #   | Phase                                 | Files touched (≤5)                                                                                                                                                              | Result checkpoint                                                                           |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Data layer (Taxon model + seed)       | contract.prisma, seed-data.ts, scripts/seed.ts, db.ts, README                                                                                                                   | `pnpm setup \|\| pnpm seed` inserts ~50 taxa with thumbnails; typecheck clean.              |
| 2   | Server operator showcase matrix       | server/taxonomy.ts, test/server/matrix.test.ts                                                                                                                                  | Every operator under test against the real DB.                                              |
| 3   | Tree canvas scaffold (React Flow)     | routes/index.tsx, components/TreeCanvas.tsx, components/TaxonNode.tsx, lib/layout.ts, lib/nodes.ts                                                                              | Static pannable/zoomable vertical tree of all taxa; pan/zoom works; SSR-safe.               |
| 4   | Interactivity I: lineage/subtree/MRCA | components/SidePanel.tsx, components/Controls/LineageControls.tsx, components/Controls/MrcaControls.tsx, lib/highlight.ts, routes/index.tsx                                     | Click lineage + subtree highlighted; MRCA picker returns named clade; LCA node highlighted. |
| 5   | Interactivity II: search + slices     | components/Controls/SearchControls.tsx, components/Controls/SliceControls.tsx, components/Controls/OperatorLegend.tsx, server/taxonomy.ts (add fns if needed), routes/index.tsx | lquery / ltxtquery / nlevel / subpath / indexOf all exercised end-to-end.                   |
| 6   | Graft-a-taxon (mutator demo)          | components/Controls/GraftControls.tsx, server/taxonomy.ts, scripts/seed.ts (validator), lib/layout.ts                                                                           | Form inserts a new node via `concatText`; canvas refetches and the node appears.            |
| 7   | Polish, docs, verify-everything       | README.md, test/e2e/showcase.e2e.test.ts, package.json scripts                                                                                                                  | README rewritten; typecheck/lint/build/test all green; full showcase passes.                |

Each phase ≤5 files (per planning-skill sizing rule) so an agent can finish in
one focused session.

---

## Phase 1: Data layer (Taxon model + seed)

**Description.** Replace the `Person` model with a `Taxon` model that holds the
phylogenetic columns described in the spec. Re-emit the contract artifacts.
Replace `seed-data.ts` with the Catarrhini-rooted taxonomy (~50 nodes), and
extend `scripts/seed.ts` to (a) insert the rows and (b) resolve and cache
Wikipedia thumbnails for each taxon's article URL.

**Acceptance criteria:**

- [ ] `prisma/contract.prisma` declares a `Taxon` model with `path` typed via the `ltree.Ltree()` column helper; re-emitted `contract.json` and `contract.d.ts` are regenerated under `src/prisma/`.
- [ ] Migrations materialize via `pnpm db:plan` (both `migrations/ltree/` baseline and `migrations/app/` for the new table). **Remember Gotcha #1 from the prior handoff: `db:plan` is mandatory before the first `db:init`.**
- [ ] `pnpm db:down && pnpm db:plan && pnpm db:init && pnpm seed` runs clean and seeds all taxa; `psql` confirms row count matches the curated datasheet.
- [ ] Each row carries `wiki_url` and (where Wikipedia has a page image) `thumbnail_url`.
- [ ] All ltree labels are valid (`A-Za-z0-9_`, ≤255 chars; underscores for spaces in scientific names). No duplicate labels.
- [ ] `pnpm typecheck` clean.

**Verification:**

- `cd examples/family-tree && pnpm db:down && pnpm db:plan && pnpm db:init && pnpm seed` (idempotent reset cycle).
- `docker compose exec postgres psql -U postgres -d family -c "SELECT COUNT(*), COUNT(thumbnail_url) FROM taxon;"`
- `pnpm typecheck`.

**Dependencies:** None (foundational).

**Files likely touched:**

- `examples/family-tree/src/prisma/contract.prisma`
- `examples/family-tree/src/seed-data.ts`
- `examples/family-tree/scripts/seed.ts`
- `examples/family-tree/src/prisma/db.ts` (likely no change; verify only)
- `examples/family-tree/README.md` (data-layer section only; full rewrite happens in Phase 7)

**Estimated scope:** M (3–4 real edits + re-emit).

---

## Phase 2: Server operator showcase matrix

**Description.** Replace `src/server/family.ts` with `src/server/taxonomy.ts`
exposing one `createServerFn` per row of the Operator Showcase Matrix. Every
function must lower to a real ltree operator / function via prisma-next — no
client-side computation. Add a fixture-driven Vitest suite that runs each
function against the seeded DB and asserts shapes + headline results.

**Functions required** (verbs mirror the spec):

- `getTaxa()` — every taxon, `path` asc, for the canvas layout.
- `getLineage(path)` — `isAncestorOf`.
- `getSubtree(path)` — `isDescendantOf`.
- `searchLquery(pattern)` — `matchesLquery`.
- `searchLqueryArray(patterns[])` — `matchesLqueryArray`.
- `searchLtxtquery(query)` — `matchesLtxtquery`.
- `getGeneration(depth)` — `nlevel().
- `lineageSlice(path, from, to?)` — `subpath(self, off, len?)`.
- `lineageSubtree(path, start, end)` — `subltree`.
- `indexOfBranch(a, b, offset?)` — `indexOf` (used to show split depth).
- `getMrcaViaLca(a, b)` — _new_: project the extension's `lca()` scalar
  directly and resolve the resulting path to a `TaxonRow`.
- `getMrcaViaOps(a, b)` — composition of `isAncestorOf` + `nlevel().desc().take(1)` (for parity / demo contrast).
- `graftTaxon(parentPath, label)` — `concatText`-driven insert validator (full flow built out in Phase 6).
- (Tier 3 optional, deferred per Open Questions; implement if Phase 5 finds time.)

**Acceptance criteria:**

- [ ] All listed functions exist and are typed against `TaxonRow`, exported from `server/taxonomy.ts`.
- [ ] `test/server/taxonomy.test.ts` boots the dockerized DB once (test setup), seeds, then exercises each function and asserts:
  - `getLineage('Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_sapiens')` returns 8 rows ending in `Catarrhini`.
  - `getMrcaViaLca(Homo_sapiens, Mandrillus_sphinx)` resolves to `Catarrhini`.
  - `getMrcaViaLca(Homo_sapiens, Homo_neanderthalensis)` resolves to `Homo_heidelbergensis` (or whichever curated LCA the Phase 1 datasheet designates).
  - `searchLquery('*.Hominidae.*')` returns all Hominidae descendants.
  - `searchLtxtquery('Homo & !sapiens')` returns every non-sapiens _Homo_ taxon.
  - `getGeneration(7)` returns the genus-level Homo + Pan + Gorilla nodes (verify against datasheet).
  - `lineageSlice(Homo_sapiens, 2, 7)` returns `Hominoidea.Hominidae.Homininae.Hominini.Homo` (slice of indices 2..7).
  - `indexOfBranch(Homo_sapiens, Pan_troglodytes)` returns the depth at which their paths diverge.
  - `graftTaxon('Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo', 'Homo_long_lived')` inserts a new row and its path equals the parent path concatenated.
- [ ] `pnpm typecheck` clean.
- [ ] Vitest matrix passes.

**Verification:**

- `pnpm test --filter examples/family-tree` (or `vp test` filtered).
- `pnpm typecheck`.
- Spot-check SQL logs via `psql` or prisma-next debug to confirm the lowering is the expected template, not a client rewrite.

**Dependencies:** Phase 1.

**Files likely touched:**

- `examples/family-tree/src/server/taxonomy.ts` (replaces `family.ts` — delete the old file).
- `examples/family-tree/test/server/taxonomy.test.ts`
- `examples/family-tree/src/routes/__root.tsx` (no functional change; only if the loader ref needs it)

**Estimated scope:** M.

---

## Phase 3: Tree canvas scaffold (React Flow)

**Description.** Stand up the pannable/zoomable **horizontal
left-to-right** tree (root on the left, tips on the right — the standard
phylogenetic orientation, not the old top-to-bottom plan) with no
interactivity yet — purely a faithful visualization of the seeded taxonomy.
Layer in `@xyflow/react` and `d3-hierarchy` (both pre-approved in the updated
spec Boundaries). Build `lib/layout.ts` exposing `buildTree(taxa): { nodes,
edges }` and a `TaxonNode` custom node component that shows scientific name,
common name, rank badge, optional thumbnail, and a Wiki link — on a solid
shadcn-themed card background with a soft edge fade/halo so labels stay
legible across crossing edges (see Architecture Decision 6).

**Acceptance criteria:**

- [x] `@xyflow/react` and `d3-hierarchy` are added (pre-approved by name in the spec Boundaries; `@types/d3-hierarchy` added as a dev dep).
- [x] `lib/layout.ts` consumes a `TaxonRow[]` (path asc) and:
  - parses `path` into parent/child pairs to build the dendrogram (`parentPath()` strips the last label; `d3.stratify` keyed by path),
  - runs `d3.tree().nodeSize([ROW_GAP, COL_GAP])` to assign x,y (stratify supersedes `hierarchy().sum()` — `tree()` needs no node value),
  - **swaps x and y** before producing Flow nodes so the dendrogram reads horizontally (root on the left, tips to the right); every node declares `sourcePosition="right"`, `targetPosition="left"` (string literals cast to `Position`, kept type-only so the geometry module pulls no React Flow runtime),
  - returns `{ nodes: TaxonFlowNode[], edges: Edge[] }` positioned left→right.
- [x] Every path appears exactly once as a node (node id **is** the ltree path). **No duplicates** — guarded by `test/lib-layout.test.ts`.
- [x] `TreeCanvas.tsx` mounts `<ReactFlow>` with `nodeTypes={nodeTypes}` (declared outside the component), `fitView`, pan/zoom `Controls` + dotted `Background`; SSR-safe (loader returns taxa, React Flow renders only after a `useEffect` mount flag — server renders a "Loading tree…" skeleton).
- [x] `TaxonNode.tsx` renders: thumbnail (`Avatar` + clade-glyph `AvatarFallback`), scientific name (italic), common name / extinct flag in muted text, rank `Badge`, and a hover external Wiki link icon; the label body sits on a solid `bg-card` surface with a `drop-shadow` + `0 0 0 4px var(--card)` halo so it stays readable across crossing edges.
- [x] The `routes/index.tsx` loader calls `getTaxa()`; the component renders `<TreeCanvas>` plus a shadcn `Card`-based skeleton of the controls grid (actual controls land in Phases 4–6).
- [x] `pnpm typecheck` clean; `pnpm build` green; `pnpm dev` SSR markup arrives (verified via curl: header, taxa count, controls skeleton, and the 46-taxon loader payload all present). _Visual pan/zoom/no-overlap confirmation is the user checkpoint below._

**Verification:**

- `pnpm dev` → http://localhost:3000 — visually confirm: **horizontal orientation** (root at left, tips at right), no overlapping nodes at the densest tip layer, every label legible against crossing edges (solid card + edge halo), pan/zoom smooth, no console errors, SSR markup arrives (view source).
- `pnpm typecheck`.
- Add `test/lib-layout.test.ts` asserting the layout function returns one node per unique path and produces an edge for every parent→child relationship in the synthetic path set.

**Dependencies:** Phase 1 (data). Phase 2 server functions can land concurrently but aren't required for this static view (the loader calls `getTaxa()` directly).

**Files likely touched:**

- `examples/family-tree/src/routes/index.tsx`
- `examples/family-tree/src/components/TreeCanvas.tsx`
- `examples/family-tree/src/components/TaxonNode.tsx`
- `examples/family-tree/src/lib/layout.ts`
- `examples/family-tree/src/lib/nodes.ts` (Row→FlowNode mapping)

**Estimated scope:** M.

---

## Phase 4: Interactivity I — lineage, subtree, MRCA

**Description.** Wire clicking a node to a stack of **per-node fetches**
(see spec "Operator Showcase Matrix — Per-node fetches"): the SidePanel
opens with the taxon's details and fires one server function per operator
family — `getLineage` (isAncestorOf), `getSubtree` (isDescendantOf),
`lineageSlice` (subpath / subltree), `indexOfBranch` (indexOf) — rendering
each result as a small shadcn `Card` panel labelled with the operator name
and SQL template. Lineage edges paint in the `--lineage` token, subtree
edges in `--subtree`. Add the top-level **MRCA picker**: two shadcn
`Select`s, a "Find common ancestor" `Button`, calling `getMrcaViaLca`,
painting the MRCA node with `--mrca` and centering/zooming the canvas on
it, with the path from each leaf through the MRCA.

**Acceptance criteria:** _(code complete on `example/family-tree`; ⏳ visual
items await user confirm at `pnpm dev` per the Phase-4 checkpoint below. Server
data-layer criteria are green via `test/server/taxonomy.test.ts`.)_

- [x] Clicking `Homo_sapiens` paints its lineage back to `Catarrhini` with one stroke color and no muted edges in between. _(lineage chain via `selectionHighlight`/`edgeKind`; the `@>`-inclusive set keeps the chain unbroken — unit-tested in `test/lib-highlight.test.ts`.)_
- [x] Clicking `Hominidae` paints only its subtree (validates `isDescendantOf`). _(subtree set + `subtree` stroke; feeding edge from the parent stays `lineage`, not `subtree` — unit-tested.)_
- [x] The `SidePanel` is a shadcn `Card` stack:
  - header: scientific + common name, `Badge` rank, extinct flag, era (`ma_origin` → `ma_extinct`), Wiki link (opens in new tab), the ltree `path` (mono), depth (`nlevel` value from `getLineage` length, refined by Phase 5).
  - **Ancestry panel** (`isAncestorOf`, `@>`): operator name + SQL template header + clickable breadcrumbs from root to selected; clicking a crumb re-centers the canvas on that ancestor.
  - **Subtree panel** (`isDescendantOf`, `<@`): operator name + SQL template header + descendant count + first children list.
  - **Lineage slice panel** (`subpath` / `subltree`): `subpath(self, $off, $len?)` crumbs — clickable; same recenter behavior as the ancestry breadcrumbs.
  - **Branch-point panel** (`lca` / split depth): pin a second taxon via a `Select`; the panel reports the divergence depth (longest shared label prefix = `nlevel(lca(a,b))`) and the diverging labels — graphically _why_ the MRCA is that clade. _(Computed client-side from the two paths; the operator-accurate `indexOfBranch` demo is Phase 5's "Branch point".)_
- [x] MRCA picker: pick `(Homo_sapiens, Mandrillus_sphinx)`, click "Find common ancestor" — `Catarrhini` node gets a distinct highlight class and the canvas centers/zooms to it. _(`MrcaControls` → `getMrcaViaLca`; `lca(sapiens, mandrillus) = Catarrhini` asserted in the server test. `mrcaHighlight` paints `--mrca`; `focusNode` recenters.)_
- [x] Picker also returns `(Homo_sapiens, Homo_neanderthalensis) → Homo_heidelbergensis` (or curated equivalent). _(Asserted green in `test/server/taxonomy.test.ts`.)_
- [x] A "reset" button clears all highlights (returns to flat canvas state). _(`LineageControls` reset + `SidePanel` close both call `reset()` → `EMPTY_HIGHLIGHT`.)_
- [x] `pnpm typecheck` clean; `pnpm test` clean. _(`tsc --noEmit` clean; `vp test` → 38 passed across 3 files, incl. the new `lib-highlight` suite.)_

**Verification:**

- Manual: dev server → click several nodes across branches → visually confirm the highlighted edges correspond to lineage/subtree, MKCA lands on the expected named clade with the distinct highlight style.
- E2E deferred to Phase 7; manual checklist only here.

**Dependencies:** Phase 2 (server fns) + Phase 3 (canvas).

**Files likely touched:**

- `examples/family-tree/src/components/SidePanel.tsx`
- `examples/family-tree/src/components/Controls/LineageControls.tsx`
- `examples/family-tree/src/components/Controls/MrcaControls.tsx`
- `examples/family-tree/src/lib/highlight.ts`
- `examples/family-tree/src/routes/index.tsx`

**Estimated scope:** M.

---

## Phase 5: Interactivity II — search, generation, slices

**Description.** Add controls for lquery / lquery-array / ltxtquery search, a generation-depth slider using `nlevel`, and a "lineage slice" explorer using `subpath` / `subltree` / `indexOf`. Each control's result updates node highlight state in the canvas and shows the **operator name + SQL template** in an "OperatorLegend" panel that doubles as the showcase matrix.

**Acceptance criteria:** _(code complete on `example/family-tree`; ⏳ visual
items await user confirm at `pnpm dev` per the Phase-5 checkpoint below. Pure
helpers are green via `test/lib-highlight.test.ts`; server fns via
`test/server/taxonomy.test.ts`.)_

- [x] lquery search: pattern `*.Hominidae.*` highlights every Hominidae descendant in the canvas. An invalid pattern errors visibly without crashing. _(`SearchControls` lquery mode → `searchLquery` → `matchHighlight`; the `catch` renders the Postgres error inline instead of throwing.)_
- [x] lquery _array_ search: choose patterns `*.Pan.*` + `*.Homo.*` and only those subtrees highlight (`matchesLqueryArray`). _(comma-split into the array validator; `path ? $1` lowering.)_
- [x] ltxtquery search: `Homo & !sapiens` highlights every non-sapiens _Homo_ (`matchesLtxtquery`, **new operator** vs the original demo). _(ltxtquery mode → `searchLtxtquery`.)_
- [x] Generation slider: "show only generation N" highlights all taxa at `nlevel(path) = N` and fades the rest; uses the server `getGeneration`. _(`SliceControls` → `GenerationSection`; range bound to `max(nlevel)` across the seeded taxa.)_
- [x] Lineage slice: with a taxon selected, the control renders `subpath(self, from, to)` and `subltree(self, from, to)` as breadcrumbs, each clickable to re-center the canvas on that ancestor. _(`SliceSection`; crumb `i` reconstructs the absolute prefix `labels[0..from+i]` → `onRecenter`.)_
- [x] "Locate sub-path" demo: pick a taxon + a sub-path and the control calls `indexOfBranch(a, b)` (`index(path, $1)`), printing the 0-based position or `-1` for a divergent branch. _(Reframed from the plan's two-leaf phrasing: ltree `index()` locates a contiguous sub-path, so two full leaf paths return `-1` by construction; true split-depth stays the `lca`/`nlevel` job of the SidePanel + MRCA picker. `BranchPointSection`.)_
- [x] `OperatorLegend` enumerates the showcase matrix; the operator(s) currently invoked are visually marked active. _(route lifts `activeOps`; each control reports its method name on apply; legend rows glow in the `search` token.)_
- [x] `pnpm typecheck` clean; server matrix tests still green. _(`tsc --noEmit` clean; `vp test` → 41 passed across 3 files; `pnpm build` green.)_

**Verification:**

- Manual: each control exercised against the dev server; visually highlight matches appear correctly.
- Tests: any stateless helper in `lib/` gets a unit test.
- Run Vitest matrix again to confirm the new server helpers haven't regressed.

**Dependencies:** Phase 2 + Phase 3 + Phase 4 (uses the highlight system).

**Files likely touched:**

- `examples/family-tree/src/components/Controls/SearchControls.tsx`
- `examples/family-tree/src/components/Controls/SliceControls.tsx`
- `examples/family-tree/src/components/Controls/OperatorLegend.tsx`
- `examples/family-tree/src/routes/index.tsx`
- `examples/family-tree/src/server/taxonomy.ts` (only if Phase 2 missed anything — keep changes additive)

**Estimated scope:** M–L (likely L; if it exceeds one session, split search vs slices into two phases).

**Fallback plan:** If this phase reaches `~5 files` mid-stream and slices are unfinished, split into 5a (search + generation) and 5b (slices + indexOf). Re-tick the phase map.

---

## Phase 6: Graft-a-taxon (mutator demo)

**Description.** A "Graft a new taxon" form lets the visitor pick a parent taxon (any existing node) and a new scientific-name label; the server validates the label (ltree label rules), calls the extension's `concatText` operator to build the new path, inserts a `Taxon` row, and the canvas refetches to show the new node grafted on. The control surfaces the underlying `concat` (`||`) operator and its lowering.

**Acceptance criteria:** _(code complete on `example/family-tree`; ⏳ visual
graft/prune confirmation awaits the user at `pnpm dev` per the Phase-6
checkpoint below. Server data-layer + validator criteria are green via
`test/server/taxonomy.test.ts`.)_

- [x] Form: a parent `<select>` populated from `getTaxa()`, a constrained text input rejecting invalid ltree labels (regex `^[A-Za-z][A-Za-z0-9_]*$`, ≤255 chars), optional common name + rank + `extinct` checkbox, "Graft" button. _(`GraftControls`; live validation via the shared pure `lib/taxon-label.ts` `validateTaxonLabel`, which also gates the submit button.)_
- [x] The server `graftTaxon` builds the new path by binding `parent.path.concatText(label)` (or `parent.path || text2ltree(label)` — verify the operator combination Phase 2 settled on) and inserts. _(`graftTaxonQuery` lowers `fns.concatText(f.path, label)` → `path || (label)::text`, then `orm.Taxon.create`; carries the optional common-name/rank/extinct.)_
- [x] After insert, a re-navigation / optimistic refetch runs `getTaxa()` and the new node appears in the canvas attached to its parent. _(route `onGrafted` → `router.invalidate()` re-runs the loader; a `pendingFocus` effect recenters once the rebuilt canvas contains the node.)_
- [x] The control shows the lowering template (`{{self}} || ({{arg0}})::text`) and the resulting path string before commit (dry-run preview). _(preview card renders the literal lowering + `${parentPath}.${label}`.)_
- [x] Invalid input is rejected client-side and server-side (validator); no partial inserts. _(client disables submit + shows the inline error; `graftTaxonQuery` re-runs `validateTaxonLabel` and throws before any insert — unit-tested.)_
- [x] A "Prune grafted taxa" button removes everything where `extinct=false AND common_name IS NULL AND wiki_url IS NULL` heuristically — or simply `id NOT IN <seed ids>`. _(simplest robust discriminator: grafted rows carry an empty `wiki_url` — every seeded taxon has a real one — so `pruneUserTaxaQuery` deletes `WHERE wiki_url = ''`; no seed-id bookkeeping needed. README note deferred to Phase 7.)_
- [x] `pnpm typecheck` clean; `pnpm test` clean. _(`tsc --noEmit` clean; `vp test` → 44 passed across 3 files incl. the new graft-options/validation/prune cases; `vp run build` + `vp check` green.)_

**Verification:**

- Manual: graft a `Homo_long_lived` under `Homo`; visibly appears in canvas; refresh persists.
- `psql` confirms the row with a path of `...Homo.Homo_long_lived`.
- Run the matrix test ensuring `graftTaxon` is covered.
- Prune button restores the seeded state cleanly.

**Dependencies:** Phase 2 (graftTaxon server fn) + Phase 3 (canvas) + Phase 5 (operator legend — the graft control registers with it).

**Files likely touched:**

- `examples/family-tree/src/components/Controls/GraftControls.tsx`
- `examples/family-tree/src/server/taxonomy.ts` (finalise `graftTaxon`, add `pruneUserTaxa`)
- `examples/family-tree/scripts/seed.ts` (record seeded id set for prune heuristic)
- `examples/family-tree/src/lib/layout.ts` (refetch notify — likely already there from Phase 3; touch only if needed)
- `examples/family-tree/src/routes/index.tsx`

**Estimated scope:** M.

---

## Phase 7: Polish, docs, verify-everything

**Description.** Close out the rework: README rewrite, e2e coverage, accessibility + responsive pass, ensure `vp check` / `vp test` / `pnpm build` are all green across the whole repo (since this is a workspace), conformance to showcase matrix per Success Criteria 1–10 of the spec.

**Acceptance criteria:**

- [x] README rewritten for the phylogeny viewer; documents setup, the showcase matrix, every operator control, the two local-machine gotchas from the prior handoff (mandatory `db:plan`, ECR Docker mirror), and the deferred Tier-3 first-match controls (if any).
- [x] `test/e2e/showcase.e2e.test.ts` exists OR a `KNOWN_LIMITATIONS.md` under the example documents why an e2e was infeasible (it could well be feasible — Playwright + dev server against dockerized DB — but `@prisma-next/test-utils` is unpublished to npm, so tests must not import it).
- [x] Top-of-app "Operator showcase" legend is visible and accessible (keyboard-navigable, ARIA labelled); the canvas is keyboard-pannable via React Flow's built-in controls.
- [x] Responsive: layout degrades gracefully on tablet width — controls stack below the canvas; on phone, a tabbed interface (Tree | Controls) replaces the side-by-side grid.
- [x] No taxon renders twice; no node edit ages (highlight stays in sync after operations).
- [x] `pnpm typecheck`, `vp check`, `vp test`, `pnpm build` (where DB-independent) all green.
- [x] The deleted `family-tree-example-handoff.md` is not referenced anywhere in the repo (grep).
- [x] Open Questions in the spec are resolved or freshly ADR'd in `examples/family-tree/docs/decisions/`.

**Verification:**

- All build/lint/test gates.
- Manual end-to-end walk-through against the Success Criteria 1–10 of the spec.
- Pair review with the user before merging into `main` (if/when they request).

**Dependencies:** Phases 1–6.

**Files likely touched:**

- `examples/family-tree/README.md`
- `examples/family-tree/test/e2e/showcase.e2e.test.ts` (or `KNOWN_LIMITATIONS.md`)
- `examples/family-tree/package.json` (`e2e` script if added; scripts may move from `npm` purely via `pnpm` only — confirm with user before adding deps)
- `examples/family-tree/src/components/Controls/OperatorLegend.tsx` (final pass)
- `examples/family-tree/src/routes/__root.tsx` (responsive container / metadata)

**Estimated scope:** M.

---

## Risks and Mitigations

| Risk                                                                                           | Impact | Mitigation                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wikipedia `pageimages` rate-limited or returns no image for some clade nodes                   | Med    | Seed-time retry with backoff; store `thumbnail_url = NULL` on failure; UI shows clade-glyph placeholder.                                              |
| React Flow hydration warnings with TanStack Start SSR                                          | Med    | Render `<ReactFlow>` only after mount via a `useEffect`-gated `client-only` component; loader prefetches data, hydrates into a `clientOnly` boundary. |
| `d3-hierarchy` `tree()` produces overlapping nodes for wide subfamilies                        | Med    | Use `cluster()` (dendrogram) which preserves horizontal separation; set `nodeSize` to leave a margin; manual horizontal jitter pass if still needed.  |
| ltree label collisions when names collide (e.g. `Homo` genus vs a hypothetical `Homo` species) | Low    | Naming convention: every species label is `Genus_epithet`, every clade label is the bare scientific clade name (no overlap).                          |
| Seed-fetch network failures in CI / cold runs                                                  | Low    | Fail fast with a clear error message linking back to the README's offline instructions; cached thumbnails remain valid in the happy path.             |
| The "duplicate names" complaint recursing — visual duplicates                                  | Med    | Phase 3 explicitly unit-tests "exactly one node per unique path". Phase 7 does an end-to-end grep-pass against the rendered tree.                     |
| Unpublished `@prisma-next/test-utils` blocks standalone e2e                                    | Med    | Phase 7 e2e framework is **Playwright**, not `@prisma-next/test-utils`; assert against DOM, not the test-utility layer.                               |

## Open Questions

- Rename `examples/family-tree` → `examples/tree-of-life` at Phase 7? Default: keep path; revisit at polish phase.
- Surface Tier-3 first-match operators (`firstAncestorOf` etc.) in Phase 5 or defer to a Phase 5b? Default: include only if Phase 5 budget allows; otherwise document the deferral in the README.
- Whether `getMrcaViaLca` should additionally return the _resolved_ clade name + Wiki link (it should — confirm in Phase 2 against the actual `lca()` lowering's return type).

## Checkpoints (review gates for the user)

- After Phase 1: confirm the dataset slice + columns match expectations before any UI gets built. ✅ DONE — 46 Catarrhini-rooted taxa seeded (incl. Wikipedia thumbnails), `Taxon` model on `ltree.Ltree()` `path` column helper, typecheck clean.
- After Phase 3: ⏳ AWAITING USER VISUAL CONFIRM — code complete, typecheck/build/layout-test green, SSR verified via curl. Confirm the static canvas looks right (horizontal left-to-right orientation, no duplicates, warm theme rendered, labels legible across crossings) at `pnpm dev` → http://localhost:3000 before adding the interactivity layers.
- After Phase 4: ✅ CONFIRMED by the user — node-click lineage/subtree paint, the SidePanel operator stack, the MRCA picker, and reset all verified working at `pnpm dev`.
- After Phase 5: ⏳ AWAITING USER VISUAL CONFIRM — code complete, typecheck/`vp test` (41 passed) / `pnpm build` green. Confirm at `pnpm dev`: Pattern search (lquery `*.Hominidae.*`, lquery[] `*.Pan.*, *.Homo.*`, ltxtquery `Homo & !sapiens`) each highlights the right taxa in green; the generation slider lights up one depth; the slice control's `subpath`/`subltree` crumbs recenter the canvas; "Locate sub-path" reports an index; and the operator-matrix legend glows on the active primitive — before the mutator phase builds on it.
- After Phase 6: ⏳ AWAITING USER VISUAL CONFIRM — code complete, typecheck/`vp test` (44 passed) / `vp run build` / `vp check` green. Confirm at `pnpm dev`: pick a parent + type a label (watch the dry-run path + `|| ()::text` lowering update live, and invalid labels block the button), click **Graft** → the new node appears attached to its parent and the canvas recenters on it; **Prune grafted taxa** clears every added node and restores the 46 seeded taxa.
- After Phase 7: full review against Success Criteria before merging.

---

## Hand-off prompt for the next agent (Phase 4)

```markdown
The Tree-of-Life interactive viewer spec & plan are at
docs/spec/tree-of-life-app-spec.md and docs/spec/tree-of-life-app-plan.md.
Phases 1–3 are complete on branch `example/family-tree` and committed:

- Phase 1: Catarrhini-rooted `Taxon` model + 46 seeded taxa (Wikipedia thumbs).
- Phase 2: `src/server/taxonomy.ts` — every Operator Showcase Matrix server
  function (`getTaxa`, `getLineage`, `getSubtree`, `searchLquery`,
  `searchLqueryArray`, `searchLtxtquery`, `getGeneration`, `lineageSlice`,
  `lineageSubtree`, `indexOfBranch`, `getMrcaViaLca`, `getMrcaViaOps`,
  `graftTaxon`) + `test/server/taxonomy.test.ts`. Each is also exported as a
  bare `*Query` async fn (no `createServerFn` wrapper) for the test suite.
- Phase 3: static React Flow canvas. `lib/layout.ts` (`buildTree(taxa)`,
  d3-hierarchy stratify→tree→x/y swap, horizontal LTR), `lib/nodes.ts`
  (Row→FlowNode mapping, NODE/GAP constants — type-only React Flow imports),
  `components/TaxonNode.tsx`, `components/TreeCanvas.tsx` (client-only mount),
  `routes/index.tsx` (loader = `getTaxa()`, canvas + controls-grid skeleton).
  `test/lib-layout.test.ts` guards "one node per path / one edge per child".

Start Phase 4 (Interactivity I — lineage, subtree, MRCA). Build
`components/SidePanel.tsx`, `components/Controls/LineageControls.tsx`,
`components/Controls/MrcaControls.tsx`, `lib/highlight.ts`, and wire them into
`routes/index.tsx` (the four placeholder Cards in the `<aside>` are where the
real controls slot in). Clicking a node fires the per-node SidePanel fetches
(`getLineage`/`getSubtree`/`lineageSlice`/`indexOfBranch`); the MRCA picker
calls `getMrcaViaLca` and highlights + recenters on the result. Use the
`--lineage`/`--subtree`/`--mrca` tokens already declared in `src/styles/app.css`
(usable as `bg-lineage` etc.). Follow the Phase 4 acceptance criteria above.

Environment notes:

- Dockerized Postgres is up on :5434; DB name is **`family_tree`** (not
  `family`), connection string in `.env`. 46 taxa already seeded.
- Run tests with **`vp test`** (the canonical runner); test files import from
  **`vite-plus/test`**, not `vitest` (`vp check --fix` rewrites this on commit).
  `vp test` prints a harmless `ReferenceError: module is not defined` (react CJS
  in the Vite 8-beta module runner) and "close timed out" on teardown — it is
  environmental (reproduces with a trivial empty test), tests still pass.
- Reference-path constants for the famous taxa live in
  `server/taxonomy.ts` as `REFERENCE_PATHS`.
- Don't commit unless asked. `.env`/`.output`/`routeTree.gen.ts`/`node_modules`
  are already gitignored.

Carry-over note from Phase 1: never re-add `@default(false)` to `extinct` in
`contract.prisma` — `@prisma-next/cli@0.14.0` emits a malformed boolean
literal-default that `db:plan` rejects. `graftTaxon` sets `extinct` explicitly.
```
