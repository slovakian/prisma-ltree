# Progress Log — Tier 3 (Array First-Match Operators)

**Status:** ✅ Complete (Checkpoint 4)
**Phase:** 5

## Array receiver — ADR-003

Tier 3 operators take an `ltree[]` receiver. Resolved via a **dedicated `pg/ltree-array@1` codec**
mirroring core `pg/text-array@1` (`string[] ↔ string[]`, per-element validation, trait
`['equality']`), plus an `ltreeArray()` column helper (`nativeType: 'ltree[]'`).

Verified against `.sync/prisma-next/`: the model-accessor registers operations by exact
`self.codecId`, and there is no SQL-side element-codec SPI — so a standalone array codec is the
correct representation. All four Tier 3 SQL forms were smoke-tested under PGlite before coding.

See [ADR-003](../decisions/ADR-003-array-receiver.md).

## Operators (→ `pg/ltree@1`)

| Method                             | SQL                    |
| ---------------------------------- | ---------------------- |
| `paths.firstAncestorOf(rhs)`       | `ltree[] ?@> ltree`    |
| `paths.firstDescendantOf(rhs)`     | `ltree[] ?<@ ltree`    |
| `paths.firstMatchLquery(pattern)`  | `ltree[] ?~ lquery`    |
| `paths.firstMatchLtxtquery(query)` | `ltree[] ?@ ltxtquery` |

## Coverage

Golden + PGlite integration + type-level coverage for all four first-match operators.

`lca(ltree[])` remains `planned` as `paths.lca()` — the array-receiver mechanism is now unblocked,
but the method is not in Tier 3 scope. The boolean array variants (`ltree[] @> ltree`, etc.) remain
`out-of-scope` (low marginal value per the scope decision).

**Result:** `vp run ready` green; Tier 3 features `supported` in
[`feature-support.md`](../feature-support.md).
