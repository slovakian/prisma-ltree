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
- Generic Prisma Next query mechanics (transactions, pagination, ORM vs SQL lane choice) → `prisma-next-queries`.
- Debugging PN error envelopes → `prisma-next-debug`.

## Key Concepts

- **Receiver column** — Methods bind to the column you call them on. Hierarchy direction follows PostgreSQL: `path.isAncestorOf(other)` means _this row's path is an ancestor of `other`_ (`path @> other`).
- **Two query lanes** — Same as Prisma Next Postgres:
  - **SQL builder** — `sql.from(tables.category).where(tables.category.columns.path.isDescendantOf(param("p")))`. Primary examples below match the package README.
  - **ORM** — `db.orm.Category.where((c) => c.path.isDescendantOf(value))` when the contract exposes the model; extension ops appear on ltree-typed fields.
- **Params** — Use `param("name")` in the SQL builder and pass values in `.build({ params: { name: "Top.Science" } })`. Pattern args are plain strings (or `string[]` for `matchesLqueryArray`); the extension casts to `lquery` / `ltxtquery` in SQL.
- **Scalar vs array receiver** — `ltree()` columns get hierarchy, pattern, scalar, and concat methods. `ltreeArray()` columns get **first-match** methods only (`firstAncestorOf`, …).

## Pick a reference

Load selectively — do not read all references for every task:

| User need                                          | Read                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Ancestor/descendant direction, depth, subpath, LCA | [`references/hierarchy-and-paths.md`](./references/hierarchy-and-paths.md) |
| Wildcard / regex-like / full-text path patterns    | [`references/pattern-matching.md`](./references/pattern-matching.md)       |
| `ltree[]` column, first-match operators            | [`references/array-columns.md`](./references/array-columns.md)             |

## Workflow — SQL builder (typical)

Import shape varies by project; the operations live on **column accessors** from the emitted contract:

```typescript
import { sql, tables } from "../prisma/query"; // or your project's query module
import { param } from "@prisma-next/sql-query/param";

// All descendants of Top.Science (inclusive of Top.Science itself)
const descendants = sql
  .from(tables.category)
  .select({ id: tables.category.columns.id, path: tables.category.columns.path })
  .where(tables.category.columns.path.isDescendantOf(param("prefix")))
  .build({ params: { prefix: "Top.Science" } });

const rows = await db.runtime().execute(descendants);
```

The concept: compose `.where()` / `.select()` with ltree methods exactly like core column comparisons — the extension lowers to PostgreSQL operators (`@>`, `<@`, `~`, …) with typed `::ltree` casts on parameters.

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

Full signatures and edge cases: reference files above.

## Workflow — ORM lane

When the project uses `db.orm`, extension operations surface on ltree fields:

```typescript
const underScience = await db.orm.Category.where((c) => c.path.isDescendantOf("Top.Science"))
  .select("id", "path")
  .all();
```

Predicate helpers (`and`, `or`, ranges) follow `prisma-next-queries` — ltree methods compose inside `.where()` lambdas like `.eq` on scalar fields.

## Common Pitfalls

1. **Reversed ancestor/descendant.** _"Under Top.Science"_ → `isDescendantOf("Top.Science")` on the row's path, not `isAncestorOf`. See hierarchy reference.
2. **Calling array methods on scalar columns** (or vice versa). `firstDescendantOf` requires `ltreeArray()` column type.
3. **`lca()` with no other path.** Requires at least one argument besides `self` — `path.lca(other)` minimum. Single-arg `path.lca()` is invalid (matches PostgreSQL).
4. **Using `@>` raw mentally but wrong method.** Read the method name against the reference table — do not guess from SQL memory alone.
5. **`prependText` receiver.** Keeps the ltree column as receiver even though SQL is `text || ltree` — call it on the ltree column, not the text column.
6. **`toLtree()` on text columns.** Conversion from plain text is rooted on `pg/text@1` columns (`textCol.toLtree()`), not on ltree columns.

## What prisma-ltree doesn't do yet

- **Raw SQL escape hatch for ltree** — use extension methods or file a gap if the SQL builder cannot express your shape. PN raw SQL story is framework-level (`prisma-next-queries`).
- **`paths.lcaAll()` on `ltree[]`** — `lca(ltree[])`; scalar paths use `path.lca(other, ...)`.
- **`Ltree.fromText()` static constructor** — use `text.toLtree()` on text columns.
- **Automatic path maintenance on insert** — you build/store path strings; triggers or app logic maintain hierarchy.
- **GiST opclass typmod (`siglen`)** — declare `type: "gist"` indexes in the contract (Prisma Next 0.16+); `siglen` tuning remains out of scope.

## Reference Files

- [`references/hierarchy-and-paths.md`](./references/hierarchy-and-paths.md)
- [`references/pattern-matching.md`](./references/pattern-matching.md)
- [`references/array-columns.md`](./references/array-columns.md)
- Feature matrix: https://github.com/slovakian/prisma-ltree/blob/main/docs/feature-support.md

## Checklist

- [ ] Confirmed column is `ltree()` vs `ltreeArray()` before choosing methods.
- [ ] Verified hierarchy direction against the user intent (ancestor vs descendant).
- [ ] Used `param()` + `.build({ params })` for dynamic values in SQL builder.
- [ ] For LCA, passed at least one `other` path.
- [ ] Loaded pattern-matching reference when user supplied `lquery` / `ltxtquery` syntax.
- [ ] Did not confabulate operators listed as out-of-scope in feature-support.md.
