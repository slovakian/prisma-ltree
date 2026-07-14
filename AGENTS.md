<!-- intent-skills:start -->

## Skill Loading

Before substantial work:

- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

---

# Prisma Next LTREE Extension Development

This project builds `prisma-ltree`, an extension pack for PostgreSQL's `ltree` (hierarchical tree) data type, following the prisma-next extension architecture.

## Project Layout

```
packages/
  extension-ltree/           # The ltree extension pack
apps/
  web/                       # Documentation website (Vite+ + Fumadocs)
vendor/
  prisma-next/               # Upstream prisma-next (git subtree — agent reference)
docs/
  prisma-next/               # prisma-next extension architecture docs
  ltree/                     # PostgreSQL ltree reference docs
  spec/                      # Fumadocs docs site architecture spec
```

## Docs Site Implementation

Working on `apps/web` documentation? Start here:

- **Guide:** `apps/web/AGENTS.md` — contributor guide, skills, and common patterns
- **Spec:** `docs/spec/fumadocs-docs-site-spec.md` — architecture assumptions

**Current status:** Docs site v1 shipped (Tasks 1–7, 9). Search (Task 8) deferred.

## Prisma Next reference (git subtree)

Upstream [prisma/prisma-next](https://github.com/prisma/prisma-next) is vendored at
`vendor/prisma-next/` as a **git subtree** (committed in this repo). Agents must
consult it for **reference implementations, SPI types, and test patterns** — it is
always available after clone; do **not** look for `.sync/prisma-next/` or run a
clone step before reading it.

To refresh from upstream (clean working tree required; creates a merge commit):

```bash
pnpm run sync-prisma-next
```

See [`vendor/README.md`](vendor/README.md) for re-add / pull details.

### Reference path map

| What                                  | Path                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| pgvector reference (closest to ltree) | `vendor/prisma-next/packages/3-extensions/pgvector/`   |
| postgis reference (multi-operator)    | `vendor/prisma-next/packages/3-extensions/postgis/`    |
| paradedb reference                    | `vendor/prisma-next/packages/3-extensions/paradedb/`   |
| Extension architecture docs (source)  | `vendor/prisma-next/docs/`                             |
| Extension author skills               | `vendor/prisma-next/skills/extension-author/`          |

## Key Documentation (consult these before coding)

| Doc                            | Path                                                    | When                                                                      |
| ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Extension architecture hub     | `docs/prisma-next/ecosystem-extensions-and-packs.md`    | Understanding the four-slice model (contract, lanes, runtime, migrate)    |
| **Versioning & compatibility** | `docs/prisma-next/versioning-and-compatibility.md`      | Framework pins, upgrade workflow, consumer constraints, release checklist |
| Naming & layout conventions    | `docs/prisma-next/extension-packs-naming-and-layout.md` | Setting up package exports, source layout, package.json metadata          |
| Extensions glossary            | `docs/prisma-next/extensions-glossary.md`               | Terminology: codecs, contract spaces, invariantIds, branded types         |
| Codec authoring guide          | `docs/prisma-next/codec-authoring-guide.md`             | How to write encode/decode, descriptor classes, column helpers            |
| Core vs pack catalog           | `docs/prisma-next/core-vs-pack-entity-catalog.md`       | Which features are core vs extension-provided                             |
| PostgreSQL ltree reference     | `docs/ltree/postgresql-ltree-reference.md`              | ltree types, operators, functions, indexes, SQL syntax                    |

## Extension Pack Architecture (Four Slices)

Per [ADR 212](https://github.com/prisma/prisma-next/blob/main/docs/architecture%20docs/adrs/ADR%20212%20-%20Contract%20spaces.md), every pack provides some subset of:

1. **Contract slice (compile-time)** — TS contract builder (`defineContract`) emitting codec-instance types, column type registrations; baseline `CREATE EXTENSION` migration
2. **Query-lane slice (build-time)** — Typed query operators via descriptor metadata (`ltreeQueryOperations()`) lowering to SQL templates
3. **Runtime slice (execute-time)** — Codec registry and operation implementations; loaded by execution context
4. **Migration slice (plan/apply-time)** — Contract space with baseline migration, invariantIds, migration operations

## Multi-Plane Entrypoints

| Entrypoint           | Package Export     | Purpose                                                                                         |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `control.ts`         | `/control`         | Migration plane: `SqlControlExtensionDescriptor` wiring contract space, migrations, codec hooks |
| `runtime.ts`         | `/runtime`         | Runtime plane: `SqlRuntimeExtensionDescriptor` with codec registry and query operations         |
| `codec-types.ts`     | `/codec-types`     | Shared plane: Type exports (`CodecTypes`, branded types) for emitted `contract.d.ts`            |
| `operation-types.ts` | `/operation-types` | Shared plane: Type signatures (`QueryOperationTypes`) for query builder inference               |
| `column-types.ts`    | `/column-types`    | Shared plane: Column type descriptor factories (`ltree()`, `ltreeArray()`)                      |
| `pack.ts`            | `/pack`            | Shared plane: Pack metadata (`ltreePackMeta`) for TS contract authoring                         |

> **Full export map (maintainer reference):** [`docs/reference/export-map.md`](docs/reference/export-map.md)
> — authoritative record of every subpath export, its import idiom, and where consumers
> wire it. Keep it in sync when changing `src/exports/*` or `package.json#exports`.

## Implementation Status

### Tier 1 (Foundation + Core Operators) — ✅ Complete

- **Contract space**: `CREATE EXTENSION IF NOT EXISTS ltree`
- **Codecs**: `pg/ltree@1` (string ↔ string, label validation) + `pg/ltree-array@1` (for Tier 3)
- **Column helpers**: `ltree()` (for `ltree` columns), `ltreeArray()` (for `ltree[]` columns)
- **Hierarchy operators**: `isAncestorOf` (`@>`), `isDescendantOf` (`<@`)
- **Pattern-match operators**: `matchesLquery` (`~`), `matchesLqueryArray` (`?`), `matchesLtxtquery` (`@`)
- **Scalar functions**: `nlevel()`, `subltree()`, `subpath()` (2 overloads), `indexOf()` (2 overloads), `lca()` (variadic, ≥2 paths)
  - _Note:_ `lca()` has no single-arg form per PostgreSQL (see [ADR-001](docs/decisions/ADR-001-lca-api-shape.md))

### Tier 2 (Concatenation + Conversion) — ✅ Complete

- **Concatenation** (→ ltree): `concat` (`||`), `concatText` (`|| text`), `prependText` (`text ||`)
- **Conversion**: `toText` (`ltree2text` → text), `toLtree` (`text2ltree` → ltree, rooted on text receiver per [ADR-002](docs/decisions/ADR-002-free-function-lowering.md))

### Tier 3 (Array First-Match Operators) — ✅ Complete

- **Array receiver**: dedicated `pg/ltree-array@1` codec (mirrors core `pg/text-array@1` pattern, per [ADR-003](docs/decisions/ADR-003-array-receiver.md))
- **First-match operators** (→ ltree): `firstAncestorOf` (`?@>`), `firstDescendantOf` (`?<@`), `firstMatchLquery` (`?~`), `firstMatchLtxtquery` (`?@`)

### PSL contract lane — ✅ Parity proven

- Consumers can author ltree columns in `contract.prisma` via the `ltree` namespace
  constructor: `ltree.Ltree()` (→ `pg/ltree@1` / `ltree`) and `ltree.LtreeArray()`
  (→ `pg/ltree-array@1` / `ltree[]`), composed through `extensions: [ltree]`.
- TS↔PSL parity is byte-identical (incl. hashes) and guarded by
  `test/psl-lane/psl-parity.test.ts`. `@db.Ltree` is out of scope (no extension hook in
  core), per [ADR-004](docs/decisions/ADR-004-psl-lane-support.md).

## Reference Implementations

When building, mirror the structure of:

- **pgvector** (`docs/prisma-next/ecosystem-extensions-and-packs.md` describes the canonical layout)
- **postgis** — good reference for multi-operator patterns

Key files in a pgvector-style pack:

```
src/
  core/
    codecs.ts              # Codec + Descriptor classes, column helper
    constants.ts           # Codec IDs, limits
    descriptor-meta.ts     # Pack metadata, query operation implementations
    registry.ts            # CodecDescriptorRegistry
    contract-space-constants.ts  # Space ID, invariant IDs
    authoring.ts           # Authoring type namespace
  types/
    codec-types.ts         # Type-level branded types, CodecTypes export
    operation-types.ts     # QueryOperationTypes signature
  exports/
    control.ts             # SqlControlExtensionDescriptor
    runtime.ts             # SqlRuntimeExtensionDescriptor
    codec-types.ts         # Re-export from types/
    operation-types.ts     # Re-export from types/
    column-types.ts        # Column type descriptor factory
    pack.ts                # Re-export pack meta
  contract.ts              # TS contract source (defineContract)
  contract.json            # Emitted contract JSON
  contract.d.ts            # Emitted contract type definitions
migrations/
  refs/head.json
  <timestamp>_install_ltree/
    migration.json
    ops.json
prisma-next.config.ts
```

## Query Operator Pattern

Each operator in `descriptor-meta.ts`:

```typescript
methodName: {
  self: { codecId: 'pg/ltree@1' },  // what codec `self` column must be
  impl: (self, arg0) => {
    return buildOperation({
      method: 'methodName',
      args: [toExpr(self, selfCodec), toExpr(arg0, selfCodec)],
      returns: { codecId: 'pg/bool@1', nullable: false },
      lowering: {
        targetFamily: 'sql',
        strategy: 'function',
        template: '{{self}} <operator> {{arg0}}',
      },
    });
  },
}
```

## Testing

```
test/
  codecs.test.ts           # Encode/decode round-trip
  operations.test.ts       # Query operator lowering golden tests
  column-types.test.ts     # Column type descriptor validation
  pack-authoring.test.ts   # Authoring type validation
```

Mirror tests from postgis (`operations.test.ts` pattern: descriptor metadata, operation keys, lowering template verification, ParamRef codec threading, registry registration).

## Development Workflow

1. `vp install` — install dependencies
2. `vp check` — format, lint, typecheck
3. `vp test` — run tests
4. `vp run build` — build packages
5. `vp run ready` — full validation (includes `check-pins` for exact `@prisma-next/*` alignment)

### Upgrading prisma-next

Do **not** bump `@prisma-next/*` pins casually. Follow
`docs/prisma-next/versioning-and-compatibility.md` and the upstream
`prisma-next-extension-upgrade` skill (`vendor/prisma-next/skills/extension-author/`).
One minor per commit; run `pnpm run check-pins` in `packages/extension-ltree/`.
