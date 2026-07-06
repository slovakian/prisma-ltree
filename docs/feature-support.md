# prisma-ltree — Feature Support Matrix

**Source of truth** for what `prisma-ltree` supports, does not support, and has in progress.
Doc-writing agents read this file to accurately reflect the extension's surface.

**Status values:** `supported` · `in-progress` · `planned` · `out-of-scope` (tracked, not built)
**Scope decision:** "Everything reasonable" — Tier 1 + Tier 2 + Tier 3 (first-match array ops)
**Last updated:** 2026-07-06

See `packages/extension-ltree/README.md` for usage documentation and `docs/decisions/` for design ADRs.

---

## Coverage summary

PostgreSQL's `ltree` module exposes three storage types (`ltree`, `lquery`, `ltxtquery`),
comparison operators, specialized hierarchy/pattern operators, scalar functions, and index
opclasses. **prisma-ltree covers essentially all query-time SQL that matters for scalar `ltree`
columns and the first-match subset on `ltree[]`.** The main gaps are:

| Area | Coverage |
| ---- | -------- |
| Scalar `ltree` operators & functions | **Complete** — all Tier 1–2 ops shipped |
| `ltree[]` first-match operators | **Complete** — all four `?…` forms shipped |
| `ltree[]` boolean "any match?" operators | **Out of scope** — five `ltree[] @> …` / `~` / `@` forms |
| `ltree` receiver vs `ltree[]` cross-side booleans | **Out of scope** — `ltree <@ ltree[]`, `ltree @> ltree[]`, etc. |
| `lca(ltree[])` | **Planned** — `paths.lca()` |
| Reversed-operand pattern ops (`lquery ~ ltree`) | **Out of scope** — use scalar-column methods instead |
| Non-index test operators (`^<@`, `^@>`, `^@`, `^~`) | **Out of scope** — PG testing helpers only |
| GiST / hash index DDL (`gist_ltree_ops`, `siglen`) | **Out of scope** — Prisma Next index system (no extension hook yet) |
| B-tree comparison (`<`, `=`, `>`, …) on `ltree` | **Core** — via `equality` + `order` codec traits, not extension ops |
| `lquery` / `ltxtquery` as column types | **Out of scope** — patterns are validated string params |
| `@db.Ltree` in PSL | **Out of scope** — requires prisma-next core hook (ADR-004) |
| Non-Postgres targets | **Out of scope** |

---

## Codec & Contract

| Feature                                                                  | Status       | Notes                                                   |
| ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------- |
| `pg/ltree@1` codec (string↔string, label validation)                     | supported    | Case 1, traits `['equality','order']`, constant factory |
| `pg/ltree-array@1` codec (`string[]`↔`string[]`, per-element validation) | supported    | Mirrors core `pg/text-array@1` pattern (ADR-003); trait `equality` only (no `order`) |
| `ltree()` column helper                                                  | supported    | Non-parameterized; `nativeType: 'ltree'`                |
| `ltreeArray()` column helper                                             | supported    | Non-parameterized; `nativeType: 'ltree[]'`              |
| `CREATE EXTENSION IF NOT EXISTS ltree` migration                         | supported    | invariantId `ltree:install-ltree-v1`                    |
| Contract storage type `ltree` (codec-instance)                           | supported    | TS + PSL lanes (ADR-004)                                |
| Contract storage type `ltree[]` (codec-instance)                         | supported    | ADR-003                                                 |
| `lquery` as a column type                                                | out-of-scope | By decision — lquery is a validated string param        |
| `ltxtquery` as a column type                                             | out-of-scope | By decision — ltxtquery is a validated string param     |
| `@db.Ltree` / `@db.Ltree[]` PSL native attributes                        | out-of-scope | No extension hook in prisma-next `contract-psl` (ADR-004); use `ltree.Ltree()` / `ltree.LtreeArray()` |
| Non-Postgres targets (SQLite, Mongo, …)                                  | out-of-scope | Postgres `ltree` extension only                         |

### Validation caveats

| Behavior | Status | Notes |
| -------- | ------ | ----- |
| `ltree` label charset | supported (stricter) | Codec allows `[A-Za-z0-9_-]` per label; PostgreSQL is locale-dependent and may accept a wider alphabet |
| Empty `ltree` path (`""`) | rejected at encode | Codec requires a non-empty string; PostgreSQL allows zero labels in principle |
| `lquery` / `ltxtquery` syntax check at bind time | not validated | Patterns bind as `text` / `text[]` and cast in SQL; invalid syntax fails at query execution |
| `lca` arity cap (8 paths) | PG-enforced | Types do not cap variadic args; >8 paths is a runtime PostgreSQL error |

---

## Hierarchy Operators (→ `pg/bool@1`)

| SQL              | API method                 | Status    | Tier |
| ---------------- | -------------------------- | --------- | ---- |
| `ltree @> ltree` | `path.isAncestorOf(rhs)`   | supported | 1    |
| `ltree <@ ltree` | `path.isDescendantOf(rhs)` | supported | 1    |

Comparison operators (`=`, `<>`, `<`, `<=`, `>=`, `>`) on `ltree` columns are **not**
extension methods — they come from prisma-next core via the `pg/ltree@1` codec's
`equality` and `order` traits.

---

## Pattern-Matching Operators (→ `pg/bool@1`)

| SQL                 | API method                          | Arg      | Status    | Tier |
| ------------------- | ----------------------------------- | -------- | --------- | ---- |
| `ltree ~ lquery`    | `path.matchesLquery(pattern)`       | string   | supported | 1    |
| `ltree ? lquery[]`  | `path.matchesLqueryArray(patterns)` | string[] | supported | 1    |
| `ltree @ ltxtquery` | `path.matchesLtxtquery(query)`      | string   | supported | 1    |

### Reversed-operand equivalents (out of scope)

PostgreSQL also allows the pattern on the left (`lquery ~ ltree`, `lquery[] ? ltree`,
`ltxtquery @ ltree`). prisma-ltree does not expose these because the query-operation
model is column-centric: call the method on the `ltree` column instead.

| SQL (reversed)      | Workaround                          | Status       |
| ------------------- | ----------------------------------- | ------------ |
| `lquery ~ ltree`    | `path.matchesLquery(pattern)`       | out-of-scope |
| `lquery[] ? ltree`  | `path.matchesLqueryArray(patterns)` | out-of-scope |
| `ltxtquery @ ltree` | `path.matchesLtxtquery(query)`      | out-of-scope |

---

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
| `lca(ltree[])`                | `paths.lca()`                 | `pg/ltree@1` | planned — array receiver exists (ADR-003); method deferred | 1    |

---

## Concatenation (→ `pg/ltree@1`)

| SQL                | API method                | Status    | Tier |
| ------------------ | ------------------------- | --------- | ---- |
| `ltree \|\| ltree` | `path.concat(rhs)`        | supported | 2    |
| `ltree \|\| text`  | `path.concatText(label)`  | supported | 2    |
| `text \|\| ltree`  | `path.prependText(label)` | supported | 2    |

`prependText` keeps the ltree column as the receiver even though it is the right
operand of `text || ltree` (ADR-002).

---

## Conversion

| SQL                 | API method             | Returns      | Status                                | Tier |
| ------------------- | ---------------------- | ------------ | ------------------------------------- | ---- |
| `ltree2text(ltree)` | `path.toText()`        | `pg/text@1`  | supported                             | 2    |
| `text2ltree(text)`  | `text.toLtree()`       | `pg/ltree@1` | supported (text-rooted; ADR-002)      | 2    |
| `text2ltree(text)`  | `Ltree.fromText(text)` | `pg/ltree@1` | planned — self-less constructor (SPI) | 2    |

`toLtree` is the reachable form of `text2ltree`: it is rooted on `pg/text@1` and
surfaces as a method on text columns (ADR-002). The self-less constructor spelling
`Ltree.fromText()` remains `planned` pending a free-function call surface.

---

## Array First-Match Operators (→ `pg/ltree@1`)

Receiver is `ltree[]` via `pg/ltree-array@1` (ADR-003).

| SQL                    | API method                         | Status    | Tier |
| ---------------------- | ---------------------------------- | --------- | ---- |
| `ltree[] ?@> ltree`    | `paths.firstAncestorOf(rhs)`       | supported | 3    |
| `ltree[] ?<@ ltree`    | `paths.firstDescendantOf(rhs)`     | supported | 3    |
| `ltree[] ?~ lquery`    | `paths.firstMatchLquery(pattern)`  | supported | 3    |
| `ltree[] ?@ ltxtquery` | `paths.firstMatchLtxtquery(query)` | supported | 3    |

---

## Out-of-Scope (Tracked)

### Boolean `ltree[]` operators (array receiver)

These return **boolean** ("does any array element match?") rather than the first
matching path. Deferred as lower-value once first-match ops exist; low marginal cost
to add later.

| Feature              | SQL                   | Status       | Reason / Revisit                                      |
| -------------------- | --------------------- | ------------ | ----------------------------------------------------- |
| Boolean array variant | `ltree[] @> ltree`    | out-of-scope | "Less useful" per scope; revisit after Tier 3           |
| Boolean array variant | `ltree[] <@ ltree`    | out-of-scope | same                                                  |
| Boolean array variant | `ltree[] ~ lquery`    | out-of-scope | same                                                  |
| Boolean array variant | `ltree[] ? lquery[]`  | out-of-scope | same                                                  |
| Boolean array variant | `ltree[] @ ltxtquery` | out-of-scope | same                                                  |

### Cross-side scalar-vs-array booleans

PostgreSQL documents commutative forms where a scalar `ltree` is compared against an
`ltree[]` column (e.g. `ltree <@ ltree[]` ≡ `ltree[] @> ltree`). None are exposed;
use first-match ops, unnest, or raw SQL.

| Feature                    | SQL                   | Status       | Reason / Revisit                          |
| -------------------------- | --------------------- | ------------ | ----------------------------------------- |
| Scalar ancestor-in-array   | `ltree <@ ltree[]`    | out-of-scope | No `pg/ltree@1` method; use workarounds   |
| Scalar descendant-in-array | `ltree @> ltree[]`    | out-of-scope | same                                      |
| (array-side equivalents)   | `ltree[] @> ltree`    | out-of-scope | listed above                              |
| (array-side equivalents)   | `ltree[] <@ ltree`    | out-of-scope | listed above                              |

### Indexes & DDL

Index DDL is owned by Prisma Next's contract index model, not extension query ops.
GiST is the index type that accelerates hierarchy and pattern operators (`@>`, `<@`,
`~`, `?`, `@`); without it, those filters fall back to sequential scans.

| Feature                                 | SQL                   | Status       | Reason / Revisit                                                                             |
| --------------------------------------- | --------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| GiST index (`gist_ltree_ops`, `siglen`) | DDL                   | out-of-scope | No prisma-next extension hook for custom opclasses / `siglen`; track upstream index APIs       |
| GiST array index (`gist__ltree_ops`)    | DDL                   | out-of-scope | same                                                                                         |
| Hash index over `ltree`                 | DDL                   | out-of-scope | same                                                                                         |
| B-tree index over `ltree`               | DDL                   | out-of-scope | Declarable via core index APIs when `order` trait is present; no extension op needed           |

### Other PostgreSQL surfaces

| Feature | Status | Notes |
| ------- | ------ | ----- |
| Non-index operators `^<@`, `^@>`, `^@`, `^~` | out-of-scope | PG docs: "useful only for testing purposes" |
| `ltree_plpython3u` PL/Python transforms | out-of-scope | Separate contrib module; not part of this pack |
| Custom SQL helpers (e.g. `ins_label` from PG examples) | out-of-scope | Application-defined; compose from shipped ops |

---

## Changelog

- 2026-06-19 — Initial matrix created from spec. All in-scope features `planned`; out-of-scope features tracked with reasons.
- 2026-06-19 — Tier 1 complete (Checkpoint 2). Codec/contract/migration + all Tier 1 operators (hierarchy, pattern-match) and scalar functions (`nlevel`, `subltree`, `subpath`, `indexOf`, `lca`) → `supported`, each with golden + PGlite integration + type-level coverage. `lca` is a variadic method requiring ≥2 paths (ADR-001); the `ltree[]` array form remains `planned`.
- 2026-06-19 — Tier 2 complete (Checkpoint 3). Concatenation (`concat`, `concatText`, `prependText`) and conversion (`toText`, `toLtree`) → `supported`, each with golden + PGlite integration + type-level coverage. Free-function lowering resolved by re-rooting on a natural `self` (ADR-002): `text2ltree` ships as `text.toLtree()` (text-rooted); the self-less `Ltree.fromText()` constructor stays `planned` pending a free-function call surface.
- 2026-06-19 — Tier 3 complete (Checkpoint 4). Array receiver resolved via dedicated `pg/ltree-array@1` codec + `ltreeArray()` column helper (ADR-003). All four first-match operators → `supported` with golden + PGlite integration + type-level coverage. `lca(ltree[])` remains `planned` as `paths.lca()` — mechanism unblocked, method not in Tier 3 scope.
- 2026-06-19 — Phase 6 polish. Coverage threshold set to 95% in `vite.config.ts`; gaps filled to **100%** statements/branches/functions/lines (116 tests). Package `README.md` and per-tier `docs/progress/` logs written. Matrix verified accurate against shipped surface (no status changes). Pending: npm publish over the `0.0.1` stub (Task 6.3, awaiting approval).
- 2026-07-06 — Coverage audit. Added summary table, reversed-operand pattern ops, cross-side scalar/array booleans, validation caveats, comparison/index notes, and `@db.Ltree` / non-Postgres rows. No shipped API changes.
