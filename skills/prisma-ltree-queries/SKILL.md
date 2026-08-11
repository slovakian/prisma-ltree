---
name: prisma-ltree-queries
description: >-
  Write prisma-ltree queries in Prisma Next — isAncestorOf, isDescendantOf,
  matchesLquery, matchesLqueryArray, matchesLtxtquery, nlevel, subltree,
  subpath, indexOf, lca, concat, concatText, prependText, toText, toLtree,
  firstAncestorOf, firstDescendantOf, firstMatchLquery, firstMatchLtxtquery,
  lcaAll on ltree and ltree[] columns. Use for "find descendants", "subtree query",
  "ancestor of", "category under prefix", "path pattern", "lquery", "ltxtquery",
  "path depth", "lowest common ancestor", "append path segment", "materialized
  path query", and SQL-builder or ORM filters on ltree fields. Load reference
  files for hierarchy direction, pattern syntax, or array columns when needed.
---

# prisma-ltree — Queries

> **Methods on ltree columns — hierarchy, patterns, scalars, concat, array first-match.**

Use this skill after `prisma-ltree-adoption` (or when ltree is already wired). Assumes Postgres target, `prisma-ltree/runtime` registered, and contract columns typed with `ltree()` or `ltreeArray()`.

## When to Use

- Filtering or projecting by tree structure (ancestors, descendants, depth).
- Pattern matching with `lquery` or full-text-style `ltxtquery`.
- Path manipulation (concat labels, subpath, LCA).
- `ltree[]` columns — first matching path in an array.

## When Not to Use

- Installing the extension or declaring columns → `prisma-ltree-adoption`.
- Generic Prisma Next query mechanics (transactions, pagination, ORM vs SQL lane choice) → upstream `prisma-8` → `references/queries.md` / `references/queries-postgres.md`.
- Debugging PN error envelopes → upstream `prisma-8` → `references/debug.md`.

## Key Concepts

- **Receiver column** — Methods bind to the column you call them on. Hierarchy direction follows PostgreSQL: `path.isAncestorOf(other)` means _this row's path is an ancestor of `other`_ (`path @> other`).
- **Two query lanes** — Same as Prisma Next Postgres:
  - **ORM** — `db.orm.Category.where((c) => c.path.isDescendantOf(value))`. Default lane; matches the package README.
  - **SQL builder** — `db.sql.category` (storage name) when you need explicit joins / projections the ORM cannot express.
- **Pattern args** — Plain strings (or `string[]` for `matchesLqueryArray`); the extension casts to `lquery` / `ltxtquery` in SQL.
- **Scalar vs array receiver** — `ltree()` / `ltree.Ltree()` columns get hierarchy, pattern, scalar, and concat methods. `ltreeArray()` / `ltree.LtreeArray()` columns get **first-match** methods (`firstAncestorOf`, …) plus `lcaAll()`.

## Pick a reference

Load selectively — do not read all references for every task:

| User need                                          | Read                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Ancestor/descendant direction, depth, subpath, LCA | [`references/hierarchy-and-paths.md`](./references/hierarchy-and-paths.md) |
| Wildcard / regex-like / full-text path patterns    | [`references/pattern-matching.md`](./references/pattern-matching.md)       |
| `ltree[]` column, first-match operators            | [`references/array-columns.md`](./references/array-columns.md)             |

## Workflow — ORM lane (typical)

```typescript
import { db } from "../prisma/db";

// Find every descendant of "Top.Science"
const rows = await db.orm.Category.where((c) => c.path.isDescendantOf("Top.Science"))
  .select("id", {
    depth: (c) => c.path.nlevel(),
  })
  .all();
```

The concept: call ltree methods on field proxies inside `.where()` / `.select()` exactly like core comparisons — the extension lowers to PostgreSQL operators (`@>`, `<@`, `~`, …).

Predicate helpers (`and`, `or`, ranges) follow the upstream `prisma-8` queries guide — ltree methods compose inside `.where()` lambdas like `.eq` on scalar fields.

### Operator quick map

| Goal                          | Method                                  | SQL-ish           |
| ----------------------------- | --------------------------------------- | ----------------- |
| Row path is ancestor of arg   | `path.isAncestorOf(arg)`                | `@>`              |
| Row path is descendant of arg | `path.isDescendantOf(arg)`              | `<@`              |
| Row path matches pattern      | `path.matchesLquery(pat)`               | `~`               |
| Row path matches any pattern  | `path.matchesLqueryArray(pats)`         | `?`               |
| Row path matches ltxtquery    | `path.matchesLtxtquery(q)`              | `@`               |
| Label depth                   | `path.nlevel()`                         | `nlevel(path)`    |
| Slice path                    | `path.subpath(off, len?)`               | `subpath(...)`    |
| LCA with other paths          | `path.lca(other, ...rest)`              | `lca(...)`        |
| Append path / label           | `path.concat(rhs)`, `concatText(label)` | `\|\|`            |
| Text column → ltree           | `textCol.toLtree()`                     | `text2ltree(...)` |
| Array first-match / LCA       | `paths.firstAncestorOf` / `lcaAll()`    | `?@>` / `lca([])` |

Full signatures and edge cases: reference files above.

## Workflow — SQL builder lane

Reach for `db.sql.<table>` when the ORM cannot express the shape (arbitrary joins, computed projections). Extension methods still live on ltree column accessors — compose them the same way, then `db.runtime().execute(plan)`. See upstream `prisma-8` → `references/queries-postgres.md` for SQL-builder mechanics.

## Common Pitfalls

1. **Reversed ancestor/descendant.** _"Under Top.Science"_ → `isDescendantOf("Top.Science")` on the row's path, not `isAncestorOf`. See hierarchy reference.
2. **Calling array methods on scalar columns** (or vice versa). `firstDescendantOf` requires `ltreeArray()` column type.
3. **`lca()` with no other path.** Requires at least one argument besides `self` — `path.lca(other)` minimum. Single-arg `path.lca()` is invalid (matches PostgreSQL).
4. **Using `@>` raw mentally but wrong method.** Read the method name against the reference table — do not guess from SQL memory alone.
5. **`prependText` receiver.** Keeps the ltree column as receiver even though SQL is `text || ltree` — call it on the ltree column, not the text column.
6. **`toLtree()` on text columns.** Conversion from plain text is rooted on `pg/text@1` columns (`textCol.toLtree()`), not on ltree columns.

## What prisma-ltree doesn't do yet

- **Raw SQL escape hatch for ltree** — use extension methods or file a gap if the SQL builder cannot express your shape. PN raw SQL story is framework-level (`prisma-8` queries guide).
- **`Ltree.fromText()` static constructor** — use `text.toLtree()` on text columns.
- **Automatic path maintenance on insert** — you build/store path strings; triggers or app logic maintain hierarchy.
- **GiST index helpers** — not in this extension.

Note: `paths.lcaAll()` **is supported** on `ltree[]` (array form of `lca`; named separately because operation keys must be unique — see ADR-005).

## Reference Files

- [`references/hierarchy-and-paths.md`](./references/hierarchy-and-paths.md)
- [`references/pattern-matching.md`](./references/pattern-matching.md)
- [`references/array-columns.md`](./references/array-columns.md)
- Feature matrix: https://github.com/slovakian/prisma-ltree/blob/main/docs/feature-support.md

## Checklist

- [ ] Confirmed column is `ltree()` vs `ltreeArray()` before choosing methods.
- [ ] Verified hierarchy direction against the user intent (ancestor vs descendant).
- [ ] For LCA on scalar columns, passed at least one `other` path (`path.lca(other, ...)`).
- [ ] For array LCA, used `paths.lcaAll()` on an `ltree[]` column.
- [ ] Loaded pattern-matching reference when user supplied `lquery` / `ltxtquery` syntax.
- [ ] Did not confabulate operators listed as out-of-scope in feature-support.md.
