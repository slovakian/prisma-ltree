---
"prisma-ltree": minor
---

Target Prisma 8 SPI `8.0.0-rc.8` and the unified `prisma` CLI (`prisma@latest`).

**Breaking for consumers:**

- Config file is `prisma.config.ts`. Wrap ORM options with `definePrismaConfig` from `prisma/config`. `prisma-next.config.ts` and the flat `defineConfig` shape no longer load.
- CLI is `prisma` (`npx prisma@latest`, `pnpm prisma`), not `prisma-next`. Commands stay `contract emit`, `db init`, `migration plan`.
- Pin `@prisma/orm-postgres` at `8.0.0-rc.8` (exact). `prisma-ltree` stays on independent `0.x` semver: install it with a caret. You do not need `prisma-ltree@8.0.0-rc.8`.
