---
"prisma-ltree": minor
---

Target Prisma Next `8.0.0-rc.1` from `prisma/prisma` main.

**Breaking for consumers:** the retired `@prisma-next/*` scope is replaced by `@prisma/orm-*`. Apps should depend on `@prisma/orm-postgres@8.0.0-rc.1` (exact pin) and compose the pack via `extensions` (not `extensionPacks`). The `prisma-next` CLI name is unchanged.
