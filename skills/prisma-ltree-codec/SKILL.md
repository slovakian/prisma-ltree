---
name: prisma-ltree-codec
description: >-
  Author or modify prisma-ltree codecs and column helpers: pg/ltree@1,
  pg/ltree-array@1, encode/decode validation, constant factory pattern,
  registry wiring, and column-types exports. Use when adding a codec,
  changing label validation, fixing encode/decode round-trips, adding
  ltree() or ltreeArray() helpers, or touching src/core/codecs.ts,
  constants.ts, registry.ts, or column-types entrypoints. Do NOT use for
  query operators (prisma-ltree-operators) or framework upgrades
  (prisma-next-extension-upgrade).
---

# prisma-ltree — Codecs & Column Helpers

Codecs bridge TypeScript values and PostgreSQL wire format. Column helpers expose codecs to contract authoring. This pack uses **Case 1** (non-parameterized) codecs with **constant factories** — every `factory()` call returns the same shared instance.

## Before you edit

1. Load `prisma-ltree-onboard` if you haven't synced docs or read the layout.
2. Read `docs/prisma-next/codec-authoring-guide.md` (Case 1 pattern).
3. Check `docs/feature-support.md` — confirm the codec is in scope.
4. Mirror `.sync/prisma-next/packages/3-extensions/pgvector/src/core/codecs.ts` for framework wiring patterns.

## Three artifacts per codec

Each codec requires:

1. **Codec class** — extends `CodecImpl<Id, Traits, Wire, Input>` with `encode` / `decode` / JSON variants
2. **Descriptor class** — extends `CodecDescriptorImpl` with `codecId`, `traits`, `targetTypes`, `paramsSchema`, `factory`
3. **Column helper** — `column(descriptor.factory(), codecId, undefined, nativeType)` with `satisfies ColumnHelperFor<D>`

Canonical implementation: `packages/extension-ltree/src/core/codecs.ts`

## ltree-specific validation

`assertValidLtree` enforces PostgreSQL label rules:

- Non-empty string, dot-separated labels
- Each label: `[A-Za-z0-9_-]+`, max length per `LTREE_MAX_LABEL_LENGTH`
- Max label count per `LTREE_MAX_LABELS`

Call validation in `encode` (and optionally `decode` for defense in depth). Constants live in `src/core/constants.ts`.

## Wiring checklist

When adding or changing a codec, touch these surfaces in order:

| Step | File                                    | What                                        |
| ---- | --------------------------------------- | ------------------------------------------- |
| 1    | `src/core/constants.ts`                 | `LTREE_*_CODEC_ID` constant                 |
| 2    | `src/core/codecs.ts`                    | Codec + descriptor + column helper          |
| 3    | `src/core/registry.ts`                  | Register descriptor in `ltreeCodecRegistry` |
| 4    | `src/core/contract-space-constants.ts`  | Native type string if new storage type      |
| 5    | `src/types/codec-types.ts`              | Branded types + `CodecTypes` export         |
| 6    | `src/exports/codec-types.ts`            | Re-export for package consumers             |
| 7    | `src/exports/column-types.ts`           | Public column helper exports                |
| 8    | `src/exports/control.ts` / `runtime.ts` | Descriptor contributes codecs via registry  |
| 9    | `test/codecs.test.ts`                   | Round-trip + validation edge cases          |
| 10   | `test/column-types.test.ts`             | Column helper metadata                      |
| 11   | `docs/feature-support.md`               | Update status if user-facing                |

See [references/codec-checklist.md](./references/codec-checklist.md) for the full touch list.

## Constant factory rule

The runtime expects `factory()` to return a **shared** codec instance for non-parameterized types. Do not allocate a new codec per call — follow the existing `LtreeDescriptor.factory()` pattern.

## Type-level exports

`CodecTypes` in `src/types/codec-types.ts` feeds `contract.d.ts` emission. After codec changes, run type-level tests:

```bash
vp test test/codec-types.test-d.ts
```

## Verification

```bash
vp test test/codecs.test.ts test/column-types.test.ts test/codec-types.test-d.ts
vp check
```

Full gate: `prisma-ltree-develop` skill.

## Common pitfalls

1. **Forgetting registry registration** — Codec exists but runtime descriptor doesn't expose it.
2. **Wrong native type** — Must match Postgres (`ltree`, `ltree[]`) in `contract-space-constants.ts`.
3. **Adding lquery/ltxtquery codecs** — Out of scope; patterns use text params + SQL cast (see operators skill).
4. **Parameterized codec without literal preservation** — ltree is Case 1; don't copy pgvector's dimension parameterization unless spec changes.

## Reference files

- [codec-checklist.md](./references/codec-checklist.md) — Files to touch per change
- `docs/prisma-next/codec-authoring-guide.md` — Framework codec patterns
- `docs/ltree/postgresql-ltree-reference.md` — Label syntax rules
