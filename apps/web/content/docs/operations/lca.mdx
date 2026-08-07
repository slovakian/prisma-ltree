---
title: Lowest Common Ancestor
description: Compute the shared ancestor of two or more ltree paths
---

The lowest common ancestor (LCA) is the deepest path that is an ancestor of every input. For example, the LCA of `Top.Science.Astronomy` and `Top.Science.Physics` is `Top.Science`.

```typescript
import { db } from "../prisma/db";
```

## lcaAll()

`lcaAll()` computes the LCA across all paths held in an `ltree[]` column. It takes no arguments — the array column is the input.

```typescript
const rows = await db.orm.Page.select("id", {
  ancestor: (p) => p.breadcrumbs.lcaAll(),
}).all();
```

**SQL equivalent:** `lca(breadcrumbs)`

An empty array yields `null`.

Use `ltreeArray()` (TypeScript) or `ltree.LtreeArray()` (PSL) for the `ltree[]` column — see [Authoring Contracts](/docs/authoring).

## lca()

For separate `ltree` paths rather than an array column, use `lca()` on a path column. It takes one or more additional paths (2–8 total, per PostgreSQL).

```typescript
const rows = await db.orm.Page.select("id", {
  ancestor: (p) => p.path.lca("Top.Science.Physics"),
}).all();
```

**SQL equivalent:** `lca(path, $1::ltree)`
