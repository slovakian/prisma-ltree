---
title: prisma-ltree
description: PostgreSQL ltree extension for Prisma 8
---

PostgreSQL `ltree` stores hierarchical tree data. This extension pack adds typed codecs, query operators, and a baseline migration so you can query that data from Prisma 8 without raw SQL.

Author your contract in either lane. Both emit the same compiled result:

- **PSL**: `contract.prisma` with `ltree.Ltree()` and `ltree.LtreeArray()`
- **TypeScript**: `contract.ts` with `defineContract` and `ltree()` / `ltreeArray()`

See [Author ltree columns](/docs/authoring) for side-by-side examples. The [Get started](/docs/getting-started) guide covers install, runtime wiring, migrations, and your first queries.

## Indexes and sorting

**GiST required** for ancestor, descendant, and pattern queries: add [a GiST index](/docs/indexes) on path columns (`@@index([path], type: "gist")`). Without it, those filters still run as sequential scans.

B-tree comparison and `orderBy` come from the codec traits `equality` and `order` on `pg/ltree@1`. This pack does not add `<` / `>` methods. See [Sort and compare paths](/docs/comparison).

## The ltree type

The PostgreSQL `ltree` type stores dot-separated path labels (e.g. `Top.Science.Astronomy`). It fits org hierarchies, category trees, taxonomies, and any model where ancestor or descendant queries matter.

## Query operations

- [Hierarchy operators](/docs/operations/hierarchy): ancestor and descendant checks (`isAncestorOf`, `isDescendantOf`)
- [Pattern matching operators](/docs/operations/pattern-matching): `lquery` and `ltxtquery` patterns
- [Scalar path functions](/docs/operations/scalars): `nlevel`, `subltree`, `subpath`, `indexOf`
- [Concatenation and conversion](/docs/operations/concatenation): `concat`, `concatText`, `prependText`, `toText`, `toLtree`
- [Lowest common ancestor](/docs/operations/lca): `lca` and `lcaAll`
- [Array first-match operators](/docs/operations/array-first-match): first matching path in `ltree[]`
- [Array boolean operators](/docs/operations/array-boolean): existence checks on `ltree[]`
