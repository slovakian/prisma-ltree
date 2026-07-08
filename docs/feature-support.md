# prisma-ltree — Feature Support Matrix

**Source of truth** for what `prisma-ltree` supports, does not support, and has in progress.
Doc-writing agents read this file to accurately reflect the extension's surface.

**Status values:** `supported` · `in-progress` · `planned` · `out-of-scope` (tracked, not built)
**Scope decision:** "Everything reasonable" — Tier 1 + Tier 2 + Tier 3 (first-match array ops)
**Last updated:** 2026-07-06

See `packages/extension-ltree/README.md` for usage documentation and `docs/decisions/` for design ADRs.

---

## Codec & Contract

| Feature                                                                  | Status       | Notes                                                   |
| ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------- |
| `pg/ltree@1` codec (string↔string, label validation)                     | supported    | Case 1, traits `['equality','order']`, constant factory |
| `pg/ltree-array@1` codec (`string[]`↔`string[]`, per-element validation) | supported    | Mirrors core `pg/text-array@1` pattern (ADR-003)        |
| `ltree()` column helper                                                  | supported    | Non-parameterized; `nativeType: 'ltree'`                |
| `ltreeArray()` column helper                                             | supported    | Non-parameterized; `nativeType: 'ltree[]'`              |
| `CREATE EXTENSION IF NOT EXISTS ltree` migration                         | supported    | invariantId `ltree:install-ltree-v1`                    |
| Contract storage type `ltree` (codec-instance)                           | supported    | TS contract source (not PSL)                            |
| Contract storage type `ltree[]` (codec-instance)                         | supported    | ADR-003                                                 |
| `lquery` as a column type                                                | out-of-scope | By decision — lquery is a validated string param        |
| `ltxtquery` as a column type                                             | out-of-scope | By decision — ltxtquery is a validated string param     |

## Hierarchy Operators (→ `pg/bool@1`)

| SQL              | API method                 | Status    | Tier |
| ---------------- | -------------------------- | --------- | ---- |
| `ltree @> ltree` | `path.isAncestorOf(rhs)`   | supported | 1    |
| `ltree <@ ltree` | `path.isDescendantOf(rhs)` | supported | 1    |

## Pattern-Matching Operators (→ `pg/bool@1`)

| SQL                 | API method                          | Arg      | Status    | Tier |
| ------------------- | ----------------------------------- | -------- | --------- | ---- |
| `ltree ~ lquery`    | `path.matchesLquery(pattern)`       | string   | supported | 1    |
| `ltree ? lquery[]`  | `path.matchesLqueryArray(patterns)` | string[] | supported | 1    |
| `ltree @ ltxtquery` | `path.matchesLtxtquery(query)`      | string   | supported | 1    |

## Scalar Functions

| SQL                           | API method                    | Returns      | Status                                                     | Tier |
| ----------------------------- | ----------------------------- | ------------ | ---------------------------------------------------------- | ---- |
| `nlevel(ltree)`               | `path.nlevel()`               | `pg/int4@1`  | supported                                                  | 1    |
| `subltree(ltree, start, end)` | `path.subltree(start, end)`   | `pg/ltree@1` | supported                                                  | 1    |
| `subpath(ltree, offset, len)` | `path.subpath(offset, len?)`  | `pg/ltree@1` | supported                                                  | 1    |
| `subpath(ltree, offset)`      | (overload of above)           | `pg/ltree@1` | supported                                                  | 1    |
| `index(a, b)`                 | `path.indexOf(other)`         | `pg/int4@1`  | supported                                                  | 1    |
| `index(a, b, offset)`         | `path.indexOf(other, offset)` | `pg/int4@1`  | supported                                                  | 1    |
| `lca(ltree, ltree, ...)`      | `path.lca(other, ...rest)`    | `pg/ltree@1` | supported (≥2 paths; ADR-001)                              | 1    |

## Concatenation (→ `pg/ltree@1`)

| SQL                | API method                | Status    | Tier |
| ------------------ | ------------------------- | --------- | ---- |
| `ltree \|\| ltree` | `path.concat(rhs)`        | supported | 2    |
| `ltree \|\| text`  | `path.concatText(label)`  | supported | 2    |
| `text \|\| ltree`  | `path.prependText(label)` | supported | 2    |

`prependText` keeps the ltree column as the receiver even though it is the right
operand of `text || ltree` (ADR-002).

## Conversion

| SQL                 | API method             | Returns      | Status                                | Tier |
| ------------------- | ---------------------- | ------------ | ------------------------------------- | ---- |
| `ltree2text(ltree)` | `path.toText()`        | `pg/text@1`  | supported                             | 2    |
| `text2ltree(text)`  | `text.toLtree()`       | `pg/ltree@1` | supported (text-rooted; ADR-002)      | 2    |
| `text2ltree(text)`  | `Ltree.fromText(text)` | `pg/ltree@1` | planned — self-less constructor (SPI) | 2    |

`toLtree` is the reachable form of `text2ltree`: it is rooted on `pg/text@1` and
surfaces as a method on text columns (ADR-002). The self-less constructor spelling
`Ltree.fromText()` remains `planned` pending a free-function call surface.

## Array First-Match Operators (→ `pg/ltree@1`)

Receiver is `ltree[]` via `pg/ltree-array@1` (ADR-003).

| SQL                    | API method                         | Status    | Tier |
| ---------------------- | ---------------------------------- | --------- | ---- |
| `ltree[] ?@> ltree`    | `paths.firstAncestorOf(rhs)`       | supported | 3    |
| `ltree[] ?<@ ltree`    | `paths.firstDescendantOf(rhs)`     | supported | 3    |
| `ltree[] ?~ lquery`    | `paths.firstMatchLquery(pattern)`  | supported | 3    |
| `ltree[] ?@ ltxtquery` | `paths.firstMatchLtxtquery(query)` | supported | 3    |
| `lca(ltree[])`         | `paths.lcaAll()`           | supported | 3    |

Named `lcaAll` (not `lca`) because prisma-next keys operations by name only and
rejects duplicates; `lca` is already the variadic scalar method (ADR-001). See
ADR-005 for the naming decision and the shared `nullable: false` gap.

## Out-of-Scope (Tracked)

| Feature                                 | SQL                   | Status       | Reason / Revisit                                                                             |
| --------------------------------------- | --------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| Boolean array variant                   | `ltree[] @> ltree`    | out-of-scope | "Less useful" per scope; low marginal cost once array receiver exists — revisit after Tier 3 |
| Boolean array variant                   | `ltree[] <@ ltree`    | out-of-scope | same                                                                                         |
| Boolean array variant                   | `ltree[] ~ lquery`    | out-of-scope | same                                                                                         |
| Boolean array variant                   | `ltree[] ? lquery[]`  | out-of-scope | same                                                                                         |
| Boolean array variant                   | `ltree[] @ ltxtquery` | out-of-scope | same                                                                                         |
| GiST index (`gist_ltree_ops`, default siglen) | DDL                   | out-of-scope | Blocked: PSL standard `defineConfig` cannot register pack `indexTypes` — see `docs/decisions/gist-index-psl-ts-parity-blocker.md` |
| GiST array index (`gist__ltree_ops`, default siglen) | DDL            | out-of-scope | same                                                                                                                            |
| GiST `siglen` / explicit opclass              | DDL                   | out-of-scope | Operator-class params not in prisma-next general index DSL; separate from PSL blocker                                           |
| Hash index over `ltree`                 | DDL                   | out-of-scope | same                                                                                         |
| B-tree index over `ltree`               | DDL                   | out-of-scope | Automatic for `<,<=,=,>=,>`; no extension op needed                                          |

---

## Changelog

- 2026-06-19 — Initial matrix created from spec. All in-scope features `planned`; out-of-scope features tracked with reasons.
- 2026-06-19 — Tier 1 complete (Checkpoint 2). Codec/contract/migration + all Tier 1 operators (hierarchy, pattern-match) and scalar functions (`nlevel`, `subltree`, `subpath`, `indexOf`, `lca`) → `supported`, each with golden + PGlite integration + type-level coverage. `lca` is a variadic method requiring ≥2 paths (ADR-001); the `ltree[]` array form remains `planned`.
- 2026-06-19 — Tier 2 complete (Checkpoint 3). Concatenation (`concat`, `concatText`, `prependText`) and conversion (`toText`, `toLtree`) → `supported`, each with golden + PGlite integration + type-level coverage. Free-function lowering resolved by re-rooting on a natural `self` (ADR-002): `text2ltree` ships as `text.toLtree()` (text-rooted); the self-less `Ltree.fromText()` constructor stays `planned` pending a free-function call surface.
- 2026-06-19 — Tier 3 complete (Checkpoint 4). Array receiver resolved via dedicated `pg/ltree-array@1` codec + `ltreeArray()` column helper (ADR-003). All four first-match operators → `supported` with golden + PGlite integration + type-level coverage. `lca(ltree[])` deferred pending array-receiver method.
- 2026-07-08 — GiST index spike (`cursor/gist-indexes-b338`): TS lane works; PSL blocked on standard `defineConfig` — not shipped. See `docs/decisions/gist-index-psl-ts-parity-blocker.md`.
- 2026-07-06 — `lca(ltree[])` → `paths.lcaAll()` shipped on `pg/ltree-array@1` (ADR-005). Distinct name required: prisma-next's operation registry keys by name only and rejects duplicates; scalar `path.lca(...)` already occupies `lca`. Return stays `nullable: false` for parity with first-match ops despite PG's empty-array NULL (family-wide gap, pinned by an integration test).
- 2026-06-19 — Phase 6 polish. Coverage threshold set to 95% in `vite.config.ts`; gaps filled to **100%** statements/branches/functions/lines (116 tests). Package `README.md` and per-tier `docs/progress/` logs written. Matrix verified accurate against shipped surface (no status changes). Pending: npm publish over the `0.0.1` stub (Task 6.3, awaiting approval).
