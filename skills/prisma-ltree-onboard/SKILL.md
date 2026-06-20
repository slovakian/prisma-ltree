---
name: prisma-ltree-onboard
description: >-
  Onboard to the prisma-ltree monorepo: project layout, four-slice extension
  architecture, sync-docs workflow, reference implementation map, and doc
  index. Use when starting a session on this repo, asking "how does
  prisma-ltree work", "where is X", "what's the project structure", "run
  sync-docs", "show me pgvector reference", or before any SPI work that needs
  upstream prisma-next source. Load this skill even if the user doesn't say
  "onboard" when they are clearly new to the extension codebase.
---

# prisma-ltree — Onboard

Load project context before changing extension code. This skill orients you to layout, architecture, and where to look — it does not implement features (use `prisma-ltree-codec`, `prisma-ltree-operators`, or `prisma-ltree-test` for that).

## Step 1 — Sync upstream reference (when doing SPI work)

The prisma-next source lives in `.sync/prisma-next/` (gitignored). Clone it before consulting reference implementations or upstream SPI types:

```bash
pnpm run sync-docs
```

If `.sync/prisma-next/` is missing and you need pgvector/postgis patterns or upgrade instructions, run sync first. Do not guess SPI shapes from memory.

## Step 2 — Know the layout

| Path                                                | Purpose                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/extension-ltree/`                         | The extension pack (`prisma-ltree` on npm)                          |
| `docs/prisma-next/`                                 | Extension architecture docs (mirrored/summarized from upstream)     |
| `docs/ltree/`                                       | PostgreSQL ltree reference (operators, functions, syntax)           |
| `docs/feature-support.md`                           | **Source of truth** for supported / planned / out-of-scope features |
| `docs/decisions/`                                   | ADRs governing API shapes (LCA, free functions, array receiver)     |
| `docs/spec/prisma-ltree-spec.md`                    | Full product spec                                                   |
| `.sync/prisma-next/packages/3-extensions/pgvector/` | Closest reference implementation                                    |
| `.sync/prisma-next/packages/3-extensions/postgis/`  | Multi-operator patterns                                             |

Read [references/project-layout.md](./references/project-layout.md) for the full file map inside `packages/extension-ltree/`.

## Step 3 — Four slices (mental model)

Every extension pack may provide some subset of:

1. **Contract slice** — Column descriptors, `CREATE EXTENSION` baseline migration
2. **Query-lane slice** — Typed operators lowering to SQL (`{{self}}`, `{{arg0}}`)
3. **Runtime slice** — Codecs (encode/decode), query operation implementations
4. **Migration slice** — Contract space with pinned `migrations/` artifacts

Entrypoints map to slices: `/control` (contract + migrate), `/runtime` (codecs + ops), `/column-types`, `/codec-types`, `/operation-types`, `/pack` (authoring metadata).

Details: `docs/prisma-next/ecosystem-extensions-and-packs.md`

## Step 4 — Pick the next skill

| Next task                             | Skill                                      |
| ------------------------------------- | ------------------------------------------ |
| Add or change a codec / column helper | `prisma-ltree-codec`                       |
| Add or change a query operator        | `prisma-ltree-operators`                   |
| Write or fix tests                    | `prisma-ltree-test`                        |
| Run validation before commit          | `prisma-ltree-develop`                     |
| Upgrade `@prisma-next/*`              | `prisma-next-extension-upgrade` (upstream) |

## Step 5 — Assumptions to surface

Before implementing, state assumptions explicitly (per agent best practice):

- Which tier/feature from `docs/feature-support.md` is in scope
- Whether the change touches contract space (needs migration regen) or runtime only
- Whether ADRs in `docs/decisions/` constrain the API shape

## Common pitfalls

1. **Skipping sync-docs** — SPI types and reference tests in `.sync/prisma-next/` are authoritative; stale or missing sync leads to wrong patterns.
2. **Ignoring feature-support.md** — Do not implement "out-of-scope" items or mark things supported without updating the matrix.
3. **Treating lquery/ltxtquery as column types** — They are validated string params cast in SQL templates, not storage types.
4. **One mega-change** — Extension work slices vertically: codec → types → operator → tests → feature-support update.

## Reference files

- [project-layout.md](./references/project-layout.md) — Key files in `packages/extension-ltree/`
- [docs-index.md](./references/docs-index.md) — When to read which doc
- [reference-implementations.md](./references/reference-implementations.md) — Upstream paths to mirror

## Checklist

- [ ] Ran `pnpm run sync-docs` if SPI/reference work is needed
- [ ] Read `docs/feature-support.md` for the feature in question
- [ ] Checked `docs/decisions/` for ADR constraints
- [ ] Routed to the correct sibling skill for implementation
