# Contributing to prisma-ltree

Thanks for your interest in contributing! This guide covers the local development
workflow. By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

- Questions and ideas → [GitHub Discussions](https://github.com/slovakian/prisma-ltree/discussions)
- Bugs and feature requests → [GitHub Issues](https://github.com/slovakian/prisma-ltree/issues)
- Security reports → **do not open a public issue**, see [`SECURITY.md`](SECURITY.md)

## Prerequisites

- **Node** `>=24`
- **pnpm** `11.7.0` (the repo pins `packageManager`; `corepack enable` will honor it)
- **[Vite+](https://viteplus.dev)** — this repo's unified toolchain, invoked as `vp`
  (installed as a dependency; `pnpm install` provisions it)

## Getting started

```bash
git clone https://github.com/slovakian/prisma-ltree.git
cd prisma-ltree
pnpm install          # install dependencies
```

Upstream prisma-next is already at [`vendor/prisma-next/`](vendor/prisma-next/)
(git subtree). Agents and contributors consult it for reference implementations,
SPI types, and test patterns (see [`AGENTS.md`](AGENTS.md) for the path map).
Refresh with `pnpm run sync-prisma-next` when you need a newer upstream snapshot.

## Validating changes

Run the full gate before opening a PR:

```bash
pnpm run ready        # check-pins + build + vp check + test (the package gate)
```

Useful subsets:

```bash
vp check              # format, lint, type-check
vp check --fix        # auto-format/fix (oxfmt/oxlint) new or changed files
vp run --filter ./packages/extension-ltree test
```

## Branch & PR model

- Branch off `main`; open a PR back to `main`.
- The maintainer (`@slovakian`) reviews and approves every PR.
- CI (`.github/workflows/ci.yml`) must be green: `check-pins`, `build`, `vp check`,
  `vp test`, plus a pkg.pr.new preview publish.
- Fill in the PR checklist (it's pre-filled from the template).

## Changesets (required for user-facing changes)

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and
npm publishing. **Add a changeset for anything that affects the published `prisma-ltree`
package:**

```bash
pnpm run changeset    # select prisma-ltree, pick bump type, write a summary
```

Commit the generated `.changeset/*.md` alongside your change. Doc-only or repo-meta changes
that do not affect the package don't need one — add `[skip-version]` to the commit message
instead. Full details (bump types, the Version PR flow, OIDC trusted publishing) live in
[`docs/CHANGESETS.md`](docs/CHANGESETS.md).

## Dependency pins

`@prisma-next/*` dependencies are **exact-pinned by design** (currently `@0.16.0`). Do not
bump them casually — `pnpm run check-pins` enforces alignment, and upgrades follow
[`docs/prisma-next/versioning-and-compatibility.md`](docs/prisma-next/versioning-and-compatibility.md)
(one minor per commit).

## Conventions & where things live

- **Extension-author conventions:** [`AGENTS.md`](AGENTS.md) (root; `CLAUDE.md` symlinks to it)
- **Docs-site conventions:** [`apps/web/AGENTS.md`](apps/web/AGENTS.md)
- **Architecture decisions:** [`docs/decisions/`](docs/decisions/) (ADRs)
- **Agent skills:** `skills/` and `.agents/skills/` — load with the skills tooling described
  in `AGENTS.md`

Keep commits atomic and don't commit generated `contract.json` / `contract.d.ts` /
migration JSON edits by hand — those are emitted.
