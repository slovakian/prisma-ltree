# prisma-ltree

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
