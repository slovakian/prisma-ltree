---
title: Array boolean operators
description: Existence checks on ltree[] columns (ancestor, descendant, patterns)
---

Array boolean operators run on `ltree[]` columns and return a boolean: whether **any** element satisfies the predicate. Method names differ from the scalar forms (`isAncestorOf`, `matchesLquery`, …) because Prisma 8 keys operations by name only.

Declare the column with `ltreeArray()` or `ltree.LtreeArray()`. For the first matching path as a value, see [Array first-match operators](/docs/operations/array-first-match).

```typescript
import { db } from "../prisma/db";
```

## containsAncestorOf()

True when the array contains an ancestor of the argument (`ltree[] @> ltree`).

```typescript
const rows = await db.orm.Page.where((p) =>
  p.breadcrumbs.containsAncestorOf("Top.Science.Astronomy"),
)
  .select("id")
  .all();
```

**SQL equivalent:** `breadcrumbs @> $1::ltree`

**GiST:** `gist__ltree_ops` does **not** index this operator. Prefer `containsDescendantOf` when you can rewrite the predicate, or accept a sequential scan. See [Add a GiST index](/docs/indexes).

## containsDescendantOf()

True when the array contains a descendant of the argument (`ltree[] <@ ltree`).

```typescript
const rows = await db.orm.Page.where((p) => p.breadcrumbs.containsDescendantOf("Top.Science"))
  .select("id")
  .all();
```

**SQL equivalent:** `breadcrumbs <@ $1::ltree`

**GiST required** for index use: declare `@@index([breadcrumbs], type: "gist")` on the `ltree[]` column. See [Add a GiST index](/docs/indexes).

## matchesAnyLquery()

True when any array entry matches an `lquery` pattern (`ltree[] ~ lquery`).

```typescript
const rows = await db.orm.Page.where((p) => p.breadcrumbs.matchesAnyLquery("*.Astronomy.*"))
  .select("id")
  .all();
```

**SQL equivalent:** `breadcrumbs ~ $1::lquery`

**GiST required** for index use: [Add a GiST index](/docs/indexes).

## matchesAnyLqueryArray()

True when any array entry matches any pattern in a `string[]` (`ltree[] ? lquery[]`).

```typescript
const rows = await db.orm.Page.where((p) =>
  p.breadcrumbs.matchesAnyLqueryArray(["*.Astronomy.*", "Top.Science.*"]),
)
  .select("id")
  .all();
```

**SQL equivalent:** `breadcrumbs ? $1::lquery[]`

**GiST required** for index use: [Add a GiST index](/docs/indexes).

## matchesAnyLtxtquery()

True when any array entry matches an `ltxtquery` (`ltree[] @ ltxtquery`).

```typescript
const rows = await db.orm.Page.where((p) =>
  p.breadcrumbs.matchesAnyLtxtquery("science & astronomy"),
)
  .select("id")
  .all();
```

**SQL equivalent:** `breadcrumbs @ $1::ltxtquery`

**GiST required** for index use: [Add a GiST index](/docs/indexes).

## Index summary

| Method                  | Indexed by `gist__ltree_ops`? |
| ----------------------- | ----------------------------- |
| `containsAncestorOf`    | No                            |
| `containsDescendantOf`  | Yes                           |
| `matchesAnyLquery`      | Yes                           |
| `matchesAnyLqueryArray` | Yes                           |
| `matchesAnyLtxtquery`   | Yes                           |
