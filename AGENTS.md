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
docs/
  prisma-next/               # prisma-next extension architecture docs
  ltree/                     # PostgreSQL ltree reference docs
  spec/                      # Fumadocs docs site spec & plan
```

## Docs Site Implementation

Working on `apps/web` documentation? Start here:

- **Guide:** `apps/web/AGENTS.md` — step-by-step tasks, skills, and common patterns
- **Plan:** `docs/spec/fumadocs-docs-site-plan.md` — full implementation roadmap
- **Handoff:** `docs/spec/fumadocs-docs-site-handoff.md` — task completion status and next steps
- **Spec:** `docs/spec/fumadocs-docs-site-spec.md` — assumptions and architecture

**Current status:** Tasks 1–7 complete, Task 8 (search) deferred, Task 9 ready to start.

## Synced External References

Before starting extension work, run `pnpm run sync-docs` to clone the prisma-next
source into `.sync/prisma-next/` (gitignored — never committed). Agents must consult
this clone for **reference implementations, SPI types, and test patterns**.

### Reference path map

| What                                  | Path                                                |
| ------------------------------------- | --------------------------------------------------- |
| pgvector reference (closest to ltree) | `.sync/prisma-next/packages/3-extensions/pgvector/` |
| postgis reference (multi-operator)    | `.sync/prisma-next/packages/3-extensions/postgis/`  |
| paradedb reference                    | `.sync/prisma-next/packages/3-extensions/paradedb/` |
| Extension architecture docs (source)  | `.sync/prisma-next/docs/`                           |
| Extension author skills               | `.sync/prisma-next/skills/extension-author/`        |

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
`prisma-next-extension-upgrade` skill (`.sync/prisma-next/skills/extension-author/` after
`pnpm run sync-docs`). One minor per commit; run `pnpm run check-pins` in `packages/extension-ltree/`.
