# Reference implementations — upstream paths

Run `pnpm run sync-docs` first. All paths relative to `.sync/prisma-next/`.

| What                            | Path                                                       | Use for                                                                   |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| pgvector (closest analog)       | `packages/3-extensions/pgvector/`                          | Non-parameterized + parameterized codec patterns, contract space baseline |
| postgis                         | `packages/3-extensions/postgis/`                           | Multi-operator descriptor-meta, golden tests                              |
| paradedb                        | `packages/3-extensions/paradedb/`                          | Extension install migration pattern                                       |
| Extension architecture (source) | `docs/`                                                    | Authoritative upstream docs                                               |
| Extension author skills         | `skills/extension-author/`                                 | prisma-next-extension-upgrade                                             |
| pgvector operations tests       | `packages/3-extensions/pgvector/test/` or `src/__tests__/` | Test layout (may vary by version)                                         |
| postgis operations tests        | `packages/3-extensions/postgis/`                           | Operator lowering golden pattern                                          |

## Key files to diff when stuck

```
pgvector/src/core/codecs.ts
pgvector/src/core/descriptor-meta.ts
pgvector/src/exports/control.ts
pgvector/src/exports/runtime.ts
postgis/test/operations.test.ts   # if present — search for operations.test.ts
```

## SPI imports (common)

From `@prisma-next/framework-components/codec`:

- `CodecImpl`, `CodecDescriptorImpl`, `column`, `ColumnHelperFor`

From `@prisma-next/sql-relational-core/expression`:

- `buildOperation`, `toExpr`, `codecOf`

From `@prisma-next/sql-operations`:

- `createSqlOperationRegistry`

Exact import paths may shift between minors — verify against synced source after upgrade.
