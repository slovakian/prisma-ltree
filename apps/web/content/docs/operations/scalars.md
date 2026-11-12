---
title: Scalar path functions
description: Depth, slices, and index lookup on ltree paths
---

Scalar functions project values from a single `ltree` path: label depth, path slices, and the position of a subpath. Use them in `.select()` projections (and in SQL-builder expressions). Lowest common ancestor lives on its own page: [Lowest common ancestor](/docs/operations/lca).

```typescript
import { db } from "../prisma/db";
```

## nlevel()

Returns the number of labels in the path (`int`).

```typescript
const rows = await db.orm.Category.select("id", "path", {
  depth: (c) => c.path.nlevel(),
}).all();
```

`electronics.computers` has depth `2`.

**SQL equivalent:** `nlevel(path)`

## subltree()

Extracts the labels from `start` (inclusive) to `end` (exclusive), by label index.

```typescript
const rows = await db.orm.Category.select("id", {
  mid: (c) => c.path.subltree(1, 3),
}).all();
```

For `Top.Science.Astronomy.Astrophysics`, `subltree(1, 3)` is `Science.Astronomy`.

**SQL equivalent:** `subltree(path, $1::int4, $2::int4)`

## subpath()

Extracts a slice by offset. Pass an optional length; omit it to keep the rest of the path.

```typescript
const rows = await db.orm.Category.select("id", {
  tail: (c) => c.path.subpath(1),
  two: (c) => c.path.subpath(0, 2),
}).all();
```

**SQL equivalent:** `subpath(path, $1::int4)` or `subpath(path, $1::int4, $2::int4)`

## indexOf()

Returns the 0-based position where `other` appears inside the path, or `-1` when it is absent. Pass an optional start offset.

```typescript
const rows = await db.orm.Category.select("id", {
  at: (c) => c.path.indexOf("Science"),
  later: (c) => c.path.indexOf("Astronomy", 2),
}).all();
```

**SQL equivalent:** `index(path, $1::ltree)` or `index(path, $1::ltree, $2::int4)`

## Direct children

PostgreSQL has no single "immediate child" operator. Prefer an `lquery` one-level pattern such as `electronics.*{1}` via [Pattern matching](/docs/operations/pattern-matching), or filter descendants where `nlevel()` equals the parent depth plus one.
