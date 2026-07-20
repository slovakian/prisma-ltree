# prisma-ltree

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
