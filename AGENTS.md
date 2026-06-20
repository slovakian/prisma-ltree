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

This project builds `@prisma-next/extension-ltree`, an extension pack for PostgreSQL's `ltree` (hierarchical tree) data type, following the prisma-next extension architecture.

## Project Layout

```
packages/
  extension-ltree/           # The ltree extension pack
apps/
  website/                   # Documentation website (Vite+)
docs/
  prisma-next/               # prisma-next extension architecture docs
  ltree/                     # PostgreSQL ltree reference docs
```

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

| Doc                         | Path                                                    | When                                                                   |
| --------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| Extension architecture hub  | `docs/prisma-next/ecosystem-extensions-and-packs.md`    | Understanding the four-slice model (contract, lanes, runtime, migrate) |
| Naming & layout conventions | `docs/prisma-next/extension-packs-naming-and-layout.md` | Setting up package exports, source layout, package.json metadata       |
| Extensions glossary         | `docs/prisma-next/extensions-glossary.md`               | Terminology: codecs, contract spaces, invariantIds, branded types      |
| Codec authoring guide       | `docs/prisma-next/codec-authoring-guide.md`             | How to write encode/decode, descriptor classes, column helpers         |
| Core vs pack catalog        | `docs/prisma-next/core-vs-pack-entity-catalog.md`       | Which features are core vs extension-provided                          |
| PostgreSQL ltree reference  | `docs/ltree/postgresql-ltree-reference.md`              | ltree types, operators, functions, indexes, SQL syntax                 |

## Extension Pack Architecture (Four Slices)

Every pack provides some subset of:

1. **Contract slice** — Column type descriptors, parameterized types, `CREATE EXTENSION` migration
2. **Query-lane slice** — Typed query operators lowering to SQL templates (`{{self}}`, `{{arg0}}`)
3. **Runtime slice** — Codecs (encode/decode), query operation implementations
4. **Migration slice** — Contract space with baseline migration, invariantIds

## Multi-Plane Entrypoints

| Entrypoint           | Package Export     | Contents                                                                  |
| -------------------- | ------------------ | ------------------------------------------------------------------------- |
| `control.ts`         | `/control`         | Control descriptor: contract space wiring, migration package, codec hooks |
| `runtime.ts`         | `/runtime`         | Runtime descriptor: codec registry, query operations                      |
| `codec-types.ts`     | `/codec-types`     | Type exports for `contract.d.ts`                                          |
| `operation-types.ts` | `/operation-types` | Operation type signatures                                                 |
| `column-types.ts`    | `/column-types`    | Column type descriptor factory (e.g., `ltree()`)                          |
| `pack.ts`            | `/pack`            | Pure metadata export for TS contract authoring                            |

## MVP Scope for ltree

- **Contract space**: `CREATE EXTENSION IF NOT EXISTS ltree`
- **Codec**: `pg/ltree@1` (string ↔ string, label validation)
- **Column helper**: `ltree()` / `ltree.Ltree`
- **Core ops**:
  - `isAncestorOf` → `{{self}} @> {{arg0}}`
  - `isDescendantOf` → `{{self}} <@ {{arg0}}`
  - `matchesLquery` → `{{self}} ~ ({{arg0}})::lquery`
  - `matchesLqueryArray` → `{{self}} ? ({{arg0}})::lquery[]`
  - `matchesLtxtquery` → `{{self}} @ ({{arg0}})::ltxtquery`
- **Scalar fns** (phase 2): `nlevel()`, `subpath()`, `lca()`, `indexOf()`

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
