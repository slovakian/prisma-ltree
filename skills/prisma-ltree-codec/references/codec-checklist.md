# Codec change checklist

## New codec (rare — spec change required)

- [ ] `src/core/constants.ts` — `*_CODEC_ID`
- [ ] `src/core/codecs.ts` — Codec class, Descriptor class, column helper
- [ ] `src/core/registry.ts` — register in `ltreeCodecRegistry`
- [ ] `src/core/contract-space-constants.ts` — native type if new storage type
- [ ] `src/types/codec-types.ts` — branded output type + `CodecTypes` entry
- [ ] `src/exports/codec-types.ts` — re-export
- [ ] `src/exports/column-types.ts` — public helper
- [ ] `src/exports/control.ts` — codec hooks if control-plane wiring needed
- [ ] `src/exports/runtime.ts` — `codecs()` contribution
- [ ] `src/contract.ts` — if contract storage types change
- [ ] Regenerate contract artifacts if contract source changed
- [ ] `test/codecs.test.ts` — round-trip + validation
- [ ] `test/column-types.test.ts`
- [ ] `test/codec-types.test-d.ts`
- [ ] `docs/feature-support.md`

## Modify validation only

- [ ] `src/core/codecs.ts` — `assertValidLtree` or encode/decode
- [ ] `src/core/constants.ts` — if limits change
- [ ] `test/codecs.test.ts` — new edge cases
- [ ] `docs/ltree/postgresql-ltree-reference.md` — if docs mention limits

## Existing codecs in this pack

| Codec ID           | Column helper  | Native type |
| ------------------ | -------------- | ----------- |
| `pg/ltree@1`       | `ltree()`      | `ltree`     |
| `pg/ltree-array@1` | `ltreeArray()` | `ltree[]`   |

Traits: `['equality', 'order']` for scalar ltree; array follows text-array pattern.
