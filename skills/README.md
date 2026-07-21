# prisma-ltree agent skills

Agent skills for [prisma-ltree](https://github.com/slovakian/prisma-ltree) — typed PostgreSQL `ltree` support in [Prisma Next](https://github.com/prisma/prisma-next) apps.

> **Install the skills version that matches your `prisma-ltree` and `@prisma-next/*` pins.** The skill cluster documents the extension surface at the framework version the package was validated against (today `@prisma-next/*@0.16.0`).

## What's in the box

One repo path, three consumer skills. Each skill is a `SKILL.md` whose `description` field an agent runtime matches against the user's prompt:

| Skill                   | Scope                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `prisma-ltree`          | Router — catches vague ltree / hierarchy / taxonomy prompts and routes to a specific skill.                                      |
| `prisma-ltree-adoption` | Install `prisma-ltree`, wire control/runtime/contract, apply the `CREATE EXTENSION ltree` baseline, model paths in the contract. |
| `prisma-ltree-queries`  | Write hierarchy, pattern-match, scalar, concat, and array first-match queries against `ltree` / `ltree[]` columns.               |

These skills assume the user already has (or is setting up) a **Postgres-target Prisma Next app**. For base Prisma Next workflows — init, contract emit, migrations, `db.ts`, generic queries — install the upstream cluster first:

```bash
pnpm dlx skills add prisma/prisma-next#v0.16.0 --all
```

## Install

From an existing Prisma Next project (or after `prisma-next init`):

```bash
# Installs every prisma-ltree skill for every agent runtime the CLI detects.
pnpm dlx skills add slovakian/prisma-ltree --all
```

Pin to a release tag when you need the skill text to match a specific published version:

```bash
pnpm dlx skills add slovakian/prisma-ltree#v0.1.0 --all
```

Skills install at the **project level** (same as upstream Prisma Next skills). For a single agent runtime, swap `--all` for `-a <agent>` (e.g. `-a cursor`, `-a claude-code`).

## Version alignment

| Package            | Role                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `prisma-ltree@…`   | Extension npm package — query operators, codecs, baseline migration            |
| `@prisma-next/*@…` | Framework pin baked into `prisma-ltree`'s `package.json` — must match your app |
| Skills git ref     | Should track the same release as `prisma-ltree` when possible                  |

Before upgrading `@prisma-next/*` past the extension's pinned minor, check for a newer `prisma-ltree` release. The upstream `prisma-next-upgrade` skill enforces extension pins automatically.

## Contributing

Authoring rules for skills in this directory: [`DEVELOPING.md`](./DEVELOPING.md).

## License

Apache-2.0 — same as the extension package.
