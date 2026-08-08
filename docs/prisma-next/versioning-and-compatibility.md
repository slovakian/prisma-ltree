# Prisma Next Versioning & Extension Compatibility

How Prisma Next versions relate to extension packs, how native extensions (`pgvector`, `postgis`, …)
handle it inside the monorepo, and how **prisma-ltree** (an external extension) should stay aligned.

Agents working on upgrades, dependency bumps, or consumer compatibility should read this before
changing `@prisma/orm-*` pins or publishing a release.

## Three independent version axes

Prisma Next extension work involves **three version concepts** that must not be conflated:

| Axis                             | Example (today)                        | What it means                                                               | When it changes                                                   |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Framework pin**                | `@prisma/orm-*@8.0.0-rc.1`             | The Prisma Next SPI/API version this extension was built and tested against | Each Prisma Next RC / minor bump, via a deliberate upgrade run    |
| **Extension package version**    | `prisma-ltree@0.2.3`                   | Our npm release semver — features, fixes, ltree-specific surface            | When **we** publish; independent of Prisma Next cadence           |
| **Stable extension identifiers** | `pg/ltree@1`, `ltree:install-ltree-v1` | Immutable IDs inside contracts, migrations, and codecs                      | **Never** after first publish — add new IDs (`@2`, `-v2`) instead |

The framework pin is the compatibility contract. Downstream apps read it from our published
`package.json` and must not upgrade Prisma Next past it without a newer `prisma-ltree` release.

Stable identifiers (`codecId`, `invariantId`, contract space id) survive framework upgrades unchanged.
They are how migrations, runtime codec registries, and query operators stay coherent across Prisma Next
releases.

## How Prisma Next manages framework compatibility

### Monorepo (native extensions)

Inside [`prisma/prisma`](https://github.com/prisma/prisma) (the active home for Prisma Next on the
`8.0.0-rc` line), every package — including `@prisma/orm-extension-pgvector` — shares one root
version. Bumping is mechanical inside that monorepo.

The historical [`prisma/prisma-next`](https://github.com/prisma/prisma-next) repo is **stale**; do
not treat it as the active product home. A git subtree at `vendor/prisma-next/` remains available
here as agent reference only.

### External extensions (prisma-ltree)

Standalone repos consume `@prisma/orm-*` from **npm** with **exact version strings** — no `^`, `~`,
ranges, or `workspace:` in the published `package.json`. Pre-releases such as `8.0.0-rc.1` will not
match caret ranges like `^0.x`.

**App consumers** install the Postgres facade:

```bash
pnpm add @prisma/orm-postgres@8.0.0-rc.1 prisma-ltree
```

**Extension authors** depend on the SPI packages (exact pin):

| Package                        | Role                                      |
| ------------------------------ | ----------------------------------------- |
| `@prisma/orm-framework`        | Framework SPI                             |
| `@prisma/orm-family-sql`       | SQL family SPI                            |
| `@prisma/orm-toolchain`        | CLI / migration tooling                   |
| `@prisma/orm-target-postgres`  | Postgres target (peer)                    |

The retired `@prisma-next/*` package scope is no longer published for this line.

**Exact-pin rule** (enforced by `check-pins`):

- Every `@prisma/orm-*` entry in `dependencies`, `peerDependencies`, and `optionalDependencies` must
  be a single exact semver (e.g. `"8.0.0-rc.1"`)
- All such entries must share the **same** version

This pin is intentional: it is the highest Prisma Next version the extension author has validated.
Consumer apps depend on it for safe upgrades.

### Per-minor upgrade machinery

Prisma Next ships agent skills from [`prisma/prisma/skills`](https://github.com/prisma/prisma/tree/main/skills):

| Skill                         | Audience                                      | Purpose                                                                 |
| ----------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `prisma-8`                    | App / product work on Prisma Next             | Contract, queries, migrations, runtime                                  |
| `prisma-next-upgrade`         | **Apps** consuming `@prisma/orm-postgres`, etc. | Bump app deps, apply codemods, validate                               |
| `prisma-8-extension-upgrade`  | **Extension authors**                         | Bump SPI deps one step at a time, apply codemods, run `check-pins`, test, commit |

Install / refresh:

```bash
pnpm dlx skills add prisma/prisma/skills --all
```

Companion check (from the extension package):

```bash
cd packages/extension-ltree
pnpm run check-pins   # exit 0 = pins OK
```

### Consumer app guardrail

When a **user app** upgrades Prisma Next, the upgrade skill runs a **pre-flight**:

1. Read `prisma-next.config.ts` → list `extensions`
2. For each installed extension, read `node_modules/<pkg>/package.json` → find `@prisma/orm-*` pins
3. Compute the **lowest** pin across all extensions
4. **Refuse** to upgrade the app past that pin unless the user explicitly accepts the risk

So if `prisma-ltree` pins `8.0.0-rc.1` and the user wants a newer RC, they must wait for (or
contribute) a `prisma-ltree` release that pins that RC after a successful extension upgrade run.

## prisma-ltree vs native extensions — checklist

| Concern                                 | Native (`pgvector`)            | prisma-ltree (ours)                          | Status                   |
| --------------------------------------- | ------------------------------ | -------------------------------------------- | ------------------------ |
| `@prisma/orm-*` dep style               | monorepo workspace pin         | exact `"8.0.0-rc.1"`                         | ✅ Correct for external  |
| `prismaNext` metadata in `package.json` | present in published packs     | `{ family, dialects, type }`                 | ✅ Per layout docs       |
| Runtime SPI deps                        | `dependencies`                 | `dependencies`                               | ✅                       |
| Target peer for tests                   | `@prisma/orm-target-postgres`  | same                                         | ✅                       |
| Upgrade skill workflow                  | N/A (monorepo bump)            | use `prisma-8-extension-upgrade`             | ✅ Documented here       |
| Stable codec IDs                        | `pg/vector@1`                  | `pg/ltree@1`, `pg/ltree-array@1`             | ✅                       |
| Stable invariantIds                     | e.g. `pgvector:install-…`      | `ltree:install-ltree-v1`                     | ✅                       |
| Config key                              | `extensions`                   | `extensions` (not `extensionPacks`)          | ✅                       |
| CI pin enforcement                      | upstream monorepo CI           | `pnpm run check-pins` in `ready` + CI        | ✅ wired                 |

## What breaks vs what stays stable across Prisma Next releases

**Usually stable** (extension interface / layers):

- Multi-plane exports (`/control`, `/runtime`, `/pack`, …)
- Codec encode/decode contracts keyed by `codecId`
- Query operator lowering templates (`{{self}}`, `{{arg0}}`)
- Baseline migration `invariantId` strings
- Column helpers (`ltree()`, `ltreeArray()`)

**May break on a step** (requires upgrade instructions):

- SPI import paths and type shapes
- Contract JSON canonicalization
- Namespace-scoped APIs
- Test utility locations
- Migration manifest schema

When upstream adds extension-author breaking changes, they ship a matching
`upgrades/<from>-to-<to>/instructions.md` entry.

## Upgrade workflow (extension authors)

When Prisma Next publishes a new RC / minor (e.g. `8.0.0-rc.2`):

1. **Install/refresh skills** — `pnpm dlx skills add prisma/prisma/skills --all`
2. **Read the transition** — `prisma-8-extension-upgrade/upgrades/<from>-to-<to>/instructions.md`
3. **Bump pins** — set every `@prisma/orm-*` in `packages/extension-ltree/package.json` to the target
4. **Install** — `vp install` / `pnpm install`
5. **Check pins** — `cd packages/extension-ltree && pnpm run check-pins`
6. **Apply codemods** — per `instructions.md` `changes[]`
7. **Re-emit contract** — `pnpm run build:contract-space` if instructions or emit shape changed
8. **Validate** — `vp run ready` from repo root
9. **Commit** — one commit per step: `chore: upgrade @prisma/* to 8.0.0-rc.2`
10. **Publish extension** — bump `prisma-ltree` semver if the release includes user-visible changes

## Release checklist (prisma-ltree)

Before publishing to npm:

1. `vp run ready` — format, lint, typecheck, test, build, **check-pins**
2. Framework pin in `package.json` matches the Prisma Next version you tested against
3. `README.md` states the required `@prisma/orm-postgres@<pin>` / `@prisma/orm-*@<pin>` version
4. No accidental range pins on `@prisma/orm-*`
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
pnpm exec prisma-next migration plan      # plan migration changes (CLI bin: prisma-next)
```

## See also

- [Extension Packs — Naming and Layout](./extension-packs-naming-and-layout.md) — `prismaNext` metadata, exports
- [Extensions Glossary](./extensions-glossary.md) — `invariantId`, codec terminology
- [Ecosystem Extensions & Packs](./ecosystem-extensions-and-packs.md) — four-slice model, contract spaces
- Active product home: [`prisma/prisma`](https://github.com/prisma/prisma)
- Skills: [`prisma/prisma/skills`](https://github.com/prisma/prisma/tree/main/skills)
- Dependency strategy: exact-pin `@prisma/orm-*` per this document and `packages/extension-ltree/package.json`
