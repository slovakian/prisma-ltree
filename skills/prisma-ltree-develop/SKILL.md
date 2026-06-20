---
name: prisma-ltree-develop
description: >-
  Run prisma-ltree validation: vp install, vp check (format/lint/typecheck),
  vp test, vp test --coverage, vp run build, vp run ready, and
  prisma-next-check-pins for exact @prisma-next/* alignment. Use before
  commits, when CI fails, when asked to "run checks", "validate the extension",
  "run ready", "check pins", or "is this ready to merge". Do NOT use for
  writing new tests (prisma-ltree-test) or framework minor upgrades
  (prisma-next-extension-upgrade).
---

# prisma-ltree — Develop & Validate

This monorepo uses [Vite+](https://viteplus.dev/) (`vp` CLI). The extension package is `packages/extension-ltree/`.

## Standard workflow

```bash
vp install          # after pull or dependency change
vp check            # format + lint + typecheck (oxfmt, oxlint, tsgo)
vp test             # unit + integration + type-level tests
vp run build        # build dist/ for extension-ltree
```

## Full validation gate

```bash
vp run ready
```

From root `package.json`, `ready` runs:

1. `vp check`
2. `vp run -r check-pins` — exact `@prisma-next/*` pin alignment
3. `vp run -r test`
4. `vp run -r build`

Run this before declaring work merge-ready.

## Pin check (extension-specific)

Prisma Next extensions pin every `@prisma-next/*` dependency to a **single exact version** (no `^`, `~`, ranges, or `workspace:` in published specs).

```bash
cd packages/extension-ltree
pnpm exec prisma-next-check-pins
```

Or via workspace: `vp run -r check-pins`

On failure: fix `package.json` entries to exact versions, re-run `pnpm install`, retry.

See `docs/prisma-next/versioning-and-compatibility.md` for upgrade workflow — use upstream `prisma-next-extension-upgrade` skill for bumps, not this skill.

## Coverage

```bash
vp test --coverage
```

Threshold: **95%** (configured in `packages/extension-ltree/vite.config.ts`).

## Sync docs (when SPI work)

```bash
pnpm run sync-docs
```

Not part of `ready`, but required before consulting `.sync/prisma-next/` reference implementations.

## Troubleshooting

| Symptom                        | Action                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| Type errors after pin bump     | Load `prisma-next-extension-upgrade`, apply transition instructions |
| `check-pins` failure           | Align all `@prisma-next/*` to same exact version                    |
| Integration test PGlite errors | Confirm `CREATE EXTENSION ltree` in fixture                         |
| Format/lint failures           | Run `vp check` — it auto-fixes where configured                     |
| Env/tooling issues             | `vp env doctor` and include output when asking for help             |

Read [references/validation-commands.md](./references/validation-commands.md) for package-specific scripts.

## Pre-commit checklist

- [ ] `vp check` passes
- [ ] `vp test --coverage` passes
- [ ] `vp run build` succeeds
- [ ] `pnpm exec prisma-next-check-pins` passes (if pins changed)
- [ ] `docs/feature-support.md` updated (if user-facing surface changed)

## Common pitfalls

1. **Running npm instead of vp** — This repo is Vite+ managed; use `vp` commands.
2. **Skipping check-pins after manual package.json edits** — CI will fail.
3. **Building before tests** — Tests don't require dist for most unit tests, but `ready` runs both.
4. **Casual `@prisma-next/*` bumps** — One minor per commit via upgrade skill; never jump versions.

## Reference files

- [validation-commands.md](./references/validation-commands.md) — Script and export map
