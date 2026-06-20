# prisma-ltree agent skills

Focused agent skills for developing and extending the `@prisma-next/extension-ltree` package. Each skill covers one workflow — not a monolithic catch-all.

Install with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
# From a clone of this repo (local path)
pnpm dlx skills add ./skills --all

# From GitHub (when published)
pnpm dlx skills add <owner>/prisma-ltree/skills --all
```

For a single agent runtime, swap `--all` for `-a <agent>` (e.g. `-a cursor`).

Also install the upstream Prisma Next extension-author skill for framework upgrades:

```bash
pnpm dlx skills add prisma/prisma-next/skills/extension-author --all
```

## Skill index

| Skill                                                       | When to use                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| [prisma-ltree](./prisma-ltree/SKILL.md)                     | Vague prompts — routes to the right workflow skill               |
| [prisma-ltree-onboard](./prisma-ltree-onboard/SKILL.md)     | First session, architecture questions, loading reference context |
| [prisma-ltree-codec](./prisma-ltree-codec/SKILL.md)         | Codecs, column helpers, encode/decode validation                 |
| [prisma-ltree-operators](./prisma-ltree-operators/SKILL.md) | Query operators, SQL lowering templates, ADR-governed API shapes |
| [prisma-ltree-test](./prisma-ltree-test/SKILL.md)           | Unit, golden, integration, and type-level tests                  |
| [prisma-ltree-develop](./prisma-ltree-develop/SKILL.md)     | Format, lint, typecheck, build, coverage, `ready` validation     |

## Design principles

- **One skill, one workflow.** Router skill (`prisma-ltree`) disambiguates; siblings do the work.
- **Docs live in the repo.** Skills point at `docs/` and `.sync/prisma-next/` — they don't duplicate full references inline.
- **Sync before SPI work.** Run `pnpm run sync-docs` before consulting upstream reference implementations.
- **Feature truth.** `docs/feature-support.md` is the authoritative matrix for supported vs planned vs out-of-scope.
