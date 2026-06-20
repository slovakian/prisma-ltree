# Validation commands

## Root (monorepo)

| Command              | Effect                                   |
| -------------------- | ---------------------------------------- |
| `vp install`         | Install all workspace deps               |
| `vp check`           | Format, lint, typecheck entire workspace |
| `vp test`            | Run all package tests                    |
| `vp run build`       | Build all packages with build scripts    |
| `vp run ready`       | check → check-pins → test → build        |
| `pnpm run sync-docs` | Clone/update `.sync/prisma-next/`        |

## packages/extension-ltree

| Command                               | Effect                                                       |
| ------------------------------------- | ------------------------------------------------------------ |
| `vp test`                             | Unit + integration + type-level                              |
| `vp test --coverage`                  | With 95% threshold                                           |
| `vp run build`                        | tsdown → dist/                                               |
| `pnpm exec prisma-next-check-pins`    | Exact pin validation                                         |
| `pnpm exec prisma-next contract emit` | Regenerate contract.json / contract.d.ts (if source changed) |

## package.json scripts (extension-ltree)

Inspect `packages/extension-ltree/package.json` for:

- `check-pins` — wired into root `ready`
- `build` — tsdown build
- `test` — vitest

## CI

See `.github/workflows/ci.yml` for the CI command sequence (if present).
