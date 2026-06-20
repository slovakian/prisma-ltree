# Implementation Plan: prisma-ltree

**Spec:** `docs/spec/prisma-ltree-spec.md`
**Scope:** Tier 1 + Tier 2 + Tier 3 (first-match array ops)
**Date:** 2026-06-19

---

## Overview

Build the `prisma-ltree` Prisma Next extension pack at `packages/extension-ltree/`, mirroring the
pgvector reference (`.sync/prisma-next/packages/3-extensions/pgvector/`). Deliver in thin vertical
slices: scaffold → one operator end-to-end → Tier 1 breadth → Tier 2 → Tier 3 → polish. Each slice
lands with unit + integration tests before expanding.

## Architecture Decisions

- **Mirror pgvector structure** — closest analog (single codec, single `CREATE EXTENSION` migration, TS contract source). Deviate only where ltree differs (non-parameterized codec, multi-operator).
- **Vertical slicing** — prove the full pipeline (contract → codec → migration → op → exports → tests) with `isAncestorOf` before adding breadth. Catches SPI/tolling issues early.
- **Exact-pin `@prisma-next/*@0.14.0`** from npm (standalone repo, not `workspace:`).
- **Node `>=24`** confirmed (shell is v24.17.0; `vp` v0.1.24 operational).
- **lquery/ltxtquery as cast-in-template text params** (`({{arg0}})::lquery`) — simplest path matching the Q1 "validated string param" decision; revisit if the framework needs a param codec.
- **Free-function ops** (`lca`, `text2ltree`, `text || ltree`) get an ADR before implementation (Phase 3/4).
- **Array receiver** (Tier 3) gets an ADR before implementation (Phase 5) — the gating unknown.

## Task List

### Phase 0: Scaffold

- [x] **Task 0.1: Scaffold `packages/extension-ltree/` package** ✅
  - **Acceptance:**
    - `package.json` with `name: "prisma-ltree"`, `prismaNext` metadata, six-entry `exports` map (flat `dist/<name>.mjs`), `engines.node: ">=24"`, exact-pinned `@prisma-next/*@0.14.0` deps + dev deps (incl. `@prisma-next/extension-author-tools`), `check-pins` script
    - `tsconfig.json` (**inlined** `@prisma-next/tsconfig/base` settings — the package is unpublished; no `extends`), `vite.config.ts` (`pack` + `test` + `lint` + `fmt` blocks — replaces `tsdown.config.ts`/`vitest.config.ts`), `prisma-next.config.ts` (family sql, target postgres, TS contract)
    - Empty `src/` tree (`core/`, `types/`, `exports/`, `contract.ts` stub exporting `contract`)
  - **Verify:** `vp check` passes; `vp test` runs (no tests); `vp run build` produces `dist/`; `prisma-next-check-pins` passes
  - **Dependencies:** None
  - **Files:** `packages/extension-ltree/{package.json, tsconfig.json, vite.config.ts, prisma-next.config.ts, src/contract.ts}`
  - **Scope:** M (5 files)
  - **Note:** Do NOT create `tsdown.config.ts` or `vitest.config.ts` (Vite+ convention — config in `vite.config.ts` blocks). Do NOT add `@prisma-next/{tsconfig,tsdown,test-utils}` (unpublished — 404 on npm); see spec §2 mitigations.

### Checkpoint 0: Scaffold ✅

- [x] `vp run ready` passes for the empty package
- [x] `prisma-next` CLI is invocable from the package (confirm `pnpm exec prisma-next --help`); if not, note workaround
- [x] `prisma-next-check-pins` passes (validates exact-pin rule across deps/peerDeps/optionalDeps)

**Notes:** Pinned Vite+ catalog to `0.1.24` (not `latest`) because `@voidzero-dev/vite-plus-test@0.2.x` is not published yet — `latest` tracking pulled incompatible `vite-plus@0.2.1` + `vite-plus-test@0.1.24`. Added 6 minimal `export {}` stubs in `src/exports/` so `vp pack` succeeds with the 6-entry config. Added `passWithNoTests: true` to the `test` block. Included `prisma-next.config.ts` in `tsconfig.json` `include` so oxlint typeCheck uses `bundler` resolution (root tsconfig is `nodenext` which requires file extensions).

### Phase 1: Tier 1 Foundation (contract + codec + migration, no operators)

- [x] **Task 1.1: Core constants + contract-space constants + authoring**
  - **Acceptance:** `constants.ts` (`LTREE_CODEC_ID = 'pg/ltree@1'`, label/path limits), `contract-space-constants.ts` (`LTREE_SPACE_ID = 'ltree'`, `LTREE_NATIVE_TYPE = 'ltree'`, `LTREE_INVARIANTS.installLtree = 'ltree:install-ltree-v1'`), `authoring.ts` (`ltree.Ltree` type constructor)
  - **Verify:** `vp check` typecheck passes
  - **Dependencies:** Task 0.1
  - **Files:** `src/core/{constants.ts, contract-space-constants.ts, authoring.ts}`
  - **Scope:** S (3 files)

- [x] **Task 1.2: Codec + column helper**
  - **Acceptance:** `LtreeCodec` (encode validates label syntax + lengths, decode passthrough, string↔string, traits `['equality','order']`), `LtreeDescriptor` (constant factory, `renderOutputType` → `'string'`, `voidParamsSchema`), `ltree()` column helper
  - **Verify:** `test/codecs.test.ts` — round-trip valid paths (`'Top.Science'`), reject invalid labels/over-long labels; `vp test` passes
  - **Dependencies:** Task 1.1
  - **Files:** `src/core/codecs.ts`, `test/codecs.test.ts`
  - **Scope:** S (2 files)

- [x] **Task 1.3: Registry + codec/operation type stubs**
  - **Acceptance:** `registry.ts` (`buildCodecDescriptorRegistry`), `types/codec-types.ts` (`Ltree` branded type, `CodecTypes`), `types/operation-types.ts` (skeleton `QueryOperationTypes` with no ops yet)
  - **Verify:** `vp check` typecheck passes
  - **Dependencies:** Task 1.2
  - **Files:** `src/core/registry.ts`, `src/types/{codec-types.ts, operation-types.ts}`
  - **Scope:** S (3 files)

- [x] **Task 1.4: Contract source + emit**
  - **Acceptance:** `src/contract.ts` (`defineContract` registering `ltree` `codec-instance` storage type); `prisma-next contract emit` produces `src/contract.json` + `src/contract.d.ts`
  - **Verify:** `contract.json` declares the `ltree` storage type; `vp check` passes
  - **Dependencies:** Task 1.1
  - **Files:** `src/contract.ts`, `src/contract.json` (emitted), `src/contract.d.ts` (emitted)
  - **Scope:** S (1 authored + 2 emitted)
  - **Risk:** If `prisma-next contract emit` fails in Vite+ repo, hand-author `contract.json`/`contract.d.ts` from the pgvector emitted shape and flag.

- [x] **Task 1.5: Baseline migration (install ltree)**
  - **Acceptance:** `migrations/<timestamp>_install_ltree/{migration.ts, ops.json, migration.json}` + `migrations/refs/head.json` + `end-contract.{json,d.ts}`; op carries `CREATE EXTENSION IF NOT EXISTS ltree` with precheck/postcheck + invariantId `ltree:install-ltree-v1` (Path B, hand-authored)
  - **Verify:** `node migration.ts` re-emits `ops.json`/`migration.json` deterministically (diff = none); `ops.json` has the install op
  - **Dependencies:** Tasks 1.1, 1.4
  - **Files:** `migrations/<dir>/{migration.ts, ops.json, migration.json, end-contract.json, end-contract.d.ts}`, `migrations/refs/head.json`
  - **Scope:** M (hand-author migration.ts; re-emit the rest)

### Phase 2: Tier 1 First Operator (end-to-end vertical slice)

- [x] **Task 2.1: descriptor-meta — `isAncestorOf` + pack meta**
  - **Acceptance:** `ltreeQueryOperations()` returns `isAncestorOf` (self `pg/ltree@1`, template `{{self}} @> {{arg0}}`, returns `pg/bool@1`); `ltreePackMeta` (kind extension, id `ltree`, familyId sql, targetId postgres, codecTypes/operationTypes/storage imports pointing at `prisma-ltree/...`)
  - **Verify:** `vp check` typecheck passes
  - **Dependencies:** Tasks 1.1–1.3
  - **Files:** `src/core/descriptor-meta.ts`
  - **Scope:** S (1 file)

- [x] **Task 2.2: operation-types — `isAncestorOf` signature**
  - **Acceptance:** `types/operation-types.ts` declares `QueryOperationTypes` with the `isAncestorOf` signature matching the impl
  - **Verify:** `vp check` typecheck passes
  - **Dependencies:** Task 2.1
  - **Files:** `src/types/operation-types.ts`
  - **Scope:** XS (1 file)

- [x] **Task 2.3: Exports — all six entrypoints**
  - **Acceptance:** `exports/{control.ts, runtime.ts, column-types.ts, pack.ts, codec-types.ts, operation-types.ts}` wired (control wires contract space + codec control hooks; runtime wires codec registry + query ops; column-types exports `ltree()`; pack re-exports meta)
  - **Verify:** `vp run build` produces all six `dist/` entrypoints; `vp check` passes
  - **Dependencies:** Tasks 1.5, 2.1, 2.2
  - **Files:** `src/exports/{control.ts, runtime.ts, column-types.ts, pack.ts, codec-types.ts, operation-types.ts}`
  - **Scope:** M (6 files, mostly thin re-exports + 2 substantive)

- [x] **Task 2.4: Operations golden test (`isAncestorOf`)**
  - **Acceptance:** `test/operations.test.ts` asserts descriptor metadata, operation keys, `buildAst()` is `OperationExpr`, `lowering.template === '{{self}} @> {{arg0}}'`, `returns` codec, registry registration (mirror pgvector `operations.test.ts`)
  - **Verify:** `vp test` passes
  - **Dependencies:** Task 2.3
  - **Files:** `test/operations.test.ts`
  - **Scope:** S (1 file)

- [x] **Task 2.5: column-types + pack-authoring + descriptor tests**
  - **Acceptance:** `test/column-types.test.ts` (`ltree()` returns descriptor with `codecId`/`nativeType: 'ltree'`/no `typeParams`), `test/pack-authoring.test.ts` (authoring namespace validates), `test/descriptor.test.ts` (pack metadata, registry, codec descriptor presence, `create()`)
  - **Verify:** `vp test` passes
  - **Dependencies:** Task 2.3
  - **Files:** `test/{column-types.test.ts, pack-authoring.test.ts, descriptor.test.ts}`
  - **Scope:** S (3 files)

- [x] **Task 2.6: Integration test (PGlite, `isAncestorOf` end-to-end)** ✅ (Path A — real PGlite execution)
  - **Acceptance:** PGlite test: `CREATE EXTENSION ltree`, create table with `ltree` column, insert rows, query `WHERE path @> $1` via the operator, assert expected rows; ltree works under PGlite
  - **Verify:** `vp test` passes; SQL executes and returns expected rows
  - **Dependencies:** Tasks 1.5, 2.3
  - **Files:** `test/integration/isAncestorOf.integration.test.ts`, `test/helpers/composed-adapter.ts`
  - **Scope:** M (harness + 1 test)
  - **Risk:** PGlite ltree support — ltree is trusted, expected to work; if not, fall back to a real Postgres container (slower) and flag.
  - **Notes:** Path A chosen (real execution). PGlite supports `ltree` via the `@electric-sql/pglite/contrib/ltree` extension (verified by smoke test). The test lowers the `isAncestorOf` `OperationExpr` through a composed Postgres runtime adapter (`test/helpers/composed-adapter.ts`, mirrored from pgvector) and executes the lowered SQL against PGlite — proving the full impl → AST → lowering → execution pipeline. Lowered SQL: `"node"."path" @> $1::ltree` (codec-driven cast). `@electric-sql/pglite@^0.5.3` added as a devDep (auto-cataloged by pnpm). `applicationDomainOf` (unpublished `test-utils`) inlined as a trivial domain object. 35 tests pass; `vp run ready` green.

### Checkpoint 1: Tier 1 slice complete ✅ — PAUSED FOR HUMAN REVIEW

- [x] `vp run ready` passes (7/7 packages)
- [x] `isAncestorOf` works end-to-end against PGlite
- [ ] Review with human before adding breadth — **PAUSE HERE; do not start Phase 3 without explicit user approval**

### Phase 3: Tier 1 Breadth

- [x] **Task 3.1: Hierarchy + pattern-match ops** ✅
  - **Acceptance:** Add `isDescendantOf` (`<@`), `matchesLquery` (`~ ({{arg0}})::lquery`), `matchesLqueryArray` (`? ({{arg0}})::lquery[]`), `matchesLtxtquery` (`@ ({{arg0}})::ltxtquery`) to descriptor-meta + operation-types + golden tests
  - **Verify:** `vp test` — golden tests assert each template + returns codec
  - **Dependencies:** Checkpoint 1
  - **Files:** `src/core/descriptor-meta.ts`, `src/types/operation-types.ts`, `test/operations.test.ts`
  - **Scope:** S (3 files)
  - **Notes:** Refactored `ltreeQueryOperations()` with `hierarchyOp`/`patternOp` helpers. **Open Q2 RESOLVED → cast-in-template.** All four cast forms smoke-tested executable under PGlite before coding: `~ ($1)::lquery`, `? ($1::text[])::lquery[]`, `@ ($1)::ltxtquery`, `<@ $1::ltree`. Pattern args bind as text — `matchesLquery`/`matchesLtxtquery` use `pg/text@1`, `matchesLqueryArray` uses the core `pg/text-array@1` codec (`string[]` → `text[]`, then cast `::lquery[]`). Hierarchy args share the column's `pg/ltree@1` codec (template has no explicit cast; the codec emits `::ltree`). Golden tests parametrized via `it.each` (5 ops). 40 tests pass; `vp run ready` green. Also fixed the carried-over `?`/`@` operator mis-mapping in `docs/ltree/postgresql-ltree-reference.md` + `AGENTS.md`/`CLAUDE.md` (was `?`→ltxtquery; correct is `~`→lquery, `?`→lquery[], `@`→ltxtquery).

- [x] **Task 3.2: Scalar functions** ✅
  - **Acceptance:** Add `nlevel`, `subltree`, `subpath` (2 overloads), `indexOf` (2 overloads), `lca` to descriptor-meta + operation-types + golden tests. Write ADR for `lca` API shape (namespace fn `ltree.lca(paths)` vs method).
  - **Verify:** `vp test` passes; ADR in `docs/decisions/`
  - **Dependencies:** Task 3.1
  - **Files:** `src/core/descriptor-meta.ts`, `src/types/operation-types.ts`, `test/operations.test.ts`, `docs/decisions/ADR-001-lca-api-shape.md`
  - **Scope:** M (4 files)
  - **Notes:** Added a module-scope `funcOp` helper that derives the `fn(self, arg0, ...)` template from the actual arg-list length — one helper covers fixed-arity (`nlevel`/`subltree`), optional-arg overloads (`subpath`/`indexOf`, branch on `arg === undefined`), and variadic `lca`. Scalar fn SQL forms smoke-tested under PGlite first (note: PG's `index('0.1.2.3.5.4','5.4')` returns **4**, not 5 as the reference doc claimed — PG is authoritative). **ADR-001 written: `lca` is a variadic method on the first path** (`path.lca(...others)` → `lca(self, arg0, ...)`) — the only shape that fits the self-centric model without free-function support (deferred to ADR-002) or array receivers (ADR-003). The array form `lca(ltree[])` is reclassified `planned` in feature-support. Golden tests via `it.each` cover both overload arities + lca 1/2/3-arg. 48 tests pass; `vp run ready` green. Int args use the core `pg/int4@1` codec; `subltree`/`subpath`/`lca` return `pg/ltree@1`, `nlevel`/`indexOf` return `pg/int4@1`.

- [x] **Task 3.3: Tier 1 integration tests** ✅
  - **Acceptance:** PGlite integration tests for all Tier 1 ops (hierarchy, pattern-match, scalar fns)
  - **Verify:** `vp test` passes; each op executes correct SQL against PGlite
  - **Dependencies:** Task 3.2
  - **Files:** `test/integration/tier1.integration.test.ts`, `test/helpers/ltree-fixture.ts`
  - **Scope:** M (1 test file, many cases)
  - **Notes:** 13 cases — every Tier 1 op built via its runtime impl, lowered through the composed adapter, executed against PGlite. Booleans run in a WHERE clause (assert matching ids); scalar fns in a projection (assert the value). Extracted `test/helpers/ltree-fixture.ts` (`createLtreeContract`, `ltreeColumn`, `paramValues`) shared with the isAncestorOf test. **Two SPI/semantics facts pinned by execution:** (1) PG has **no single-arg `lca`** — `lca(ltree)` errors; the impl + type now require `(self, other, ...rest)` (≥2 paths). ADR-001 updated. (2) PG `lca` uses **proper** ancestors (the result is strictly shorter than every input) — `lca('Top.Science.X','Top.Science.Y')` → `Top.Science` only because both are `Top.Science.*`. 61 tests pass; `vp run ready` green.

- [x] **Task 3.4: Type-level (`.test-d.ts`) coverage for the typed user surface** ✅
  - **Why:** The pack's user-facing surface is the _typed_ operator/codec layer — that `CodecTypes['pg/ltree@1']` resolves with the right `input`/`output`/`traits`, and that each `QueryOperationTypes` operation signature (`isAncestorOf`, `isDescendantOf`, pattern-match, scalar fns) surfaces with correct arg/return types. The reference packs (pgvector `typed-descriptor-flow.test-d.ts` / `codecs-class.types.test-d.ts`) cover this; our pack currently has **no `.test-d.ts` tests** (gap identified at Checkpoint 1). NOTE: this is _not_ a prisma-next-client integration test — the ORM query builder is a separate extension (`@prisma-next/extension-sql-orm-client`) and exercising it would test the client's integration, not ours. Codec/operator packs (pgvector, postgis) deliberately stop at the codec-types + operation-lowering boundary; this task fills the type-level half of that boundary.
  - **Acceptance:** `test/codec-types.test-d.ts` (codec descriptor narrowing, `codecId` literal `'pg/ltree@1'`, `traits` literal tuple, `CodecTypes` shape, `@ts-expect-error` for absent codec ids) + `test/operation-types.test-d.ts` (each Tier 1 operation signature `expectTypeOf`-asserted: `self`/arg/return types). Mirror pgvector's `expectTypeOf` + `@ts-expect-error` style. Cover all Tier 1 ops added in 3.1/3.2 in one pass.
  - **Verify:** `vp test` runs the `.test-d.ts` files (vitest type-testing); `vp check` typecheck passes
  - **Dependencies:** Tasks 3.1, 3.2 (signatures must be final first)
  - **Files:** `test/codec-types.test-d.ts`, `test/operation-types.test-d.ts`
  - **Scope:** M (2 type-test files)
  - **Note:** Confirm vitest type-testing is enabled in the `test` block of `vite.config.ts` (`typecheck`/`*.test-d.ts` glob) — Vite+ may need the type-test runner turned on; check `node_modules/vite-plus/docs/guide/test.md` and `packages/utils` for the convention. If Vite+ doesn't run `.test-d.ts`, fall back to a `tsc --noEmit`-style assertion compiled under the package tsconfig and flag.
  - **Notes:** Vite+ type-testing **enabled** via `test.typecheck.enabled: true` + `include: ['**/*.test-d.ts']` in `vite.config.ts` (`vite-plus/test` re-exports `expectTypeOf`; checker is `tsc`). `vp test` now reports "Type Errors: no errors" alongside runtime tests (9 files, 72 tests). `codec-types.test-d.ts` (codecId/traits literals, `CodecTypes` input/output, `@ts-expect-error` for absent ids, `Ltree` brand) + `operation-types.test-d.ts` (built a local `TestCT` covering all referenced codec ids; asserts the full 10-op key set, return codecs, arg acceptance incl. `string[]` for matchesLqueryArray, optional `subpath`/`indexOf` args, lca's required 2nd path).

### Checkpoint 2: Tier 1 complete ✅

- [x] `vp run ready` passes; all Tier 1 ops have unit + integration + **type-level** coverage (72 tests)
- [x] Update `docs/feature-support.md` (Tier 1 → `supported`)

### Phase 4: Tier 2 (Concatenation + Conversion)

- [x] **Task 4.1: Concatenation + conversion ops + ADR** ✅
  - **Acceptance:** Add `concat` (`||`), `concatText` (`|| ({{arg0}})::ltree`), `prependText` (free-fn ADR), `toText` (`ltree2text`), `fromText` (`text2ltree`, free-fn ADR) + golden tests. ADR for free-function lowering shape.
  - **Verify:** `vp test` passes; ADR in `docs/decisions/`
  - **Dependencies:** Checkpoint 2
  - **Files:** `src/core/descriptor-meta.ts`, `src/types/operation-types.ts`, `test/operations.test.ts`, `docs/decisions/ADR-002-free-function-lowering.md`
  - **Scope:** M (4 files)
  - **Notes:** All five SQL forms smoke-tested under PGlite first. Added a `concatOp` helper (operator-style, returns ltree) alongside `funcOp` (reused for `toText`/`toLtree`). **ADR-002 written: free functions re-root on a natural `self`; self-less ops are unreachable** — proven against `.sync/`: the ORM client model-accessor (`sql-orm-client/src/model-accessor.ts:97`) does `if (!self) continue`, dropping any op without a `self`. So `text2ltree` ships as **`text.toLtree()`** rooted on `pg/text@1` (paradedb precedent for text-rooted ops), renamed from the spec's `fromText` (a misnomer on a text receiver). `prependText` keeps the ltree column as `self` though it is the right operand (`{{self}}` placed second; renderer binds by name, not position). The self-less `Ltree.fromText()` constructor + `lca(ltree[])` stay `planned` pending a free-function call surface. Golden + type-level coverage added for all five.

- [x] **Task 4.2: Tier 2 integration tests** ✅
  - **Acceptance:** PGlite integration tests for concat + conversion
  - **Verify:** `vp test` passes
  - **Dependencies:** Task 4.1
  - **Files:** `test/integration/tier2.integration.test.ts`
  - **Scope:** S (1 file)
  - **Notes:** 5 cases — each Tier 2 op built via its impl, lowered through the composed adapter, executed against PGlite, value asserted. `toLtree` is driven from a text-literal `self` (added an inline `textValue` helper). Confirms `prependText` (self-not-first template) and `toLtree` (text-rooted) execute correctly. 10 files / 84 tests + type tests pass.

### Checkpoint 3: Tier 2 complete ✅

- [x] `vp run ready` passes; Tier 2 → `supported` in feature-support.md

### Phase 5: Tier 3 (Array First-Match Ops)

- [x] **Task 5.1: ADR — array receiver design**
  - **Acceptance:** ADR deciding how `ltree[]`-typed `self` is represented (array codec vs array-of-ltree expressions vs `ltree[]` column codec), grounded in `.sync/prisma-next/` SPI research
  - **Verify:** ADR reviewed; design viable against framework SPI
  - **Dependencies:** Checkpoint 3
  - **Files:** `docs/decisions/ADR-003-array-receiver.md`
  - **Scope:** S (1 file, research-heavy)
  - **Notes:** **ADR-003 written: dedicated `pg/ltree-array@1` codec** mirroring core `pg/text-array@1`. Verified against `.sync/`: model-accessor registers ops by exact `self.codecId`; no SQL-side element-codec SPI. All four Tier 3 SQL forms smoke-tested under PGlite before coding.

- [x] **Task 5.2: Array receiver + 4 first-match ops + golden tests**
  - **Acceptance:** Implement `firstAncestorOf` (`?@>`), `firstDescendantOf` (`?<@`), `firstMatchLquery` (`?~`), `firstMatchLtxtquery` (`?@`) on `ltree[]` receiver + golden tests
  - **Verify:** `vp test` passes
  - **Dependencies:** Task 5.1
  - **Files:** `src/core/{codecs.ts, descriptor-meta.ts}`, `src/types/operation-types.ts`, `test/operations.test.ts`
  - **Scope:** M (4 files)

- [x] **Task 5.3: Tier 3 integration tests**
  - **Acceptance:** PGlite integration tests for first-match ops
  - **Verify:** `vp test` passes
  - **Dependencies:** Task 5.2
  - **Files:** `test/integration/tier3.integration.test.ts`
  - **Scope:** S (1 file)

### Checkpoint 4: Tier 3 complete ✅

- [x] `vp run ready` passes; Tier 3 → `supported` in feature-support.md

### Phase 6: Polish

- [x] **Task 6.1: Coverage threshold + gap fill** ✅
  - **Acceptance:** coverage threshold set in the `test` block of `vite.config.ts` (90%→ ramp toward 95%); run coverage, fill gaps in `src/`
  - **Verify:** `vp test --coverage` meets threshold
  - **Dependencies:** Checkpoint 4
  - **Files:** `vite.config.ts` (test block), targeted `src/` + `test/` files
  - **Scope:** M
  - **Notes:** Added `@vitest/coverage-v8@4.1.8` (matches the `vite-plus-test` peer dep). `coverage` block scoped to `src/**/*.ts` (excludes `*.d.ts` + authoring-only `contract.ts`), thresholds **95%** on all four axes. Filled the two gaps unit-side: `codecs.ts` array-codec `decode`/`encodeJson`/`decodeJson` + scalar JSON paths + `renderOutputType` + max-labels guard; `control.ts` `queryOperations()`/`create()`/control-plane hooks. **100% statements/branches/functions/lines** (139/22/54/136), 116 tests pass, no type errors. Added `coverage/` to `.gitignore`. (Vite+'s re-versioned vitest fork emits a cosmetic "mixed versions" warning — `0.1.24` vs provider `4.x` can never string-match; coverage executes + enforces correctly.)

- [x] **Task 6.2: Finalize docs** ✅
  - **Acceptance:** `docs/feature-support.md` statuses accurate (supported/out-of-scope); `docs/progress/` logs complete; README for the package
  - **Verify:** docs review; matrix matches shipped features
  - **Dependencies:** Task 6.1
  - **Files:** `docs/feature-support.md`, `docs/progress/*.md`, `packages/extension-ltree/README.md`
  - **Scope:** M
  - **Notes:** Wrote `packages/extension-ltree/README.md` (install, config, contract/runtime/query usage, full operation tables grounded in the feature matrix, types, dev workflow). Created per-tier progress logs (`docs/progress/{tier1,tier2,tier3,polish}.md`) sourced from the recorded task notes. `feature-support.md` verified accurate against the shipped surface (no status changes needed — already current through Tier 3).

- [ ] **Task 6.3: Replace npm stub (ASK FIRST)**
  - **Acceptance:** Bump `prisma-ltree` version (e.g. `0.1.0`), build, publish to npm replacing the `0.0.1` stub
  - **Verify:** `npm view prisma-ltree` shows new version; install + import works
  - **Dependencies:** Task 6.2; **explicit user approval**
  - **Files:** `packages/extension-ltree/package.json`
  - **Scope:** S

## Risks and Mitigations

| Risk                                                 | Impact | Mitigation                                                                                                   |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `prisma-next` CLI not invocable in Vite+ repo        | High   | Confirm at Checkpoint 0; fall back to hand-authoring emitted artefacts from pgvector's shape                 |
| PGlite doesn't support `ltree`                       | Med    | ltree is trusted — expected to work; verify early at Task 2.6; fall back to Postgres container               |
| Array receiver SPI unknown (Tier 3)                  | Med    | ADR 5.1 with source-driven research before any code; if framework lacks support, descope Tier 3 to `planned` |
| Free-function lowering doesn't fit method-op pattern | Med    | ADRs 3.2/4.1; may expose as namespace fns or skip `text \|\| ltree`/`text2ltree` to `planned`                |
| `resolveIdentityValue` for ltree unclear             | Low    | Resolve during Task 2.3 against framework expectations (likely `null`)                                       |
| Exact-pin drift if framework bumps `0.14.0`          | Low    | Extension-author upgrade skill in `.sync/` governs upgrades; do not bump unilaterally                        |

## Open Questions (carried from spec, status)

1. ~~Node `>=24`~~ — **resolved** (shell is v24.17.0).
2. lquery/ltxtquery cast-in-template vs param codec — decide at Task 3.1 (try cast-in-template first).
3. Free-function API shape — ADR at Tasks 3.2/4.1.
4. Array receiver — ADR at Task 5.1. **Resolved (ADR-003): `pg/ltree-array@1`.**
5. `resolveIdentityValue` — resolve at Task 2.3.
6. `prisma-next` CLI invocation — confirm at Checkpoint 0.
7. Coverage threshold start — decide at Task 6.1.
8. Release cadence (phased vs one release) — decide at Task 6.3.

## Parallelization

- **Sequential (must be):** Phase 0 → Phase 1 → Phase 2 (the slice establishes the skeleton everything extends). Phase 3 ops are sequential within the phase (shared `descriptor-meta.ts`).
- **Parallelizable:** Unit golden tests (Task 2.4/2.5) can be written alongside exports once signatures are fixed. Docs/ADRs can be drafted in parallel with implementation by a second agent.
- **Needs coordination:** Phase 3/4/5 all edit `descriptor-meta.ts` + `operation-types.ts` — do not run truly concurrently against the same files.
