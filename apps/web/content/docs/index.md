---
title: prisma-ltree
description: PostgreSQL ltree extension for Prisma Next
---

PostgreSQL `ltree` brings hierarchical tree data to **Prisma Next**. This extension pack gives you typed codecs, query operators, and a baseline migration for tree-structured data, with no raw SQL.

Author your contract in either lane and get the same compiled result:

- **PSL**: `contract.prisma` with `ltree.Ltree()` and `ltree.LtreeArray()`
- **TypeScript**: `contract.ts` with `defineContract` and `ltree()` / `ltreeArray()`

See [Authoring Contracts](/docs/authoring) for side-by-side examples. The [Getting Started](/docs/getting-started) guide covers install, runtime wiring, migrations, and your first queries.

## What is ltree?

The PostgreSQL `ltree` type stores dot-separated path labels (e.g. `Top.Science.Astronomy`). It fits org hierarchies, category trees, taxonomies, and any model where ancestor or descendant queries matter.

## Query Operations

- [Hierarchy Operators](/docs/operations/hierarchy): ancestor and descendant checks
- [Pattern Matching Operators](/docs/operations/pattern-matching): `lquery` and `ltxtquery` patterns
- [Lowest Common Ancestor](/docs/operations/lca): shared ancestor of paths, including `ltree[]` columns
