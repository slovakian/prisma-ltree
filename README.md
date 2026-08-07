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
pnpm add prisma-ltree @prisma/orm-postgres@8.0.0-rc.1
```

Requires Node `>=24` and Prisma Next **`8.0.0-rc.1`** via `@prisma/orm-postgres` (exact pin —
see [versioning & compatibility](docs/prisma-next/versioning-and-compatibility.md)).
The CLI remains `prisma-next` (`npx prisma-next@latest`).

## Quickstart

Add the pack to your `prisma-next.config.ts`, author `ltree` columns, then query them with
type-safe operators:

```typescript
// prisma-next.config.ts
import { defineConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  contract: "./src/prisma/contract.prisma",
  extensions: [ltree],
});
```

```typescript
// Find every descendant of "Top.Science"
const rows = await db.orm.Category.where((c) => c.path.isDescendantOf("Top.Science"))
  .select("id")
  .all();
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
| `vendor/prisma-next/`       | Historical prisma-next git subtree (agent / contributor reference)                         |
| `examples/family-tree/`     | Tree-of-Life demo app exercising the extension                                             |
| `skills/`, `.agents/`       | Agent skills for adoption and query patterns                                               |
| `docs/`                     | Prisma Next architecture notes, ltree reference, specs, and ADRs                           |

## Development

```bash
pnpm install          # install dependencies
pnpm run ready        # check-pins + build + check + test (full gate)
```

Upstream Prisma Next source for agents lives at
[`vendor/prisma-next/`](vendor/prisma-next/) (git subtree; historical
[`prisma/prisma-next`](https://github.com/prisma/prisma-next) layout). The active product
home is [`prisma/prisma`](https://github.com/prisma/prisma). Refresh the subtree with
`pnpm run sync-prisma-next` when needed.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow (changesets, branch model,
skills) and [`AGENTS.md`](AGENTS.md) for extension-author conventions.

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). For security reports, see [`SECURITY.md`](SECURITY.md).

## License

[Apache-2.0](LICENSE) © 2026 Jason Procka
