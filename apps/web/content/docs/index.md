---
title: prisma-ltree
description: PostgreSQL ltree extension for Prisma 8
---

PostgreSQL `ltree` stores hierarchical tree data. This extension pack adds typed codecs, query operators, and a baseline migration so you can query that data from Prisma 8 without raw SQL.

Author your contract in either lane. Both emit the same compiled result:

- **PSL**: `contract.prisma` with `ltree.Ltree()` and `ltree.LtreeArray()`
- **TypeScript**: `contract.ts` with `defineContract` and `ltree()` / `ltreeArray()`

See [Author ltree columns](/docs/authoring) for side-by-side examples. The [Get started](/docs/getting-started) guide covers install, runtime wiring, migrations, and your first queries.

Add a [GiST index](/docs/indexes) on path columns so ancestor, descendant, and pattern queries can use an index.

## The ltree type

The PostgreSQL `ltree` type stores dot-separated path labels (e.g. `Top.Science.Astronomy`). It fits org hierarchies, category trees, taxonomies, and any model where ancestor or descendant queries matter.

## Query operations

- [Hierarchy operators](/docs/operations/hierarchy): ancestor and descendant checks
- [Pattern matching operators](/docs/operations/pattern-matching): `lquery` and `ltxtquery` patterns
- [Lowest common ancestor](/docs/operations/lca): shared ancestor of paths, including `ltree[]` columns
