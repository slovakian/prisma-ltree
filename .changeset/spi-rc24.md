---
"prisma-ltree": minor
---

Target Prisma 8 SPI `8.0.0-rc.24` and `prisma@8.0.0-rc.34`.

- Exact-pin every `@prisma/orm-*` SPI package at `8.0.0-rc.24`.
- Move `@prisma/cli-engine` to `0.10.0` (toolchain peer).
- Pin `@prisma/orm-postgres` at `8.0.0-rc.24` (exact). Install the `prisma` CLI at `8.0.0-rc.34`. `prisma-ltree` stays on independent `0.x` semver.
