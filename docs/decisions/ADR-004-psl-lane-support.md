# ADR-004: PSL contract-lane support via the namespace constructor

**Status:** Accepted
**Date:** 2026-06-21
**Phase/Task:** PSL lane support (spec `docs/spec/psl-lane-support-spec.md`, Pieces 1–3)

## Context

prisma-next exposes **two consumer-facing authoring surfaces** that lower to the same
Contract IR:

- the **TypeScript lane** — `contract.ts` via `defineContract`, and
- the **PSL lane** — `contract.prisma`, the _canonical_ surface the official extensions
  (pgvector, postgis) document.

`prisma-ltree` shipped Tiers 1–3 authored and tested only through the TS lane. The PSL
lane was never proven, tested, or documented for ltree columns, even though consumers
authoring in `contract.prisma` are a first-class prisma-next audience. This ADR records
**how** ltree columns are made available to the PSL lane and **why** that is the only
viable mechanism for a third-party extension.

### What the source says (verified against `vendor/prisma-next/`)

1. **Both lanes lower to one Contract IR.** The framework's stated design goal is that
   the two authoring surfaces "produce identical compiled contracts." Piece 2 confirmed
   this empirically: the PSL-emitted and TS-emitted `contract.json` are **byte-identical,
   including `profileHash`/`storageHash`** — 0.14.0 threads no per-lane source metadata
   into the IR, so parity holds with no normalization.

2. **An extension's only PSL surface is its own namespace constructor.** A consumer
   references an extension type through the extension's namespace inside a `types { … }`
   block:

   ```prisma
   types {
     Path  = ltree.Ltree()
     Paths = ltree.LtreeArray()
   }
   model Page { id String @id @default(uuid()); path Path; breadcrumbs Paths }
   ```

   The `ltree` namespace resolves from `ltreeAuthoringTypes` (`src/core/authoring.ts`),
   surfaced through `ltreePackMeta.authoring.type` and spread into the `/control`
   descriptor that the consumer's `prisma-next.config.ts` composes via
   `extensions: [ltree]`. This is structurally identical to postgis's
   `postgis.Geometry(4326)`.

3. **`@db.Ltree` is impossible for a third-party extension.** `@db.*` native-type
   attributes are backed by a static `NATIVE_TYPE_SPECS` table hardcoded in the
   framework's `contract-psl` package (postgres-core types only — `db.Uuid`,
   `db.Timestamptz`, …). There is no extension hook: `checkUncomposedNamespace`
   recognizes only `db`, familyId, targetId, field-preset namespaces, and composed
   extensions. Adding `@db.Ltree` would require a PR to prisma-next core.

4. **The paren form is required.** A zero-arg constructor must still be _called_:
   `Path = ltree.Ltree()`, not `Path = ltree.Ltree`. The no-paren form fails with
   `PSL_INVALID_TYPES_MEMBER` (Piece 1 finding). `AuthoringTypeConstructorDescriptor.args`
   is optional, so ltree's zero-arg constructors are type-valid as-is.

5. **ltree is a _better_ PSL fit than pgvector.** pgvector is the documented TS-only
   exception precisely because PSL cannot register a parameterized base type
   (`vector(N)`). ltree's `ltree` / `ltree[]` are non-parameterized — exactly what the
   PSL lane can represent — so no such exception applies here.

## Decision

**Support the PSL lane through the existing `ltree` namespace constructor
(`ltree.Ltree()` / `ltree.LtreeArray()`); do not pursue `@db.Ltree`. Guarantee TS↔PSL
parity with an automated test.**

Concretely:

| Aspect                | Resolution                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| PSL surface           | `ltree.Ltree()` → `pg/ltree@1` / `ltree`; `ltree.LtreeArray()` → `pg/ltree-array@1` / `ltree[]` |
| Source of the surface | `ltreeAuthoringTypes` (unchanged) → `ltreePackMeta.authoring.type` → `/control`                 |
| Composition           | Consumer adds `ltree` to `extensions: [...]` in `prisma-next.config.ts`                         |
| Call syntax           | Parens required (`ltree.Ltree()`), even for zero-arg constructors                               |
| `@db.Ltree`           | **Out of scope** — requires a prisma-next core PR (no extension hook)                           |
| Parity proof          | `test/psl-lane/psl-parity.test.ts` — emit both lanes, assert IR equality                        |
| Missing-extension UX  | Omitting `ltree` from `extensions` yields `PSL_EXTENSION_NAMESPACE_NOT_COMPOSED`                |

No change to the public authoring surface was required: `ltreeAuthoringTypes`,
`ltreePackMeta`, and the `/control` descriptor were already structurally identical to
postgis's. The work was to **prove, test, and document** the lane, not to build it.

## Rationale

- **It is the only mechanism available to a third-party extension.** `@db.*` is a closed,
  hardcoded core table; the namespace constructor is the sanctioned extension SPI and the
  one both official extensions use.
- **Parity is verifiable, not assumed.** The two lanes produce byte-identical IR, so a
  consumer switching surfaces gets exactly the same compiled contract — proven by an
  automated test rather than asserted in prose.
- **No core changes, no pin bump.** The lane works entirely within `@prisma-next/*`
  `0.14.0`; nothing in the framework needs patching.
- **Better fit than the pgvector exception.** ltree's non-parameterized types are
  precisely what PSL can represent, so the pgvector TS-only carve-out does not apply.

## Consequences

- `test/psl-lane/` holds the PSL/TS fixtures, three thin emit configs, and the parity +
  resolution + missing-extension diagnostic tests (Piece 2). These guard against future
  regressions in lane parity.
- CLAUDE.md implementation-status gains a PSL-lane parity entry.
- Docs-site coverage (Piece 4) shows ltree authoring in PSL and TS side by side, and the
  consumer README gets a PSL snippet.
- If prisma-next core ever adds an extension hook for `@db.*` native types, `@db.Ltree`
  becomes a low-cost follow-up — but it is not needed for full PSL-lane parity.

## Alternatives rejected

- **`@db.Ltree` native-type attribute** — impossible without a prisma-next core PR; no
  extension hook exists in `contract-psl`.
- **No-paren constructor (`Path = ltree.Ltree`)** — fails with `PSL_INVALID_TYPES_MEMBER`;
  the call parentheses are mandatory.
- **Treat ltree as TS-only (the pgvector posture)** — unjustified: ltree's types are
  non-parameterized and fully representable in PSL, and parity is provable.
