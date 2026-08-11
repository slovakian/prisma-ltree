---
name: prisma-ltree
description: >-
  Route vague PostgreSQL ltree / hierarchy / taxonomy prompts to the right
  prisma-ltree skill. Use for "help with ltree", "hierarchical paths in
  Postgres", "category tree", "org chart paths", "materialized path",
  "taxonomy", "ltree extension", "prisma-ltree", "tree queries in Prisma
  Next", "ancestor descendant query", "lquery", "ltxtquery", and "how do I
  model nested categories" when the user has or wants prisma-ltree. Do NOT use
  when the prompt clearly matches adoption (install, config, contract column,
  CREATE EXTENSION, wire runtime) — load prisma-ltree-adoption; or queries
  (isAncestorOf, isDescendantOf, matchesLquery, nlevel, subpath, lca,
  concatText, firstAncestorOf) — load prisma-ltree-queries; or base Prisma Next
  setup with no ltree mention — load the prisma-8 skill instead.
---

# prisma-ltree — Router

> **Hierarchical paths in Postgres, typed in Prisma Next.**

This skill disambiguates prompts about PostgreSQL `ltree` in a Prisma Next app. When the user has not yet named a concrete task — _"help me with category trees"_, _"how does ltree work in Prisma?"_ — route them to the right sibling skill.

## When to Use

- The user mentions `ltree`, hierarchical paths, taxonomies, org charts, or nested categories **and** Prisma Next (or `prisma-ltree`).
- The prompt is a meta-question: overview, where to start, which operator to use (without naming one).
- You need to decide between **setting up** the extension vs **writing queries** with it.

## When Not to Use

- **Installing or wiring the extension** → `prisma-ltree-adoption`.
- **Writing a specific query** (ancestor check, pattern match, depth, LCA, path concat) → `prisma-ltree-queries`.
- **No ltree involved** — generic Prisma Next setup, migrations, or ORM usage → upstream `prisma-8` skill.
- **Maintaining the prisma-ltree package itself** — not covered by this cluster; see repo `AGENTS.md`.

## Routing rules

If the prompt clearly matches a workflow skill, route there **without asking**.

Otherwise ask **one** disambiguating question:

- _"Do you need to install and wire prisma-ltree into your project, or do you already have ltree columns and want to write queries?"_
  - Install / config / contract / migration → `prisma-ltree-adoption`
  - Queries / operators / path logic → `prisma-ltree-queries`
- _"Is your app already on Prisma Next with Postgres?"_
  - No → `prisma-8` (quickstart reference) first, then `prisma-ltree-adoption`
  - Yes → continue to adoption or queries

## Canonical model (one paragraph)

PostgreSQL `ltree` stores **dot-separated label paths** (e.g. `Top.Science.Astronomy`). The **prisma-ltree** extension pack adds a typed `ltree` column codec, installs the contrib extension via a baseline migration, and registers **methods on ltree columns** in the SQL builder and ORM — `path.isDescendantOf(...)`, `path.matchesLquery(...)`, `path.nlevel()`, and others — so you do not drop to raw SQL for standard tree operations. Array columns use `ltree[]` with a separate codec and **first-match** methods (`paths.firstAncestorOf(...)`).

Three planes consumers wire once:

1. **Control** — `prisma-next.config.ts` lists `prisma-ltree/control` in `extensions`.
2. **Contract** — PSL (`ltree.Ltree()` / `ltree.LtreeArray()`) or TypeScript (`ltree()` / `ltreeArray()`) plus `prisma-ltree/pack`.
3. **Runtime** — `db.ts` passes `prisma-ltree/runtime` in `extensions`.

After that, query authoring is the day-to-day work (`prisma-ltree-queries`).

## Checklist

- [ ] If the prompt matches adoption or queries, route directly — do not answer from this skill.
- [ ] If the user lacks a Prisma Next Postgres project, route to `prisma-8` before ltree adoption.
- [ ] Do not attempt full setup or query examples from this skill — load the specific skill first.
