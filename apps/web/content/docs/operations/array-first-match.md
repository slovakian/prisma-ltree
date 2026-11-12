---
title: Array first-match operators
description: Return the first matching path from an ltree[] column
---

First-match operators run on `ltree[]` columns (`ltreeArray()` / `ltree.LtreeArray()`). Each method returns the **first** array element that matches the predicate as an `ltree` value, or SQL `NULL` when none match. "First" follows PostgreSQL array order, not ranking.

Declare the column with `ltreeArray()` (TypeScript) or `ltree.LtreeArray()` (PSL). See [Author ltree columns](/docs/authoring). For boolean existence checks on the same column, see [Array boolean operators](/docs/operations/array-boolean).

```typescript
import { db } from "../prisma/db";
```

## firstAncestorOf()

Returns the first array entry that is an ancestor of the argument (`ltree[] ?@> ltree`).

```typescript
const rows = await db.orm.Page.select("id", {
  match: (p) => p.breadcrumbs.firstAncestorOf("Top.Science.Astronomy"),
}).all();
```

**SQL equivalent:** `breadcrumbs ?@> $1::ltree`

## firstDescendantOf()

Returns the first array entry that is a descendant of the argument (`ltree[] ?<@ ltree`).

```typescript
const rows = await db.orm.Page.select("id", {
  match: (p) => p.breadcrumbs.firstDescendantOf("Top.Science"),
}).all();
```

**SQL equivalent:** `breadcrumbs ?<@ $1::ltree`

## firstMatchLquery()

Returns the first array entry that matches an `lquery` pattern (`ltree[] ?~ lquery`).

```typescript
const rows = await db.orm.Page.select("id", {
  match: (p) => p.breadcrumbs.firstMatchLquery("*.Astronomy.*"),
}).all();
```

**SQL equivalent:** `breadcrumbs ?~ $1::lquery`

## firstMatchLtxtquery()

Returns the first array entry that matches an `ltxtquery` (`ltree[] ?@ ltxtquery`).

```typescript
const rows = await db.orm.Page.select("id", {
  match: (p) => p.breadcrumbs.firstMatchLtxtquery("science & astronomy"),
}).all();
```

**SQL equivalent:** `breadcrumbs ?@ $1::ltxtquery`

## When to use first-match vs boolean

Use first-match when you need the matching path back in the result. Use [Array boolean operators](/docs/operations/array-boolean) when you only need a yes/no filter in `.where()`.

Array LCA is `lcaAll()` on the same receiver: [Lowest common ancestor](/docs/operations/lca).
