# Known Limitations

This documents what the Tree-of-Life viewer **intentionally does not do**, why,
and where the coverage lives instead. It exists to satisfy the Phase 7
acceptance criterion that asks for either a Playwright e2e suite or a file
explaining the deferral.

## No Playwright / browser end-to-end suite

**Decision:** the viewer ships **only** the three existing test files
(`test/lib-highlight.test.ts`, `test/lib-layout.test.ts`,
`test/server/taxonomy.test.ts`). There is no `test/e2e/` directory and no
Playwright dependency.

**Why:**

1. **`@prisma-next/test-utils` is unpublished.** The prisma-next test helpers
   are not on npm. This example is documented as standalone — it must install
   cleanly from the public registry — so it cannot depend on them. Writing a
   Playwright suite without those helpers means re-implementing a
   per-test DB-seed/reset harness from scratch (drop, migrate, seed before
   each spec), which is more harness than test for a 46-row single-table app.
2. **The showcase matrix is already DB-proven.** `test/server/taxonomy.test.ts`
   runs every `*Query` server function — lineage, subtree, MRCA, every search
   mode, generation, slices, indexOf, graft, prune — against the real seeded
   Postgres instance. Each assertion is a witness that the corresponding
   `prisma-ltree` operator lowers to the right SQL and returns the right rows.
   That is the layer where regressions in this codebase actually happen.
3. **A standalone Playwright dev-dep is heavy for an example.** Playwright
   pulls its own browser binaries (hundreds of MB) and a worker process model
   that dwarfs the rest of the example. The cost is hard to justify for a
   viewer whose user-facing surface is six controls and a canvas.

**Where the coverage lives instead:**

- DB-level operator coverage → `test/server/taxonomy.test.ts`
- Highlight paint rules → `test/lib-highlight.test.ts`
- Layout invariants (no duplicate nodes, horizontal orientation) →
  `test/lib-layout.test.ts`
- The "does it actually boot + render" question is left to the manual
  walkthrough in the spec's Success Criteria 1 (`pnpm setup && pnpm dev`).

**Revisit when:** a regression slips past the server-fn suite that would only
have been caught by a browser (React Flow hydration, focus order, CSS
breakdown at narrow widths). At that point a minimal Playwright spec against
`pnpm dev` + dockerized DB, with a hand-rolled `beforeEach` DB reset (drop →
`db:init` → `seed`), is the right shape.

## No deep accessibility audit

Per the user direction ("we don't care about crazy deep a11y; this is an
example app"), the viewer targets **basic keyboard/label sanity** only:

- All interactive controls are native shadcn / radix primitives that are
  keyboard-reachable out of the box.
- Form inputs carry visible `<label>`/`aria-label` text.
- The SidePanel and control cards use a sensible heading order.

**Not done** (and intentionally out of scope): WCAG audit, full voice-over
pass, focus-trap management in the SidePanel, color-contrast testing on the
theme tokens.

## Narrow-width layout

Below `lg` width the right-hand aside is hidden (`hidden ... lg:block`) and
the canvas takes the full width. A narrow-width tab toggle ("Tree | Controls")
is listed in the plan as **nice-to-have**; if you are reading this, it has
**not** been added. Phone-width users currently see canvas-only. Adding it is
a self-contained follow-up in `src/routes/index.tsx`.

## `@db.Ltree` is not supported

`@db.Ltree` (the native PSL attribute) has no extension hook in prisma-next
core, so the viewer uses the constructor form `ltree.Ltree()` in
`contract.prisma` instead. See
[`docs/decisions/ADR-001-open-questions.md`](docs/decisions/ADR-001-open-questions.md)
and the project-level `ADR-004-psl-lane-support.md`.
