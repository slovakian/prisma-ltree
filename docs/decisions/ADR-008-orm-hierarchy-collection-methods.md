# ADR-008: ORM `{field}_descendants` / `{field}_ancestors` collection methods

**Status:** Accepted
**Date:** 2026-11-12

## Context

Prisma 8 packs can contribute ORM collection methods under `db.orm.<Model>.using.*`
via `SqlRuntimeExtensionDescriptor.collectionMethods` and declaration merging on
`@prisma/orm-family-sql/relational-core/collection-methods`. First-party
`@prisma/orm-extension-pgvector` uses this for `{field}_nearest`. The same SPI is
public for external packs on `@prisma/orm-*@8.0.0-rc.23`.

Hierarchy queries already work as field methods (`isDescendantOf` / `isAncestorOf`).
pgvector-style `using` helpers are still useful sugar for the common “everything
under this prefix” / “every ancestor of this leaf” collection shapes, including
inside `include` refinements.

## Decision

Ship one contribution id `ltree/hierarchy` that, for each scalar `pg/ltree@1`
field (not `ltree[]`), registers:

| Method                         | Lowers to                         | SQL              |
| ------------------------------ | --------------------------------- | ---------------- |
| `using.{field}_descendants(root)` | `field.isDescendantOf(root)`   | `field <@ root`  |
| `using.{field}_ancestors(leaf)`   | `field.isAncestorOf(leaf)`     | `field @> leaf`  |

Both declare `filters: true` and `orders: false`. Both inherit PostgreSQL’s
inclusive equality semantics (`<@` / `@>` match the argument path itself).

Do **not** ship a separate `{field}_subtree` alias. Under ltree, “subtree of
root” is exactly `{field}_descendants(root)`. A third name would invent API
surface without new SQL.

Do **not** invent helpers that the pack cannot lower through existing query
ops (for example exclusive children-only filters, or `nlevel`-based ordering
baked into the method). Consumers chain `.where` / `.orderBy` / `.limit` as
usual.

`ltree[]` fields get no hierarchy collection methods in this slice (array
boolean / first-match ops already cover array receivers).

## Consequences

- Runtime descriptor exports `collectionMethods: () => [ltreeHierarchyMethods]`.
- Types merge into `CollectionMethodRegistry['ltree/hierarchy']` when consumers
  import `prisma-ltree/runtime`.
- Docs and `feature-support.md` document the `using` surface alongside hierarchy
  operators.
