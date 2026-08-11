# Vendor trees

## `prisma-next/`

[prisma/prisma-next](https://github.com/prisma/prisma-next) is vendored here as a
**git subtree** (squashed). Agents and contributors use it as the always-on
reference for extension SPI types, pack layouts (pgvector / postgis / paradedb),
and architecture docs.

**Live agent skills** now ship from [`prisma/prisma/skills`](https://github.com/prisma/prisma/tree/main/skills)
(`prisma-8`, `prisma-8-extension-upgrade`, `prisma-next-upgrade`). Install with
`pnpm dlx skills add prisma/prisma/skills --all`. The skill trees under
`vendor/prisma-next/skills/` are historical snapshots — do not treat them as
current.

| Need | Path |
| ---- | ---- |
| pgvector reference | `vendor/prisma-next/packages/3-extensions/pgvector/` |
| postgis reference | `vendor/prisma-next/packages/3-extensions/postgis/` |
| paradedb reference | `vendor/prisma-next/packages/3-extensions/paradedb/` |
| Upstream docs | `vendor/prisma-next/docs/` |
| Live agent skills | https://github.com/prisma/prisma/tree/main/skills |

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
