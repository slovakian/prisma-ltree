# Prisma Next Versioning & Extension Compatibility

How prisma-next versions relate to extension packs, how native extensions (`pgvector`, `postgis`, …)
handle it inside the monorepo, and how **prisma-ltree** (an external extension) should stay aligned.

Agents working on upgrades, dependency bumps, or consumer compatibility should read this before
changing `@prisma-next/*` pins or publishing a release.

## Three independent version axes

Prisma Next extension work involves **three version concepts** that must not be conflated:

| Axis                             | Example (today)                        | What it means                                                               | When it changes                                                   |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Framework pin**                | `@prisma-next/*@0.14.0`                | The prisma-next SPI/API version this extension was built and tested against | Each prisma-next **minor** bump, via a deliberate upgrade run     |
| **Extension package version**    | `prisma-ltree@0.1.0`                   | Our npm release semver — features, fixes, ltree-specific surface            | When **we** publish; independent of prisma-next cadence           |
| **Stable extension identifiers** | `pg/ltree@1`, `ltree:install-ltree-v1` | Immutable IDs inside contracts, migrations, and codecs                      | **Never** after first publish — add new IDs (`@2`, `-v2`) instead |

The framework pin is the compatibility contract. Downstream apps read it from our published
`package.json` and must not upgrade prisma-next past it without a newer `prisma-ltree` release.

Stable identifiers (`codecId`, `invariantId`, contract space id) survive framework upgrades unchanged.
They are how migrations, runtime codec registries, and query operators stay coherent across prisma-next
minors.

## How prisma-next manages framework compatibility

### Monorepo (native extensions)

Inside `prisma/prisma-next`, every package — including `@prisma-next/extension-pgvector` — shares one
root version. Bumping is mechanical:

- `pnpm bump-minor` / `scripts/set-version.ts` rewrites all `workspace:<X.Y.Z>` specs in lockstep
- Native extensions do **not** run the external upgrade skill; they ride the monorepo bump
- Upgrade instructions are still authored per minor transition (for external authors and release notes)

Reference: `.sync/prisma-next/packages/3-extensions/pgvector/package.json` uses
`"workspace:0.14.0"` specs instead of exact npm pins.

### External extensions (prisma-ltree)

Standalone repos consume `@prisma-next/*` from **npm** with **exact version strings** — no `^`, `~`,
ranges, or `workspace:` in the published `package.json`.

**Exact-pin rule** (enforced by `prisma-next-check-pins`):

- Every `@prisma-next/*` entry in `dependencies`, `peerDependencies`, and `optionalDependencies` must
  be a single exact semver (e.g. `"0.14.0"`)
- All such entries must share the **same** version

This pin is intentional: it is the highest prisma-next minor the extension author has validated.
Consumer apps depend on it for safe upgrades.

### Per-minor upgrade machinery

Prisma Next ships two agent skills (in the upstream repo under `skills/`):

| Skill                           | Audience                                         | Purpose                                                                                          |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `prisma-next-upgrade`           | **Apps** consuming `@prisma-next/postgres`, etc. | Bump app deps, apply codemods, validate                                                          |
| `prisma-next-extension-upgrade` | **Extension authors**                            | Bump SPI deps one minor at a time, apply extension-side codemods, run `check-pins`, test, commit |

Each minor transition has a directory:

```text
.sync/prisma-next/skills/extension-author/prisma-next-extension-upgrade/upgrades/<from>-to-<to>/
  instructions.md    # YAML frontmatter + changes[] entries (codemods, prose)
  *.ts               # Optional codemods
```

Some transitions have **empty** `changes[]` (no extension-author action — e.g. `0.14→0.15` at time
of writing). Others are substantial (e.g. `0.13→0.14` migration op factories, namespace entries).

Install the extension-author skill for upgrade work:

```bash
pnpm dlx skills add prisma/prisma-next/skills/extension-author --all
```

The skill subpath is intentionally **unpinned** (tracks `main`) so codemod fixes apply to all prior
transitions. After `pnpm run sync-docs`, the same content is available locally at
`.sync/prisma-next/skills/extension-author/`.

Companion CLI (already a devDependency here):

```bash
cd packages/extension-ltree
pnpm exec prisma-next-check-pins   # exit 0 = pins OK
```

### Consumer app guardrail

When a **user app** upgrades prisma-next, the `prisma-next-upgrade` skill runs a **pre-flight**:

1. Read `prisma-next.config.ts` → list `extensionPacks`
2. For each installed extension, read `node_modules/<pkg>/package.json` → find `@prisma-next/*` pins
3. Compute the **lowest** pin across all extensions
4. **Refuse** to upgrade the app past that pin unless the user explicitly accepts the risk

So if `prisma-ltree` pins `0.14.0` and the user wants `0.16.0`, they must wait for (or contribute) a
`prisma-ltree` release that pins `0.16.0` after a successful extension upgrade run.

## prisma-ltree vs native extensions — checklist

| Concern                                         | Native (`pgvector`)                  | prisma-ltree (ours)                            | Status                   |
| ----------------------------------------------- | ------------------------------------ | ---------------------------------------------- | ------------------------ |
| `@prisma-next/*` dep style                      | `workspace:0.14.0`                   | exact `"0.14.0"`                               | ✅ Correct for external  |
| `prismaNext` metadata in `package.json`         | not present in monorepo copies       | `{ family, dialects, type }`                   | ✅ Per layout docs       |
| Runtime SPI deps (`contract`, `sql-runtime`, …) | `dependencies`                       | `dependencies`                                 | ✅ Matches pgvector      |
| Adapter peer for tests                          | `@prisma-next/adapter-postgres` peer | same                                           | ✅                       |
| `@prisma-next/extension-author-tools`           | not in pgvector package.json         | devDep + `check-pins` script                   | ✅ Required for external |
| Upgrade skill workflow                          | N/A (monorepo bump)                  | use `prisma-next-extension-upgrade`            | ✅ Documented here       |
| Stable codec IDs                                | `pg/vector@1`                        | `pg/ltree@1`, `pg/ltree-array@1`               | ✅                       |
| Stable invariantIds                             | e.g. `pgvector:install-vector-v1`    | `ltree:install-ltree-v1`                       | ✅                       |
| Contract space on disk                          | `migrations/<space>/`                | `migrations/app/` (space id `ltree`)           | ✅                       |
| CI pin enforcement                              | upstream monorepo CI                 | `pnpm run check-pins` in `ready` + CI workflow | ✅ wired                 |

## What breaks vs what stays stable across prisma-next minors

**Usually stable** (extension interface / layers):

- Multi-plane exports (`/control`, `/runtime`, `/pack`, …)
- Codec encode/decode contracts keyed by `codecId`
- Query operator lowering templates (`{{self}}`, `{{arg0}}`)
- Baseline migration `invariantId` strings
- Column helpers (`ltree()`, `ltreeArray()`)

**May break on a minor** (requires upgrade instructions):

- SPI import paths and type shapes (`Migration` methods vs bare factories — 0.13→0.14)
- Contract JSON canonicalization (`storage.types` shape, `kind` discriminators — 0.9→0.10)
- Namespace-scoped APIs (`codecRefForColumn(namespaceId, …)` — 0.12→0.13)
- Test utility locations (`@prisma-next/test-utils` vs `@prisma-next/contract/testing` — 0.11→0.12)
- Migration manifest schema (closed manifest, hash recomputation — 0.11→0.12)

When upstream adds extension-author breaking changes, they **must** ship a matching
`upgrades/<from>-to-<to>/instructions.md` entry (enforced upstream by `check:upgrade-coverage`).

## Upgrade workflow (extension authors)

When prisma-next releases a new minor (e.g. `0.15.0`):

1. **Sync upstream docs** — `pnpm run sync-docs` (refresh `.sync/prisma-next/`)
2. **Install/refresh the skill** — `pnpm dlx skills add prisma/prisma-next/skills/extension-author --all`
3. **Read the transition** — `.sync/prisma-next/skills/extension-author/prisma-next-extension-upgrade/upgrades/0.14-to-0.15/instructions.md`
4. **Bump pins** — set every `@prisma-next/*` in `packages/extension-ltree/package.json` to `"0.15.0"`
5. **Install** — `vp install` / `pnpm install`
6. **Check pins** — `cd packages/extension-ltree && pnpm run check-pins`
7. **Apply codemods** — per `instructions.md` `changes[]` (scripts in the upgrade directory)
8. **Re-emit contract** — `pnpm run build:contract-space` if instructions or emit shape changed
9. **Validate** — `vp run ready` from repo root
10. **Commit** — one commit per minor step: `chore: upgrade @prisma-next/* to 0.15.0`
11. **Publish extension** — bump `prisma-ltree` semver if the release includes user-visible changes; the
    framework pin in `package.json` is what consumers need

`@prisma-next/extension-author-tools` can stay at the previous pin until convenient — bumping it is
independent of the framework upgrade (normally a no-op).

## Release checklist (prisma-ltree)

Before publishing to npm:

1. `vp run ready` — format, lint, typecheck, test, build, **check-pins**
2. Framework pin in `package.json` matches the prisma-next version you tested against
3. `README.md` states the required `@prisma-next/*@<pin>` version
4. No accidental range pins on `@prisma-next/*`
5. Contract/migration artifacts committed if emit changed
6. `feature-support.md` accurate for the shipped surface

## Commands reference

```bash
# From repo root
vp run ready                              # full validation (includes check-pins)

# Extension package only
cd packages/extension-ltree
pnpm run check-pins                       # exact-pin enforcement
pnpm run build:contract-space             # re-emit contract.json / contract.d.ts
pnpm exec prisma-next migration plan      # plan migration changes

# Refresh upstream reference + upgrade instructions
pnpm run sync-docs
```

## See also

- [Extension Packs — Naming and Layout](./extension-packs-naming-and-layout.md) — `prismaNext` metadata, exports
- [Extensions Glossary](./extensions-glossary.md) — `invariantId`, codec terminology
- [Ecosystem Extensions & Packs](./ecosystem-extensions-and-packs.md) — four-slice model, contract spaces
- Upstream skill: `.sync/prisma-next/skills/extension-author/prisma-next-extension-upgrade/SKILL.md`
- Upstream release notes: `.sync/prisma-next/docs/releases/` (breaking changes per minor)
- Our spec §4.5: `docs/spec/prisma-ltree-spec.md` (dependency strategy)
