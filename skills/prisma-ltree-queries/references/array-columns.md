# Array columns (`ltree[]`) and first-match operators

Read when the user has an **`ltree[]` column** or asks for **the first matching path in a list**.

## Contract setup

Declare with `ltreeArray()`, not `ltree()`:

```typescript
import { ltreeArray } from "prisma-ltree/column-types";

altPaths: field.column(ltreeArray()),
```

Codec: `pg/ltree-array@1` — validates each array element with the same label rules as scalar ltree.

## Why a separate column type

Prisma Next registers query operations by **exact codec id** on the receiver column. Scalar hierarchy methods (`isDescendantOf`, …) bind to `pg/ltree@1`. Array first-match methods bind to `pg/ltree-array@1`. You cannot call `firstAncestorOf` on a scalar column or `isDescendantOf` on an array column.

## First-match methods

Return the **first** array element matching the predicate, as `ltree` (nullable if none):

| Method                         | SQL operator           | Meaning                                      |
| ------------------------------ | ---------------------- | -------------------------------------------- |
| `paths.firstAncestorOf(arg)`   | `ltree[] ?@> ltree`    | First array entry that is an ancestor of arg |
| `paths.firstDescendantOf(arg)` | `ltree[] ?<@ ltree`    | First entry that is a descendant of arg      |
| `paths.firstMatchLquery(pat)`  | `ltree[] ?~ lquery`    | First entry matching pattern                 |
| `paths.firstMatchLtxtquery(q)` | `ltree[] ?@ ltxtquery` | First entry matching ltxtquery               |

"First" follows PostgreSQL array order — not semantic ranking. If the user needs a specific choice among matches, filter in application logic or normalize array order on write.

## Example

```typescript
sql
  .from(tables.node)
  .select({
    id: tables.node.columns.id,
    match: tables.node.columns.paths.firstDescendantOf(param("prefix")),
  })
  .build({ params: { prefix: "Top.Science" } });
```

## Array boolean checks

Existence predicates (→ boolean), distinct names from scalar methods (ADR-007):

| Method                                  | SQL                   | Meaning                            |
| --------------------------------------- | --------------------- | ---------------------------------- |
| `paths.containsAncestorOf(arg)`         | `ltree[] @> ltree`    | Array contains an ancestor of arg  |
| `paths.containsDescendantOf(arg)`       | `ltree[] <@ ltree`    | Array contains a descendant of arg |
| `paths.matchesAnyLquery(pat)`           | `ltree[] ~ lquery`    | Any entry matches pattern          |
| `paths.matchesAnyLqueryArray(patterns)` | `ltree[] ? lquery[]`  | Any entry matches any pattern      |
| `paths.matchesAnyLtxtquery(q)`          | `ltree[] @ ltxtquery` | Any entry matches ltxtquery        |

Use first-match when you need the matching path back; use these when you only need a boolean filter. A GiST index on `ltree[]` serves `containsDescendantOf` and the three `matchesAny*` methods (not `containsAncestorOf`).

## Also on array columns

- `paths.lcaAll()` — `lca(ltree[])` (zero-arg; returns NULL for an empty array)
