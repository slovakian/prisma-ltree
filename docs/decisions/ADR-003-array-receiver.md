# ADR-003: Array receiver — dedicated `pg/ltree-array@1` codec

**Status:** Accepted
**Date:** 2026-06-19
**Phase/Task:** Phase 5, Task 5.1 (Tier 3 — array first-match ops)

## Context

Tier 3 adds four PostgreSQL operators whose **left operand is `ltree[]`**, not `ltree`:

| SQL                    | Returns |
| ---------------------- | ------- |
| `ltree[] ?@> ltree`    | `ltree` |
| `ltree[] ?<@ ltree`    | `ltree` |
| `ltree[] ?~ lquery`    | `ltree` |
| `ltree[] ?@ ltxtquery` | `ltree` |

Each returns the **first** matching array entry (or `NULL` when none match). The spec
surfaces these as methods on an `ltree[]` column receiver — e.g.
`paths.firstAncestorOf(rhs)`.

The prisma-next operation model is `self`-centric (ADR-001, ADR-002): every
`QueryOperationTypeEntry` declares a `self` codec, and the ORM client registers the
operation on every column whose `codecId` matches `self.codecId`
(`packages/3-extensions/sql-orm-client/src/model-accessor.ts:99`). Tier 3 therefore
requires a concrete answer to: **how is an `ltree[]` column represented in the codec
registry and contract?**

Three candidates were on the table:

1. **Dedicated array codec** — register `pg/ltree-array@1` with `nativeType: 'ltree[]'`,
   mirroring core's `pg/text-array@1` / `text[]`.
2. **Array-of-ltree expressions without a column codec** — build `ltree[]` values ad hoc
   in operation args (e.g. cast a `string[]` param) while keeping `self` on scalar
   `pg/ltree@1`.
3. **Reuse core `pg/text-array@1`** — bind the receiver as `text[]` and cast
   `::ltree[]` in-template.

### What the source says (verified against `.sync/prisma-next/`)

- Core Postgres ships a first-class **`pg/text-array@1`** codec
  (`packages/3-targets/3-targets/postgres/src/core/codecs.ts:172–203`): non-parameterized,
  `nativeType: 'text[]'`, JS wire/input `string[]`, identity encode/decode. The SQL
  renderer emits `$N::text[]` for bind params outside the adapter's inferrable set
  (ADR 205 cast policy).
- The **`textArray()` column helper** wires columns to that codec id
  (`packages/3-targets/3-targets/postgres/src/contract-free/columns.ts:28`).
- Extension packs register additional codec descriptors in their runtime registry; the
  model-accessor matches **`self.codecId` exactly** — there is no "element codec" or
  generic array-composition SPI on the SQL/Postgres side (Mongo's `element: { kind:
'leaf', codecId: … }` shape does not apply here).
- ADR 210 notes the codec registry has no higher-order "list of T" factory; each array
  native type is its own codec id. Extensions follow the same pattern as scalars (pgvector
  registers `pg/vector@1`; ltree registers `pg/ltree@1`).

All four Tier 3 SQL forms were smoke-tested executable under PGlite before this
decision (`ARRAY['Top.Science','Top.Hobbies']::ltree[] ?@> 'Top.Science.Astronomy'::ltree`
→ `'Top.Science'`, etc.).

## Decision

**Adopt candidate 1 — a dedicated `pg/ltree-array@1` codec and column helper, mirroring
`pg/text-array@1`.**

Concretely:

| Artifact         | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Codec id         | `pg/ltree-array@1`                                                                         |
| Native type      | `ltree[]`                                                                                  |
| JS input/output  | `readonly string[]` with per-element `assertValidLtree` on encode/json                     |
| Traits           | `['equality']` (same as `text[]`; no order trait on arrays)                                |
| Column helper    | `ltreeArray()` → `{ codecId, nativeType: 'ltree[]' }`                                      |
| Contract storage | `ltreeArray` key (valid identifier for emit); `nativeType: 'ltree[]'`                      |
| Tier 3 `self`    | `{ codecId: 'pg/ltree-array@1' }` on all four first-match ops                              |
| Return type      | `pg/ltree@1` (SQL may return NULL; typed `nullable: false` like other ltree-returning ops) |

Operations lower with the same cast-in-template pattern established in Tier 1:

| Method                | Template                            | Arg codec    |
| --------------------- | ----------------------------------- | ------------ |
| `firstAncestorOf`     | `{{self}} ?@> {{arg0}}`             | `pg/ltree@1` |
| `firstDescendantOf`   | `{{self}} ?<@ {{arg0}}`             | `pg/ltree@1` |
| `firstMatchLquery`    | `{{self}} ?~ ({{arg0}})::lquery`    | `pg/text@1`  |
| `firstMatchLtxtquery` | `{{self}} ?@ ({{arg0}})::ltxtquery` | `pg/text@1`  |

Hierarchy first-match args share the scalar ltree codec (no explicit cast — the codec
emits `::ltree`). Pattern args bind as text and cast in-template, identical to Tier 1
`matchesLquery` / `matchesLtxtquery`.

## Rationale

- **It is the only shape that surfaces correctly on `ltree[]` columns.** The
  model-accessor keys strictly on `codecId`. Without a registered `ltree[]` codec,
  no column carries `pg/ltree-array@1`, and array-receiver ops would never bind.
- **It follows an established core precedent, not a new SPI.** `pg/text-array@1`
  proves the framework already supports array native types as flat codecs. An extension
  array codec is a straight copy of that pattern with ltree label validation.
- **Candidate 2 (expression-only) fails the receiver requirement.** Re-rooting on scalar
  `pg/ltree@1` would register ops on ltree columns, not `ltree[]` columns — the wrong
  surface entirely.
- **Candidate 3 (`text[]` + cast) is the wrong contract.** Columns typed `text[]` would
  not match user schemas storing `ltree[]`; casts in-template would paper over a codec
  mismatch and break DDL/introspection fidelity.
- **Unblocks ADR-001/002 follow-ups non-breakingly.** Once `pg/ltree-array@1` exists,
  `lca(ltree[])` can ship as an array-receiver method without changing the Tier 1
  variadic `path.lca(...others)` form.

## Consequences

- `docs/feature-support.md`: add `pg/ltree-array@1` codec + `ltreeArray()` column helper
  as `supported`; Tier 3 first-match ops → `supported`.
- `lca(ltree[])` remained **`planned`** for the Tier 3 slice — Tier 3 scope was the four
  first-match operators only; the array-receiver _mechanism_ is what ADR-003 resolves.
- **Follow-up (2026-07-06):** `lca(ltree[])` shipped as `paths.lcaAll()` on
  `pg/ltree-array@1`. Not `paths.lca()` — prisma-next's flat operation registry forbids
  duplicate method names (ADR-113/214); scalar `path.lca(other, ...)` already registers
  `lca`.
- Pack codec count goes from 1 → 2; runtime registry, contract storage types, and
  control-plane hooks (`expandNativeType`, `resolveIdentityValue`) cover both ids.
- Golden tests assert `self` binds with `pg/ltree-array@1`; PGlite integration tests
  declare an `ltree[]` column and execute lowered SQL end-to-end.
- Boolean array variants (`ltree[] @> ltree`, etc.) stay **out-of-scope** per the spec;
  the same codec would make them low-cost follow-ups if revisited.

## Alternatives rejected

- **Expression-only / param-cast array** — cannot register on `ltree[]` columns; wrong
  ORM surface.
- **Reuse `pg/text-array@1`** — wrong native type and contract fidelity.
- **Defer Tier 3 to `planned`** — the SPI unknown is resolved; no framework change is
  required beyond registering a second flat codec, same as adding any new scalar type.
