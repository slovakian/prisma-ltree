---
title: Hierarchy operators
description: Ancestor and descendant checks for tree paths
---

Hierarchy operators check whether a row's `ltree` path is an ancestor or descendant of another path. They are methods on **ltree-typed fields** in the ORM lane (and on column references in the SQL query builder).

```typescript
import { db } from "../prisma/db";
```

PostgreSQL compares the **row's path as the left operand**:

| SQL      | Meaning                               |
| -------- | ------------------------------------- |
| `A @> B` | A is an **ancestor** of B (or equal)  |
| `A <@ B` | A is a **descendant** of B (or equal) |

Both comparisons are **inclusive** of the argument path.

## isAncestorOf()

Returns rows whose path is an ancestor of the argument.

```typescript
const rows = await db.orm.Category.where((c) => c.path.isAncestorOf("electronics.computers"))
  .select("id", "path")
  .all();
```

Given `electronics.computers` as the argument:

- `electronics`: matches (ancestor)
- `electronics.computers`: matches (`@>` is inclusive of equality)
- `electronics.computers.laptops`: does NOT match (descendant, not an ancestor)

**SQL equivalent:** `path @> $1::ltree`

## isDescendantOf()

Returns rows whose path is a descendant of the argument. This is the usual choice for "everything under this prefix."

```typescript
const rows = await db.orm.Category.where((c) => c.path.isDescendantOf("electronics"))
  .select("id", "path")
  .all();
```

Given `electronics` as the argument:

- `electronics`: matches (equal; `<@` is inclusive)
- `electronics.computers`: matches (child)
- `electronics.computers.laptops`: matches (grandchild)

**SQL equivalent:** `path <@ $1::ltree`

Mnemonic: **`isDescendantOf(prefix)`** → "my path sits under this prefix."

## Examples

**All subcategories under `electronics`:**

```typescript
const subcategories = await db.orm.Category.where((c) => c.path.isDescendantOf("electronics"))
  .select("id", "path")
  .all();
```

**All ancestors of a deep path:**

```typescript
const ancestors = await db.orm.Category.where((c) =>
  c.path.isAncestorOf("electronics.computers.laptops"),
)
  .select("id", "path")
  .all();
```

## ORM `using` helpers

Each scalar `ltree` field also gets two collection methods under `using`, named
after the field. They filter the same way as the operators above and chain with
`where` / `orderBy` / `limit` / `include`:

```typescript
const underElectronics = await db.orm.Category.using
  .path_descendants("electronics")
  .select("id", "path")
  .all();

const aboveLaptops = await db.orm.Category.using
  .path_ancestors("electronics.computers.laptops")
  .select("id", "path")
  .all();
```

| Method                         | Same as                                      |
| ------------------------------ | -------------------------------------------- |
| `using.path_descendants(root)` | `.where((c) => c.path.isDescendantOf(root))` |
| `using.path_ancestors(leaf)`   | `.where((c) => c.path.isAncestorOf(leaf))`   |

There is no separate `path_subtree` helper: under ltree, the subtree of a root
is exactly `path_descendants(root)`. List (`ltree[]`) fields do not get these
methods.

**GiST required** for index use: add `@@index([path], type: "gist")` so PostgreSQL can avoid a sequential scan. Without GiST, these filters still run and read every row. See [Add a GiST index](/docs/indexes).

For sorting paths or equality filters (not hierarchy), use framework comparison via codec traits: [Sort and compare paths](/docs/comparison).
