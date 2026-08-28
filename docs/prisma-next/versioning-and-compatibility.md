# Prisma 8 versioning and extension compatibility

How Prisma 8 versions relate to extension packs. First-party extensions (`pgvector`, `postgis`, …) share the Prisma monorepo version. External packs such as `prisma-ltree` keep their own semver and pin the SPI they tested.

Agents working on upgrades, dependency bumps, or consumer compatibility should read this before changing `@prisma/orm-*` pins or publishing a release.

## Three independent version axes

Prisma 8 extension work involves three version concepts that must not be conflated:

| Axis | Example (today) | What it means | When it changes |
| --- | --- | --- | --- |
| **Framework SPI pin** | `@prisma/orm-*@8.0.0-rc.8` | The Prisma 8 SPI this extension was built and tested against | Each Prisma 8 RC / minor bump, via a deliberate upgrade run |
| **Extension package version** | `prisma-ltree@0.3.0` | Our npm release semver: features, fixes, ltree-specific surface | When this pack publishes; independent of Prisma 8 cadence |
| **Stable extension identifiers** | `pg/ltree@1`, `ltree:install-ltree-v1` | Immutable IDs inside contracts, migrations, and codecs | **Never** after first publish. Add new IDs (`@2`, `-v2`) instead |

The CLI package (`prisma@latest`, today `8.0.0-rc.12`) is a fourth number. It can differ from the SPI pin. `prisma@8.0.0-rc.12` depends on `@prisma/orm-toolchain@8.0.0-rc.8`. Consumers install `prisma` for the `prisma` binary and pin `@prisma/orm-postgres` to this pack’s SPI.

The SPI pin is the compatibility contract. Downstream apps read it from our published `package.json` and must not upgrade `@prisma/orm-*` past it without a newer `prisma-ltree` release.

Stable identifiers (`codecId`, `invariantId`, contract space id) survive framework upgrades unchanged. They are how migrations, runtime codec registries, and query operators stay coherent across Prisma 8 releases.

## How Prisma 8 manages framework compatibility

### Monorepo (first-party extensions)

Inside [`prisma/orm`](https://github.com/prisma/orm) (GitHub `prisma/prisma` redirects here), every package, including `@prisma/orm-extension-pgvector`, shares one root version. Bumping is mechanical inside that monorepo. First-party packs therefore look like `@prisma/orm-extension-pgvector@8.0.0-rc.8`.

The historical [`prisma/prisma-next`](https://github.com/prisma/prisma-next) repo is stale. Do not treat it as the active product home. A git subtree at `vendor/prisma-next/` remains available here as agent reference only.

### External extensions (prisma-ltree)

Standalone repos consume `@prisma/orm-*` from **npm** with **exact version strings**: no `^`, `~`, ranges, or `workspace:` in the published `package.json`. Pre-releases such as `8.0.0-rc.8` will not match caret ranges like `^8.0.0`.

External packs keep independent semver. `prisma-ltree` stays `0.x`. Consumers install:

```bash
pnpm add prisma-ltree @prisma/orm-postgres@8.0.0-rc.8
pnpm add -D prisma
```

They do not install `prisma-ltree@8.0.0-rc.8`. The caret on `prisma-ltree` is the standard consumer range. The exact pin belongs on `@prisma/orm-*` only.

**Extension authors** depend on the SPI packages (exact pin):

| Package | Role |
| --- | --- |
| `@prisma/orm-framework` | Framework SPI |
| `@prisma/orm-family-sql` | SQL family SPI |
| `@prisma/orm-toolchain` | CLI / migration tooling |
| `@prisma/orm-target-postgres` | Postgres target (optional peer) |

`@prisma/cli-engine` is a **devDependency** at the version `@prisma/orm-toolchain` peers. It is not an `@prisma/orm-*` pin. The retired `@prisma-next/*` package scope is no longer published for this line. The retired `prisma-next` CLI bin is gone; use `prisma`.

**Exact-pin rule** (enforced by `check-pins`):

- Every `@prisma/orm-*` entry in `dependencies`, `peerDependencies`, and `optionalDependencies` must be a single exact semver (e.g. `"8.0.0-rc.8"`)
- All such entries must share the **same** version

This pin is intentional: it is the highest Prisma 8 SPI the extension author has validated. Consumer apps depend on it for safe upgrades.

### Per-minor upgrade machinery

Prisma 8 ships agent skills from [`prisma/orm/skills/prisma-8`](https://github.com/prisma/orm/tree/main/skills/prisma-8):

| Skill / reference | Audience | Purpose |
| --- | --- | --- |
| `prisma-8` | App / product work on Prisma 8 | Contract, queries, migrations, runtime |
| `references/upgrade-app.md` | **Apps** consuming `@prisma/orm-postgres`, etc. | Bump app deps, apply codemods, validate |
| `references/upgrade-extension.md` | **Extension authors** | Bump SPI deps one step at a time, apply codemods, run `check-pins`, test, commit |

Install / refresh from a Prisma 8 project:

```bash
pnpm add -D prisma
pnpm exec prisma skills sync
```

Or fetch the skill tree from GitHub (`prisma/orm`, `skills/prisma-8`). The older standalone `prisma-8-extension-upgrade` skill is folded into this tree.

Companion check (from the extension package):

```bash
cd packages/extension-ltree
pnpm run check-pins   # exit 0 = pins OK
```

### Consumer app guardrail

When a **user app** upgrades Prisma 8, the upgrade skill runs a **pre-flight**:

1. Read `prisma.config.ts` → list `extensions`
2. For each installed extension, read `node_modules/<pkg>/package.json` → find `@prisma/orm-*` pins
3. Compute the **lowest** pin across all extensions
4. **Refuse** to upgrade the app past that pin unless the user explicitly accepts the risk

So if `prisma-ltree` pins `8.0.0-rc.8` and the user wants a newer SPI, they must wait for (or contribute) a `prisma-ltree` release that pins that SPI after a successful extension upgrade run.

## prisma-ltree vs first-party extensions: checklist

| Concern | First-party (`pgvector`) | prisma-ltree (ours) | Status |
| --- | --- | --- | --- |
| `@prisma/orm-*` dep style | monorepo workspace pin | exact `"8.0.0-rc.8"` | Correct for external |
| Pack npm version | lockstep `8.0.0-rc.8` | independent `0.x` | Correct for external |
| `prismaNext` metadata in `package.json` | present in published packs | `{ family, dialects, type }` | Per layout docs |
| Runtime SPI deps | `dependencies` | `dependencies` | OK |
| Target peer for tests | `@prisma/orm-target-postgres` | same | OK |
| Upgrade skill workflow | N/A (monorepo bump) | use `upgrade-extension.md` | Documented here |
| Stable codec IDs | `pg/vector@1` | `pg/ltree@1`, `pg/ltree-array@1` | OK |
| Stable invariantIds | e.g. `pgvector:install-…` | `ltree:install-ltree-v1` | OK |
| Config key | `extensions` | `extensions` (not `extensionPacks`) | OK |
| CI pin enforcement | upstream monorepo CI | `pnpm run check-pins` in `ready` + CI | wired |

## What breaks vs what stays stable across Prisma 8 releases

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
- CLI config file name and envelope (`prisma.config.ts` + `definePrismaConfig`)

When upstream adds extension-author breaking changes, they ship a matching
`upgrading/extension/upgrades/<from>-to-<to>/instructions.md` entry.

## Upgrade workflow (extension authors)

When Prisma 8 publishes a new RC / minor (e.g. `8.0.0-rc.9` on npm for `@prisma/orm-*`):

1. **Install/refresh skills**: `prisma skills sync` or clone `prisma/orm` `skills/prisma-8`
2. **Read the transition**: `upgrading/extension/upgrades/<from>-to-<to>/instructions.md`
3. **Bump pins**: set every `@prisma/orm-*` in `packages/extension-ltree/package.json` to the target
4. **Install**: `vp install` / `pnpm install`
5. **Check pins**: `cd packages/extension-ltree && pnpm run check-pins`
6. **Apply codemods**: per `instructions.md` `changes[]`
7. **Re-emit contract**: `pnpm run build:contract-space` if instructions or emit shape changed
8. **Validate**: `vp run ready` from repo root
9. **Commit**: one commit per step: `chore: upgrade @prisma/* to 8.0.0-rc.9`
10. **Publish extension**: bump `prisma-ltree` semver if the release includes user-visible changes

Do not range-pin `@prisma/orm-*`. Do not version `prisma-ltree` lockstep with Prisma unless you intentionally change that policy.

## Release checklist (prisma-ltree)

Before publishing to npm:

1. `vp run ready`: format, lint, typecheck, test, build, **check-pins**
2. Framework pin in `package.json` matches the Prisma 8 SPI you tested against
3. `README.md` states the required `@prisma/orm-postgres@<pin>` version and that `prisma-ltree` uses independent semver
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
pnpm exec prisma migration plan           # plan migration changes (CLI bin: prisma)
```

## See also

- [Extension Packs: Naming and Layout](./extension-packs-naming-and-layout.md): `prismaNext` metadata, exports
- [Extensions Glossary](./extensions-glossary.md): `invariantId`, codec terminology
- [Ecosystem Extensions & Packs](./ecosystem-extensions-and-packs.md): four-slice model, contract spaces
- Active product home: [`prisma/orm`](https://github.com/prisma/orm)
- Skills: [`prisma/orm/skills/prisma-8`](https://github.com/prisma/orm/tree/main/skills/prisma-8)
- Official consumer docs: [Using extensions](https://www.prisma.io/docs/orm/extensions/using-extensions)
- Dependency strategy: exact-pin `@prisma/orm-*` per this document and `packages/extension-ltree/package.json`
