# Vendor trees

## `prisma-next/`

[prisma/prisma-next](https://github.com/prisma/prisma-next) is vendored here as a
**git subtree** (squashed). Agents and contributors use it as the always-on
reference for extension SPI types, pack layouts (pgvector / postgis / paradedb),
architecture docs, and the `extension-author` skill cluster.

| Need | Path |
| ---- | ---- |
| pgvector reference | `vendor/prisma-next/packages/3-extensions/pgvector/` |
| postgis reference | `vendor/prisma-next/packages/3-extensions/postgis/` |
| paradedb reference | `vendor/prisma-next/packages/3-extensions/paradedb/` |
| Upstream docs | `vendor/prisma-next/docs/` |
| Extension-author skills | `vendor/prisma-next/skills/extension-author/` |

Do **not** edit files under `vendor/prisma-next/` in this repo — changes belong
upstream. Do **not** add `vendor/*` to the pnpm workspace; it is reference-only.

### Refresh from upstream

Requires a clean working tree (creates a merge commit):

```bash
pnpm run sync-prisma-next
# equivalent:
# git subtree pull --prefix=vendor/prisma-next \
#   https://github.com/prisma/prisma-next.git main --squash
```

### Re-add after accidental deletion

```bash
git subtree add --prefix=vendor/prisma-next \
  https://github.com/prisma/prisma-next.git main --squash
```
