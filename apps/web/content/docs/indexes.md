---
title: Add a GiST index
description: Index path columns so ancestor, descendant, and pattern queries can use an index
---

**GiST required:** ancestor, descendant, and pattern queries on `ltree` (and most of the `ltree[]` boolean checks) need a Generalized Search Tree (GiST) index. Prisma’s default B-tree only helps equality and ordered comparisons (`<`, `=`, `>`). Without GiST, those hierarchy and pattern queries still run, and PostgreSQL reads every row.

Declare GiST in your contract, then emit and migrate. For sort and equality via codec traits, see [Sort and compare paths](/docs/comparison).

## Which operators need GiST

| Receiver  | Methods that use GiST when indexed                                                          | Notes                                |
| --------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `ltree`   | `isAncestorOf`, `isDescendantOf`, `matchesLquery`, `matchesLqueryArray`, `matchesLtxtquery` | Opclass `gist_ltree_ops`             |
| `ltree[]` | `containsDescendantOf`, `matchesAnyLquery`, `matchesAnyLqueryArray`, `matchesAnyLtxtquery`  | Opclass `gist__ltree_ops`            |
| `ltree[]` | `containsAncestorOf`                                                                        | **Not** indexed by `gist__ltree_ops` |

First-match operators (`firstAncestorOf`, …) return a path value; they are not the same as the boolean predicates above. Scalar concat and conversion methods do not use GiST.

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

Use `type: "gist"` on an `ltree[]` column too (`ltree.LtreeArray()` or `ltreeArray()`). That index serves `containsDescendantOf` and the three `matchesAny*` methods. It does not serve `containsAncestorOf`. See [Array boolean operators](/docs/operations/array-boolean).

You can keep `@unique` on the column. That unique constraint is a B-tree, and GiST is a second index.

## Cross-links from operators

- [Hierarchy operators](/docs/operations/hierarchy) (`isAncestorOf`, `isDescendantOf`)
- [Pattern matching operators](/docs/operations/pattern-matching)
- [Array boolean operators](/docs/operations/array-boolean)

## Prisma doesn’t support `siglen` yet

`siglen` is a PostgreSQL operator-class argument (`gist_ltree_ops(siglen=N)`). You can’t pass it in `@@index` or in TypeScript `options`.

Your index uses PostgreSQL defaults: 8 bytes for `ltree`, 28 bytes for `ltree[]`. Ancestor, descendant, and pattern queries still use the index.

If you need a different `siglen`, create the index in SQL yourself. Prisma won’t manage that index on later `db update` runs.
