---
"prisma-ltree": minor
---

Target Prisma 8 SPI `8.0.0-rc.16` and `prisma@8.0.0-rc.21`.

**Breaking for consumers:**

- Pin `@prisma/orm-postgres` at `8.0.0-rc.16` (exact). Install the `prisma` CLI at `8.0.0-rc.21`. `prisma-ltree` stays on independent `0.x` semver.
- A stored contract names `dataType` instead of `nativeType`. Codec ids stay `pg/ltree@1` and `pg/ltree-array@1`. Data type ids are `ltree/ltree` and `ltree/ltree-array`.
- Rewrite a contract from SPI `8.0.0-rc.14` or earlier with the 8.0.0-rc.15 data-type script and these lines: `--data-type pg/ltree@1=ltree/ltree` and `--data-type pg/ltree-array@1=ltree/ltree-array`.
