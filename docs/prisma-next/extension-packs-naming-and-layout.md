# Extension Packs — Naming and Layout Conventions

Source: prisma-next `docs/reference/Extension-Packs-Naming-and-Layout.md`

## NPM Package Name

- Prisma-published packs: `@prisma/orm-extension-<name>`
  - Examples: `@prisma/orm-extension-pgvector`, `@prisma/orm-extension-postgis`
- External packs (this repo): unscoped names such as `prisma-ltree`

## Filesystem Location

```
packages/
  3-extensions/              # Domain 3: Extensions (inside prisma/prisma)
    pgvector/                # pgvector extension pack
    <name>/                  # Your extension pack
```

## Required package.json Metadata

```json
{
  "name": "@prisma/orm-extension-<name>",
  "prismaNext": {
    "family": "sql",
    "dialects": ["postgres"],
    "type": "extension-pack"
  }
}
```
## Minimal Source Layout

```
packages/3-extensions/<name>/
  package.json
  src/
    core/                # Shared plane code
      types.ts           # Type definitions
      codecs.ts          # Codec definitions
      constants.ts       # Codec IDs, limits
      descriptor-meta.ts # Pack metadata, query operations
      registry.ts        # Codec descriptor registry
      contract-space-constants.ts
    types/               # Additional type definitions
      codec-types.ts
      operation-types.ts
    exports/             # Entry points
      control.ts         # Migration plane (control plane descriptors)
      runtime.ts         # Runtime plane (runtime factories)
      codec-types.ts     # Re-export codec types
      operation-types.ts # Re-export operation types
      column-types.ts    # Column type descriptor factory
      pack.ts            # Pure metadata export
  migrations/
    refs/head.json
    <timestamp>_install_<ext>/
      migration.json
      ops.json
  prisma-next.config.ts
```

## Package Exports

```json
{
  "exports": {
    "./control": { "types": "./dist/exports/control.d.ts", "import": "./dist/exports/control.js" },
    "./runtime": { "types": "./dist/exports/runtime.d.ts", "import": "./dist/exports/runtime.js" },
    "./codec-types": {
      "types": "./dist/exports/codec-types.d.ts",
      "import": "./dist/exports/codec-types.js"
    },
    "./operation-types": {
      "types": "./dist/exports/operation-types.d.ts",
      "import": "./dist/exports/operation-types.js"
    },
    "./column-types": {
      "types": "./dist/exports/column-types.d.ts",
      "import": "./dist/exports/column-types.js"
    },
    "./pack": { "types": "./dist/exports/pack.d.ts", "import": "./dist/exports/pack.js" }
  }
}
```

## Guardrails

- Packs import only via documented SPI of framework/sql packages
- No pack may import from `test/**` or `examples/**`
- Domain boundaries remain enforced via `architecture.config.json`
- Control plane code cannot import from runtime plane
