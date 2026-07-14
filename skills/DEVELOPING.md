# Developing prisma-ltree skills

Contributor guide for the consumer skill cluster under `skills/`. If you are **using** the skills, read [`README.md`](./README.md) instead.

## Audience

Skills here are **for application developers** who consume `prisma-ltree` in a Prisma Next Postgres app — not for extension maintainers. Maintainer workflows (SPI, upgrade codemods, contract-space authoring) stay in repo docs (`CLAUDE.md`, `docs/prisma-next/`) and the upstream `prisma-next-extension-upgrade` skill.

## Cluster shape

Follow the upstream Prisma Next cluster conventions (see `vendor/prisma-next/skills/DEVELOPING.md`):

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

Do not document PSL contract attributes for `ltree` columns until PSL authoring ships — today consumers use the **TypeScript contract builder** only.

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md` with `name` + pushy `description` frontmatter.
2. Keep `SKILL.md` under ~500 lines; split heavy reference into `references/*.md` and link with when-to-read guidance.
3. Add a row to `skills/README.md`.
4. Add or update a journey-style prompt in your PR description (manual agent test) — full eval loop optional unless iterating on trigger quality.

## Maintainer-only skills

Extension upgrade skills belong under `.agents/skills/` / upstream `prisma/prisma-next/skills/extension-author/`, not in this consumer cluster.
