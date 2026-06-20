# Progress Log — Phase 6 (Polish)

**Status:** In progress

## Task 6.1 — Coverage threshold + gap fill ✅

Added `@vitest/coverage-v8@4.1.9` (pinned to the bundled Vitest version) and a `coverage` block in
`vite.config.ts` scoped to `src/**/*.ts` (`all: true`, excludes `*.d.ts` + the authoring-only
`contract.ts`). Filled the two remaining gaps:

- **`codecs.ts`** — added unit tests for the `LtreeArrayCodec` `decode`/`encodeJson`/`decodeJson`
  paths, the scalar JSON codec paths, `renderOutputType` on both descriptors, and the max-labels
  guard.
- **`control.ts`** — added tests invoking `queryOperations()`, `create()`, and both codecs'
  control-plane hooks (`expandNativeType`, `resolveIdentityValue`).

**Result:** 100% statements / branches / functions / lines (139/22/54/136). Thresholds set to **95%**
(margin above 95 on every axis). 116 tests pass, no type errors.

## Task 6.2 — Finalize docs ✅

- `packages/extension-ltree/README.md` written (install, config, contract/runtime/query usage, full
  operation tables, types, dev workflow).
- `docs/progress/` per-tier logs created ([tier1](tier1.md), [tier2](tier2.md), [tier3](tier3.md)).
- `docs/feature-support.md` verified accurate against shipped surface.

## Task 6.3 — Replace npm stub

Pending explicit user approval (publishes `prisma-ltree` over the `0.0.1` stub).
