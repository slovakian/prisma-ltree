---
name: prisma-ltree-test
description: >-
  Write and run prisma-ltree tests: codec round-trips, golden operator lowering,
  column-type metadata, pack authoring, type-level test-d files, PGlite
  integration tiers, and 95% coverage threshold. Use when adding tests, fixing
  test failures, writing golden SQL templates, setting up integration fixtures,
  or asking about test/ directory structure. Do NOT use for running the full
  validation gate without writing tests (prisma-ltree-develop).
---

# prisma-ltree — Testing

Tests live under `packages/extension-ltree/test/`. The pack uses Vitest via Vite+ (`vite-plus/test`). Integration tests run against PGlite with the `ltree` contrib extension.

## Test layers

| Layer          | Path                                         | Purpose                                                        |
| -------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Codecs         | `test/codecs.test.ts`                        | encode/decode, validation errors, column helper metadata       |
| Operations     | `test/operations.test.ts`                    | Descriptor metadata, operation keys, golden lowering templates |
| Column types   | `test/column-types.test.ts`                  | Column descriptor shape                                        |
| Pack authoring | `test/pack-authoring.test.ts`                | Authoring namespace consistency                                |
| Type-level     | `test/*-types.test-d.ts`                     | Compile-time type inference (Vitest typecheck mode)            |
| Integration    | `test/integration/tier*.integration.test.ts` | End-to-end SQL execution via composed adapter                  |
| Parity         | `test/control-adapter-lower-parity.test.ts`  | Control vs runtime lowering agreement                          |
| Cast policy    | `test/sql-renderer.cast-policy.test.ts`      | SQL cast rendering rules                                       |

Read [references/test-anatomy.md](./references/test-anatomy.md) for patterns and helpers.

## Running tests

From repo root (Vite+ workspace):

```bash
vp test                                    # all tests
vp test test/codecs.test.ts               # single file
vp test test/integration/                 # integration only
vp test --coverage                        # enforce 95% threshold
```

From `packages/extension-ltree/` if needed:

```bash
vp test
```

## Golden lowering tests (operations)

Pattern from `test/operations.test.ts`:

1. Import `ltreeRuntimeDescriptor` from `src/exports/runtime`
2. Build a fake column expression with `ParamRef.of(value, { codec })`
3. Call the operation impl from `ltreeRuntimeDescriptor.queryOperations!()`
4. Assert `lowering.template` matches expected SQL
5. Assert return codec id

When adding an operator, add both a key-presence assertion (in the sorted list test) and a dedicated template test.

## Integration test pattern

Integration tests use helpers in `test/helpers/`:

- `ltree-fixture.ts` — PGlite setup with `CREATE EXTENSION ltree`
- `composed-adapter.ts` — Composed Postgres runtime stack with ltree pack

Every operator that introduces casts or non-trivial SQL should have an integration assertion — PGlite catches cast syntax errors unit tests miss.

## Type-level tests

Files ending in `.test-d.ts` are type-only. Run them with the normal `vp test` harness. Update when changing:

- `src/types/codec-types.ts`
- `src/types/operation-types.ts`

## Before marking a feature done

1. Unit/golden tests for the change
2. Integration test if SQL executes at runtime
3. Type-level test if public types changed
4. `docs/feature-support.md` updated
5. `vp test --coverage` still passes threshold

## Verification

```bash
vp test --coverage
vp check
```

For the full pre-commit gate, use `prisma-ltree-develop`.

## Common pitfalls

1. **Testing only templates, not execution** — Cast patterns like `(?)::lquery` need PGlite.
2. **Forgetting sorted key list** — New ops must appear in the operations key equality test.
3. **Codec instance in tests** — Use `ltreeDescriptor.factory()({ name: "test" })` pattern from codecs.test.ts.
4. **Coverage drop** — New files need tests; 95% threshold is enforced in vite.config.ts.

## Reference files

- [test-anatomy.md](./references/test-anatomy.md) — Helpers, fixtures, upstream mirrors
