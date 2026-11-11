---
"prisma-ltree": minor
---

Target Prisma 8 SPI `8.0.0-rc.23` and `prisma@8.0.0-rc.33`.

- Exact-pin every `@prisma/orm-*` SPI package at `8.0.0-rc.23` (rc.16 → rc.23, one RC per commit).
- Pin `@prisma/orm-postgres` at `8.0.0-rc.23` (exact). Install the `prisma` CLI at `8.0.0-rc.33`. `prisma-ltree` stays on independent `0.x` semver.
- Declare the `ltree` Postgres extension in the pack contract (unbound namespace) and ship create/declare/search-path migrations so `db sign` no longer depends on the install invariant alone.
- Codec descriptors declare `jsonType` (`string` for `ltree`, `array` for `ltree[]`).
