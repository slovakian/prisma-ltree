# prisma-ltree

## 0.7.0

### Minor Changes

- 3550322: Add boolean `ltree[]` operators: `containsAncestorOf`, `containsDescendantOf`, `matchesAnyLquery`, `matchesAnyLqueryArray`, and `matchesAnyLtxtquery` (ADR-007).
- a495b67: Add ORM collection helpers `using.{field}_descendants` / `using.{field}_ancestors` for scalar `ltree` fields (ADR-008), mirroring pgvector’s `{field}_nearest` SPI.

### Patch Changes

- 6c7afa6: Validate literal `lquery` / `ltxtquery` pattern args at query-build time with clearer errors (empty patterns, empty segments, unbalanced operators) while leaving Expression binds to Postgres.

## 0.6.0

### Minor Changes

- e9a2ce8: Target Prisma 8 SPI `8.0.0-rc.23` and `prisma@8.0.0-rc.33`.
  - Exact-pin every `@prisma/orm-*` SPI package at `8.0.0-rc.23` (rc.16 → rc.23, one RC per commit).
  - Pin `@prisma/orm-postgres` at `8.0.0-rc.23` (exact). Install the `prisma` CLI at `8.0.0-rc.33`. `prisma-ltree` stays on independent `0.x` semver.
  - Declare the `ltree` Postgres extension in the pack contract (unbound namespace) and ship create/declare/search-path migrations so `db sign` no longer depends on the install invariant alone.
  - Codec descriptors declare `jsonType` (`string` for `ltree`, `array` for `ltree[]`).

## 0.5.0

### Minor Changes

- 30ae524: Target Prisma 8 SPI `8.0.0-rc.16` and `prisma@8.0.0-rc.21`.

  **Breaking for consumers:**
  - Pin `@prisma/orm-postgres` at `8.0.0-rc.16` (exact). Install the `prisma` CLI at `8.0.0-rc.21`. `prisma-ltree` stays on independent `0.x` semver.
  - A stored contract names `dataType` instead of `nativeType`. Codec ids stay `pg/ltree@1` and `pg/ltree-array@1`. Data type ids are `ltree/ltree` and `ltree/ltree-array`.
  - Rewrite a contract from SPI `8.0.0-rc.14` or earlier with the 8.0.0-rc.15 data-type script and these lines: `--data-type pg/ltree@1=ltree/ltree` and `--data-type pg/ltree-array@1=ltree/ltree-array`.

## 0.4.0

### Minor Changes

- 5582b85: Target Prisma 8 SPI `8.0.0-rc.8` and the unified `prisma` CLI (`prisma@latest`).

  **Breaking for consumers:**
  - Config file is `prisma.config.ts`. Wrap ORM options with `definePrismaConfig` from `prisma/config`. `prisma-next.config.ts` and the flat `defineConfig` shape no longer load.
  - CLI is `prisma` (`npx prisma@latest`, `pnpm prisma`), not `prisma-next`. Commands stay `contract emit`, `db init`, `migration plan`.
  - Pin `@prisma/orm-postgres` at `8.0.0-rc.8` (exact). `prisma-ltree` stays on independent `0.x` semver: install it with a caret. You do not need `prisma-ltree@8.0.0-rc.8`.

## 0.3.0

### Minor Changes

- cf5e13a: Target Prisma Next `8.0.0-rc.1` from `prisma/prisma` main.

  **Breaking for consumers:** the retired `@prisma-next/*` scope is replaced by `@prisma/orm-*`. Apps should depend on `@prisma/orm-postgres@8.0.0-rc.1` (exact pin) and compose the pack via `extensions` (not `extensionPacks`). The `prisma-next` CLI name is unchanged.

## 0.2.3

### Patch Changes

- Upgrade framework pins to `@prisma-next/*@0.15.0` and re-emit the bundled contract for the 0.15 SPI.

## 0.2.2

### Patch Changes

- 891bafa: Add `paths.lcaAll()` — the lowest common ancestor of an `ltree[]` column (`lca(ltree[])`). Complements the existing scalar `path.lca(other, ...)`.

## 0.2.1

### Patch Changes

- Remove consumer-facing @db.Ltree documentation and set npm homepage to prisma-ltree.procka.org.

## 0.2.0

### Minor Changes

- c92389f: Add PSL contract-lane support: author `ltree.Ltree()` and `ltree.LtreeArray()` in `contract.prisma`, with byte-identical TS↔PSL parity tests and consumer documentation.

## 0.1.1

### Patch Changes

- 482febe: Focus the published README on consumer adoption: remove PGlite/Vite+ development notes, internal architecture detail, and broken monorepo doc links.
