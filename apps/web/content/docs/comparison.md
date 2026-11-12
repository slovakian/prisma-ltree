---
title: Sort and compare paths
description: B-tree equality and order via codec traits — not pack-named operators
---

`pg/ltree@1` declares the codec traits `equality` and `order`. Those traits unlock Prisma 8’s built-in comparison and sort surfaces on the path field. This pack does **not** ship methods named after `<`, `>`, `<=`, or `>=`.

```typescript
import { db } from "../prisma/db";
```

## What the traits enable

| Trait      | What you get on an `ltree` field                                                               |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `equality` | Equality / inequality filters through the framework comparison API                             |
| `order`    | Ascending and descending sorts (for example `.orderBy` with `.asc()` / `.desc()` on the field) |

Exact method names come from Prisma 8’s query surface for codecs with those traits, not from `prisma-ltree`. Do not look for pack wrappers like `path.lessThan(...)` or `path.gt(...)`.

`ltree[]` (`pg/ltree-array@1`) declares `equality` only. It does not declare `order`.

## Sorting paths

Order rows by path with the framework’s field sort helpers:

```typescript
const rows = await db.orm.Category.orderBy((c) => c.path.asc())
  .select("id", "path")
  .all();
```

PostgreSQL’s B-tree order for `ltree` is label-aware path order. A default B-tree index (omit `type`, or set `type: "btree"`) helps equality and these ordered comparisons. It does **not** accelerate hierarchy or pattern operators.

## Hierarchy vs comparison

| Need                                     | Use                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Ancestor / descendant / patterns         | Pack methods: [Hierarchy](/docs/operations/hierarchy), [Pattern matching](/docs/operations/pattern-matching) |
| Sort by path or equality filters         | Framework comparison / `orderBy` via codec traits (this page)                                                |
| Fast hierarchy / pattern filters         | [GiST index](/docs/indexes) (`type: "gist"`)                                                                 |
| Fast equality / ordered comparisons only | B-tree (default index type)                                                                                  |

## Index choice

- **GiST** (`type: "gist"`): required for index use of `@>`, `<@`, `~`, `@`, `?` (and the array forms those opclasses cover). See [Add a GiST index](/docs/indexes).
- **B-tree**: covers `<`, `<=`, `=`, `>=`, `>` on scalar `ltree`. Useful when you sort or equality-filter paths without hierarchy predicates.
