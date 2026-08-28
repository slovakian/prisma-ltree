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

These operators use a Generalized Search Tree (GiST) index. Add `@@index([path], type: "gist")` so PostgreSQL can avoid a sequential scan. See [Add a GiST index](/docs/indexes).
