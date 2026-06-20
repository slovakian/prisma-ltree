# Test anatomy

## Helpers

| File                               | Role                                        |
| ---------------------------------- | ------------------------------------------- |
| `test/helpers/ltree-fixture.ts`    | PGlite DB with ltree extension              |
| `test/helpers/composed-adapter.ts` | Full composed Postgres runtime + ltree pack |

## Integration tiers

| File                        | Scope                                               |
| --------------------------- | --------------------------------------------------- |
| `tier1.integration.test.ts` | Tier 1 ops (hierarchy, pattern match, core scalars) |
| `tier2.integration.test.ts` | Tier 2 (concat, conversion)                         |
| `tier3.integration.test.ts` | Tier 3 (array first-match)                          |

## Upstream mirror

Search synced source for golden test patterns:

```bash
# After sync-docs
rg "lowering" .sync/prisma-next/packages/3-extensions/postgis/ -g '*.test.ts'
rg "queryOperations" .sync/prisma-next/packages/3-extensions/pgvector/ -g '*.test.ts'
```

## Type-level tests

- `test/codec-types.test-d.ts` — `CodecTypes['pg/ltree@1']['output']` etc.
- `test/operation-types.test-d.ts` — method availability on column types

Vitest typecheck mode runs these as part of `vp test`.

## Coverage config

`packages/extension-ltree/vite.config.ts` sets 95% thresholds. Uncovered new code fails CI.

## Fake column expression pattern (operations.test.ts)

```typescript
function ltreeExpr(value: string, codec: CodecRef) {
  const ref = ParamRef.of(value, { codec });
  return {
    returnType: { codecId: codec.codecId, nullable: false },
    buildAst: () => ref,
    codec,
  };
}
```

Use this to invoke operation impls without a full contract model.
