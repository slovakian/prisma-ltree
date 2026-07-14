# Export Map — `prisma-ltree`

**Audience:** maintainers and agents working on this package. _Not_ consumer-facing
(the README is the consumer surface). This is the authoritative record of the
package's public export surface: every subpath, what it exports, the exact import
idiom, and where in a consumer's project it gets wired. Keep it in sync with
`packages/extension-ltree/package.json#exports` and `src/exports/*`.

## Invariants (do not drift from these)

- The export surface is **byte-for-byte canonical** with the prisma-next reference
  packs (pgvector / postgis). Verified against
  `vendor/prisma-next/packages/3-extensions/pgvector/` (git subtree; refresh with
  `pnpm run sync-prisma-next`). Consistency with the ecosystem is the point — a consumer who
  has wired any prisma-next extension already knows how to wire this one. Do not
  diverge from the reference shape or naming without an ADR.
- **Six subpath exports, no root export.** A bare `import x from "prisma-ltree"`
  would have to pick a single plane and would mislead. Forcing the plane into the
  path (`/control` vs `/runtime`) is what keeps the three-place wiring legible.
- **Default-vs-named convention:** plane singletons (`control`, `runtime`, `pack`)
  are **default** exports — there is exactly one descriptor per plane, so the
  consumer aliases it freely (`import ltree from …`). Collections and types
  (`column-types`, `codec-types`, `operation-types`) are **named** exports because
  the name _is_ the API.
- `"sideEffects": false` + plane-per-subpath is what keeps the runtime bundle from
  pulling in migration code. Don't collapse subpaths.

## The six exports

| Subpath                        | Exports                                                              | Import idiom                                                                    | Wired in (consumer project)                                              |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `prisma-ltree/control`         | `ltreeExtensionDescriptor` — **default** _and_ named                 | `import ltree from "prisma-ltree/control"`                                      | `prisma-next.config.ts` → `defineConfig({ extensionPacks: [ltree] })`    |
| `prisma-ltree/runtime`         | `ltreeRuntimeDescriptor` (**default**); `ltreeCodecRegistry` (named) | `import ltree from "prisma-ltree/runtime"`                                      | execution stack → `createSqlExecutionStack({ extensionPacks: [ltree] })` |
| `prisma-ltree/pack`            | `ltreePackMeta` — **default only**                                   | `import ltreePack from "prisma-ltree/pack"`                                     | contract → `defineContract({ extensionPacks: { ltree: ltreePack } })`    |
| `prisma-ltree/column-types`    | `ltree()`, `ltreeArray()` — **named fns**                            | `import { ltree, ltreeArray } from "prisma-ltree/column-types"`                 | inside contract → `field.column(ltree())`                                |
| `prisma-ltree/codec-types`     | `CodecTypes`, `Ltree`, `LtreeArray` — **named, type-only**           | `import type { CodecTypes, Ltree, LtreeArray } from "prisma-ltree/codec-types"` | typing emitted `contract.d.ts` / result rows                             |
| `prisma-ltree/operation-types` | `QueryOperationTypes` — **named, type-only**                         | `import type { QueryOperationTypes } from "prisma-ltree/operation-types"`       | query-builder operator inference                                         |

(`./package.json` is also exported, per ecosystem convention, for tooling that
introspects the manifest.)

## The three wiring locations (the real learning curve)

The import _syntax_ is easy; what trips people up is remembering which export goes
where. There are exactly three places:

1. **`prisma-next.config.ts`** (migrate/CLI plane) → `control`
2. **`contract.ts`** (authoring) → `pack` (register namespace) + `column-types`
   (declare columns); `codec-types` / `operation-types` feed the emitted types
3. **execution stack** (execute plane) → `runtime`

## Deliberate redundancies (leave them; they match the reference)

- `control` re-exports `ltreeExtensionDescriptor` both named and as default. Every
  doc/example uses the default; the named export aids discoverability and testing.
- `runtime` re-exports `ltreeCodecRegistry` (a `Map` of codec descriptors) for
  advanced/introspection use. Not in the documented consumer flow, but conventional.

## When you change exports

1. Update `src/exports/*` and `package.json#exports` together.
2. Update this file and the consumer-facing README import examples.
3. If the change diverges from the pgvector/postgis reference shape, write an ADR
   under `docs/decisions/` first — divergence from the ecosystem is a real cost.
4. `vp check` + `vp test` (manifest/export tests guard the surface).
