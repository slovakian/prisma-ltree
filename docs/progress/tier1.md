# Progress Log — Tier 1 (Foundation + Core Operators)

**Status:** ✅ Complete (Checkpoint 2)
**Phases:** 0 (Scaffold) · 1 (Foundation) · 2 (First Operator) · 3 (Breadth)

## Scaffold (Phase 0)

Scaffolded `packages/extension-ltree/` mirroring the pgvector reference: six-entry `exports` map
(flat `dist/<name>.mjs`), exact-pinned `@prisma-next/*@0.14.0`, `engines.node: ">=24"`. Config lives
in `vite.config.ts` blocks (`pack`/`test`/`lint`/`fmt`) per Vite+ convention — no
`tsdown.config.ts`/`vitest.config.ts`. Pinned the Vite+ catalog to `0.1.24` (`latest` pulled an
incompatible `vite-plus-test`).

## Foundation (Phase 1)

- **Codec** `pg/ltree@1` — `string ↔ string`, label-syntax + length validation, traits
  `['equality','order']`, constant factory.
- **Column helper** `ltree()` — `nativeType: 'ltree'`, no type params.
- **Contract** — TS source via `defineContract`; emitted `contract.json` + `contract.d.ts`.
- **Baseline migration** — hand-authored `CREATE EXTENSION IF NOT EXISTS ltree` with
  precheck/postcheck and invariantId `ltree:install-ltree-v1`.

## First operator + breadth (Phases 2–3)

End-to-end vertical slice proved with `isAncestorOf` (`@>`) against **PGlite** (real execution via a
composed Postgres runtime adapter), then expanded to full Tier 1 breadth:

- **Hierarchy:** `isAncestorOf` (`@>`), `isDescendantOf` (`<@`).
- **Pattern match:** `matchesLquery` (`~`), `matchesLqueryArray` (`?`), `matchesLtxtquery` (`@`).
  **Open Q2 resolved → cast-in-template** (`~ ($1)::lquery`, etc.); pattern args bind as text
  (`pg/text@1` / core `pg/text-array@1`).
- **Scalar fns:** `nlevel`, `subltree`, `subpath` (2 overloads), `indexOf` (2 overloads), `lca`.

### Facts pinned by execution

- PG `index('0.1.2.3.5.4','5.4')` returns **4**, not 5 (reference doc was wrong; PG is authoritative).
- PG has **no single-arg `lca`** — `lca(ltree)` errors; the API requires `(self, other, ...rest)`
  (≥2 paths). See [ADR-001](../decisions/ADR-001-lca-api-shape.md).
- PG `lca` returns **proper** ancestors (strictly shorter than every input).

## Coverage

Golden lowering tests + PGlite integration tests + type-level (`.test-d.ts`) tests for every Tier 1
operator. Type-testing enabled via `test.typecheck.enabled` in `vite.config.ts`.

**Result:** `vp run ready` green; all Tier 1 features `supported` in
[`feature-support.md`](../feature-support.md).
