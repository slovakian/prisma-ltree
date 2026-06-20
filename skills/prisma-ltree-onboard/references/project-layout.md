# Project layout — packages/extension-ltree

## Source tree

```
packages/extension-ltree/
├── src/
│   ├── core/
│   │   ├── codecs.ts              # Codec + descriptor classes, column helpers
│   │   ├── constants.ts           # Codec IDs, ltree limits
│   │   ├── descriptor-meta.ts     # Query operation implementations + lowering
│   │   ├── registry.ts            # CodecDescriptorRegistry
│   │   ├── contract-space-constants.ts  # Space ID, invariant IDs, native types
│   │   └── authoring.ts           # Authoring type namespace
│   ├── types/
│   │   ├── codec-types.ts         # Branded types, CodecTypes export
│   │   └── operation-types.ts     # QueryOperationTypes signature
│   ├── exports/
│   │   ├── control.ts             # SqlControlExtensionDescriptor
│   │   ├── runtime.ts             # SqlRuntimeExtensionDescriptor
│   │   ├── codec-types.ts         # Re-export
│   │   ├── operation-types.ts     # Re-export
│   │   ├── column-types.ts        # Public ltree(), ltreeArray()
│   │   └── pack.ts                # Pure metadata for contract authoring
│   ├── contract.ts                # TS contract source (defineContract)
│   ├── contract.json              # Emitted contract JSON
│   └── contract.d.ts              # Emitted contract types
├── migrations/
│   └── app/
│       ├── refs/head.json
│       └── <timestamp>_install_ltree/
│           ├── migration.json
│           └── ops.json
├── test/                          # See prisma-ltree-test skill
├── prisma-next.config.ts
├── package.json
└── vite.config.ts
```

## Multi-plane exports (package.json)

| Import path                    | File               | Used by                                |
| ------------------------------ | ------------------ | -------------------------------------- |
| `prisma-ltree/control`         | control.ts         | `prisma-next.config.ts` extensionPacks |
| `prisma-ltree/runtime`         | runtime.ts         | Execution stack instantiation          |
| `prisma-ltree/column-types`    | column-types.ts    | Contract authoring                     |
| `prisma-ltree/codec-types`     | codec-types.ts     | Emitted contract.d.ts                  |
| `prisma-ltree/operation-types` | operation-types.ts | Query method types                     |
| `prisma-ltree/pack`            | pack.ts            | defineContract extensionPacks map      |

## Monorepo siblings

| Path              | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `apps/website/`   | Documentation site                           |
| `docs/`           | Architecture, spec, ADRs, feature matrix     |
| `scripts/sync.sh` | Clones prisma-next into `.sync/prisma-next/` |
