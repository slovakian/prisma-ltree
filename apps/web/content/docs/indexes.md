---
title: Add a GiST index
description: Index path columns so ancestor, descendant, and pattern queries can use an index
---

Ancestor, descendant, and pattern queries on `ltree` need a Generalized Search Tree (GiST) index. Prisma’s default B-tree index only helps comparisons (`<`, `=`, `>`). Declare GiST in your contract, then emit and migrate.

## Why you need GiST

`isAncestorOf`, `isDescendantOf`, `matchesLquery`, and `matchesLtxtquery` use PostgreSQL operators that a B-tree doesn’t cover. Without GiST, those queries still run, and PostgreSQL reads every row.

## Declare GiST on the path column

Add `type: "gist"` on your path column. `Path` below is `ltree.Ltree()` from [Author ltree columns](/docs/authoring).

<!-- ::start:tabs -->

## PSL

This model indexes `path` with GiST:

```prisma title="contract.prisma"
model Page {
  id   String @id @default(uuid())
  path Path

  @@index([path], type: "gist")
  @@map("page")
}
```

## TypeScript

Index `path` with GiST. Pass `options: {}` because the TypeScript builder requires `options` whenever you set `type`:

```typescript title="contract.ts"
Page.sql(({ cols, constraints }) => ({
  table: "page",
  indexes: [
    constraints.index([cols.path], {
      type: "gist",
      options: {},
    }),
  ],
}));
```

<!-- ::end:tabs -->

Emit the contract:

```bash
pnpm prisma contract emit
```

Apply the change with `db update` or `migration plan`. Prisma creates a GiST index on the column:

```sql
CREATE INDEX … ON "page" USING "gist" ("path")
```

Use `type: "gist"` on an `ltree[]` column too (`ltree.LtreeArray()` or `ltreeArray()`).

You can keep `@unique` on the column. That unique constraint is a B-tree, and GiST is a second index.

## Prisma doesn’t support `siglen` yet

`siglen` is a PostgreSQL operator-class argument (`gist_ltree_ops(siglen=N)`). You can’t pass it in `@@index` or in TypeScript `options`.

Your index uses PostgreSQL defaults: 8 bytes for `ltree`, 28 bytes for `ltree[]`. Ancestor, descendant, and pattern queries still use the index.

If you need a different `siglen`, create the index in SQL yourself. Prisma won’t manage that index on later `db update` runs.
