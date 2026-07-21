# prisma-ltree

[![npm](https://img.shields.io/npm/v/prisma-ltree.svg)](https://www.npmjs.com/package/prisma-ltree)
[![CI](https://github.com/slovakian/prisma-ltree/actions/workflows/ci.yml/badge.svg)](https://github.com/slovakian/prisma-ltree/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Docs](https://img.shields.io/badge/docs-prisma--ltree.procka.org-blue)](https://prisma-ltree.procka.org)

A [Prisma Next](https://github.com/prisma/prisma) extension pack for PostgreSQL's
[`ltree`](https://www.postgresql.org/docs/current/ltree.html) hierarchical-tree data type.

Model category trees, org charts, taxonomies, and filesystem-like paths in Postgres and
query them with type-safe, prisma-native operators — ancestor/descendant checks,
`lquery`/`ltxtquery` pattern matching, path manipulation, and lowest-common-ancestor
computation — without dropping to raw SQL.

- 📦 **npm:** [`prisma-ltree`](https://www.npmjs.com/package/prisma-ltree)
- 📖 **Docs:** [prisma-ltree.procka.org](https://prisma-ltree.procka.org)
- 🗺️ **Feature matrix:** [`docs/feature-support.md`](docs/feature-support.md)

## Install

```bash
pnpm add prisma-ltree
```

Requires Node `>=24` and `@prisma-next/*@0.16.0` (exact pin — see
[versioning & compatibility](docs/prisma-next/versioning-and-compatibility.md)).

## Quickstart

Add the pack to your `prisma-next.config.ts`, author `ltree` columns, then query them with
type-safe operators:

```typescript
// prisma-next.config.ts
import ltree from "prisma-ltree/control";
// ...compose into extensionPacks: [ltree]
```

```typescript
// Find every descendant of "Top.Science"
sql
  .from(tables.category)
  .select({ id: tables.category.columns.id })
  .where(tables.category.columns.path.isDescendantOf(param("prefix")))
  .build({ params: { prefix: "Top.Science" } });
```

The full configuration, contract authoring (PSL **and** TypeScript lanes), runtime setup,
and the complete operator reference live in the
**[package README](packages/extension-ltree/README.md)** and the
**[docs site](https://prisma-ltree.procka.org)**.

## Repository layout

This is a [Vite+](https://viteplus.dev) (`vp`) + pnpm workspace monorepo.

| Path                        | What                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/extension-ltree/` | The published `prisma-ltree` extension pack ([README](packages/extension-ltree/README.md)) |
| `apps/web/`                 | Documentation site (Fumadocs + TanStack Start)                                             |
| `vendor/prisma-next/`       | Upstream prisma-next git subtree (agent / contributor reference)                           |
| `examples/family-tree/`     | Tree-of-Life demo app exercising the extension                                             |
| `skills/`, `.agents/`       | Agent skills for adoption and query patterns                                               |
| `docs/`                     | prisma-next architecture, ltree reference, specs, and ADRs                                 |

## Development

```bash
pnpm install          # install dependencies
pnpm run ready        # check-pins + build + check + test (full gate)
```

Upstream prisma-next lives at [`vendor/prisma-next/`](vendor/prisma-next/) (git
subtree). Refresh with `pnpm run sync-prisma-next` when needed.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow (changesets, branch model,
skills) and [`AGENTS.md`](AGENTS.md) for extension-author conventions.

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). For security reports, see [`SECURITY.md`](SECURITY.md).

## License

[Apache-2.0](LICENSE) © 2026 Jason Procka
