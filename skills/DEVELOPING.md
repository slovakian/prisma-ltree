# Developing prisma-ltree skills

Contributor guide for the consumer skill cluster under `skills/`. If you are **using** the skills, read [`README.md`](./README.md) instead.

## Audience

Skills here are **for application developers** who consume `prisma-ltree` in a Prisma Next Postgres app — not for extension maintainers. Maintainer workflows (SPI, upgrade codemods, contract-space authoring) stay in repo docs (`AGENTS.md`, `docs/prisma-next/`) and the upstream `prisma-8-extension-upgrade` skill from [`prisma/prisma/skills`](https://github.com/prisma/prisma/tree/main/skills).

## Cluster shape

Follow the upstream Prisma skill conventions (see `prisma/prisma/skills` and the historical notes under `vendor/prisma-next/skills/`):

- **One user goal per skill** — do not merge adoption and queries into a mega-skill.
- **Router skill** (`prisma-ltree`) only disambiguates; it does not answer workflow questions itself.
- **`description:` frontmatter is the trigger** — include user phrases, operator names, and Postgres `ltree` vocabulary.
- **Teach concepts, not long scripts** — mental model + the query/command that reveals state.
- **Verify claims against shipped surface** — `docs/feature-support.md` is the source of truth for supported vs planned vs out-of-scope.

## Verify before you ship

When editing a skill, confirm every API name against:

| What                                                      | Where                                        |
| --------------------------------------------------------- | -------------------------------------------- |
| Supported operators & status                              | `docs/feature-support.md`                    |
| Package exports & install                                 | `packages/extension-ltree/README.md`         |
| ADR decisions (LCA shape, array receiver, free functions) | `docs/decisions/ADR-*.md`                    |
| Executable behaviour                                      | `packages/extension-ltree/test/integration/` |

Document both **PSL** (`ltree.Ltree()` / `ltree.LtreeArray()`) and **TypeScript** (`ltree()` / `ltreeArray()`) contract authoring — they are parity-proven.

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md` with `name` + pushy `description` frontmatter.
2. Keep `SKILL.md` under ~500 lines; split heavy reference into `references/*.md` and link with when-to-read guidance.
3. Add a row to `skills/README.md`.
4. Add or update a journey-style prompt in your PR description (manual agent test) — full eval loop optional unless iterating on trigger quality.

## Maintainer-only skills

Extension upgrade skills belong under `.agents/skills/` / upstream [`prisma/prisma/skills`](https://github.com/prisma/prisma/tree/main/skills) (`prisma-8-extension-upgrade`), not in this consumer cluster. Refresh them with:

```bash
pnpm dlx skills add prisma/prisma/skills --all
```
