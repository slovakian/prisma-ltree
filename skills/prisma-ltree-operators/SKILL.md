---
name: prisma-ltree-operators
description: >-
  Add or modify prisma-ltree query operators: hierarchy (@>, <@), pattern match
  (~, ?, @), scalar functions (nlevel, subpath, lca), concatenation, array
  first-match ops, and SQL lowering templates in descriptor-meta.ts. Use when
  implementing a new ltree API method, fixing operator lowering, touching
  operation-types.ts, authoring.ts, or ADR-governed shapes like lca variadics
  or text.toLtree(). Do NOT use for codecs (prisma-ltree-codec) or migration
  DDL (onboard + upstream docs).
---

# prisma-ltree — Query Operators

Query operators live in `packages/extension-ltree/src/core/descriptor-meta.ts`. Each operator declares which codec `self` must have, builds an `Expression` via `buildOperation`, and attaches a SQL **lowering template**.

## Before you edit

1. Confirm status in `docs/feature-support.md` — update the matrix when done.
2. Read relevant ADRs in `docs/decisions/`:
   - ADR-001: `lca` variadic (≥2 paths, proper ancestor)
   - ADR-002: free-function lowering (`toLtree`, `prependText`)
   - ADR-003: array receiver ops (`ltree[]` first-match)
3. Check PostgreSQL semantics in `docs/ltree/postgresql-ltree-reference.md`.
4. Mirror postgis/pgvector operator tests in `.sync/prisma-next/packages/3-extensions/postgis/`.

## Operator anatomy

```typescript
methodName: {
  self: { codecId: 'pg/ltree@1' },  // receiver codec constraint
  impl: (self, arg0) => {
    return buildOperation({
      method: 'methodName',
      args: [toExpr(self, selfCodec), toExpr(arg0, argCodec)],
      returns: { codecId: 'pg/bool@1', nullable: false },
      lowering: {
        targetFamily: 'sql',
        strategy: 'function',
        template: '{{self}} @> {{arg0}}',
      },
    });
  },
},
```

Placeholders: `{{self}}` is the receiver; `{{arg0}}`, `{{arg1}}`, … are user arguments.

## Pattern families in this pack

| Family            | Example template                | Notes                             |
| ----------------- | ------------------------------- | --------------------------------- |
| Hierarchy         | `{{self}} @> {{arg0}}`          | Both args use `pg/ltree@1`        |
| Pattern match     | `{{self}} ~ ({{arg0}})::lquery` | Pattern is text, cast in template |
| Scalar function   | `nlevel({{self}})`              | Use `funcOp` helper for arity     |
| Infix concat      | `{{self}} \|\| {{arg0}}`        | Returns `pg/ltree@1`              |
| Array first-match | `{{self}} ?@> {{arg0}}`         | Receiver is `pg/ltree-array@1`    |

The `funcOp` helper in `descriptor-meta.ts` builds function-style templates with correct placeholder numbering — reuse it for `nlevel`, `subltree`, `subpath`, `indexOf`, `lca`.

## Wiring checklist

| Step | File                                         | What                                    |
| ---- | -------------------------------------------- | --------------------------------------- |
| 1    | `src/core/descriptor-meta.ts`                | Operator impl + lowering                |
| 2    | `src/types/operation-types.ts`               | Type signature on `QueryOperationTypes` |
| 3    | `src/core/authoring.ts`                      | Authoring namespace if needed           |
| 4    | `test/operations.test.ts`                    | Golden lowering tests                   |
| 5    | `test/operation-types.test-d.ts`             | Type-level inference                    |
| 6    | `test/integration/tier*.integration.test.ts` | PGlite executable SQL                   |
| 7    | `docs/feature-support.md`                    | Status → `supported`                    |

See [references/operator-patterns.md](./references/operator-patterns.md) and [references/adrs.md](./references/adrs.md).

## Golden test pattern

`test/operations.test.ts` verifies:

- Descriptor metadata (id, family, codec count)
- Operation key list (sorted equality)
- Lowering template per operator via `OperationExpr` + registry

Add a test case that asserts the exact `template` string and codec threading on `ParamRef`.

## Integration tests

Tier integration tests compose a real Postgres adapter + PGlite with `CREATE EXTENSION ltree`. Every new operator should execute against PGlite — lowering correctness alone is insufficient for cast-heavy patterns (`::lquery`, `::ltxtquery`).

Run: `vp test test/integration/`

## Verification

```bash
vp test test/operations.test.ts test/operation-types.test-d.ts test/integration/
vp check
```

## Common pitfalls

1. **Wrong arg codec for patterns** — `lquery`/`ltxtquery` args are strings (`pg/text@1` or untyped text), not `pg/ltree@1`.
2. **Breaking ADR-001** — `lca` requires ≥2 ltree paths; don't expose a single-arg form on the column.
3. **Receiver mismatch for array ops** — First-match ops require `pg/ltree-array@1` on `self`.
4. **Forgetting operation-types** — TS contract won't see the method without updating `operation-types.ts`.
5. **SQL operator spacing** — Templates are copied verbatim into SQL; match Postgres docs exactly.

## Reference files

- [operator-patterns.md](./references/operator-patterns.md) — Template catalog for existing ops
- [adrs.md](./references/adrs.md) — API shape constraints
- `docs/ltree/postgresql-ltree-reference.md` — Operator/function reference
