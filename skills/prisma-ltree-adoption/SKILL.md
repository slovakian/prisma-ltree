---
name: prisma-ltree-adoption
description: >-
  Adopt prisma-ltree in a Prisma Next Postgres app — install the npm package,
  add prisma-ltree/control to prisma-next.config.ts, declare ltree() and
  ltreeArray() columns in the TypeScript contract, wire prisma-ltree/runtime
  in db.ts, and apply CREATE EXTENSION ltree via db init or migrate. Use for
  "add ltree", "install prisma-ltree", "enable ltree extension", "ltree
  column", "category path column", "hierarchical path in schema", "wire
  prisma-ltree", "CREATE EXTENSION ltree", "ltree migration", "taxonomy
  table", and brownfield Postgres that already has ltree enabled. Requires
  @prisma-next/* version matching prisma-ltree's pin. Also use when agents need
  to know how path strings are validated, or how to declare GiST indexes on
  ltree columns (Prisma Next 0.16+).
---

# prisma-ltree — Adoption

> **Wire once across control, contract, and runtime — then query.**

This skill takes a Prisma Next **Postgres** app from "no ltree" to "typed `ltree` columns ready for queries." It does not teach generic Prisma Next setup — if the project has no PN scaffold yet, run `prisma-next-quickstart` first.

## When to Use

- User wants to add hierarchical path columns to their schema.
- User asks how to install or configure `prisma-ltree`.
- User needs the Postgres `ltree` extension enabled in their database.
- User is modeling category trees, org charts, taxonomies, or filesystem-like paths.

## When Not to Use

- User already has ltree columns wired and wants query examples → `prisma-ltree-queries`.
- User wants raw SQL only or non-Postgres targets → see _What prisma-ltree doesn't do yet_.
- User is authoring the extension package → not this skill.

## Prerequisites

Read the project's `package.json` before changing deps:

| Requirement      | Typical value (verify in npm)                                                   |
| ---------------- | ------------------------------------------------------------------------------- |
| Node             | `>=24`                                                                          |
| `@prisma-next/*` | Exact pin matching `prisma-ltree`'s `peerDependencies` / README (e.g. `0.16.0`) |
| Target           | Postgres only                                                                   |

If the app's `@prisma-next/*` version is **newer** than `prisma-ltree` allows, stop and ask the user to upgrade `prisma-ltree` or align framework versions — do not bump past the extension pin silently.

Install upstream PN skills when the agent lacks Prisma Next context:

```bash
pnpm dlx skills add prisma/prisma-next#v0.16.0 --all
pnpm dlx skills add slovakian/prisma-ltree --all
```

## Key Concepts

- **Path string** — A dot-separated sequence of labels (`Top.Science.Astronomy`). Each label: alphanumeric, `_`, `-`; max 1000 chars per label; max 65535 labels. The codec validates on write — invalid paths fail at encode time, not silently in SQL.
- **Three wiring points** — Same pattern as other PN extension packs (postgis, pgvector):
  - **Control descriptor** — teaches the CLI/emitter about the pack and baseline migration.
  - **Contract pack + column helper** — declares storage type and registers extension metadata in the contract.
  - **Runtime descriptor** — registers codecs and query operations for execution.
- **Baseline migration** — The pack ships `CREATE EXTENSION IF NOT EXISTS ltree` (invariant `ltree:install-ltree-v1`). Applied under `migrations/ltree/` when you run `db init` / `migrate` — not something app authors hand-author.
- **TS contract only (today)** — Declare columns with `ltree()` / `ltreeArray()` from `prisma-ltree/column-types` in a **TypeScript** contract (`contract.ts`). PSL attributes like `postgis.Geometry(...)` are not available for ltree yet.

## Workflow — Install and wire

The concept: add one npm dependency, register the pack in three places, emit the contract, sync the database.

### 1. Install the package

```bash
pnpm add prisma-ltree
```

### 2. Control — `prisma-next.config.ts`

Prefer the Postgres façade when the project already uses it:

```typescript
import ltree from "prisma-ltree/control";
import { defineConfig } from "@prisma-next/postgres/config";

export default defineConfig({
  contract: "./src/prisma/contract.ts",
  extensions: [ltree],
  db: { connection: process.env.DATABASE_URL! },
});
```

Projects on the verbose multi-import config shape use the same control import with `extensionPacks: [ltree]` — match whichever style the repo already uses.

### 3. Contract — declare columns (TypeScript)

```typescript
import { int4Column, textColumn } from "@prisma-next/adapter-postgres/column-types";
import sqlFamily from "@prisma-next/family-sql/pack";
import { defineContract, field, model } from "@prisma-next/sql-contract-ts/contract-builder";
import { ltree, ltreeArray } from "prisma-ltree/column-types";
import ltreePack from "prisma-ltree/pack";
import postgres from "@prisma-next/target-postgres/pack";

export const contract = defineContract({
  family: sqlFamily,
  target: postgres,
  extensionPacks: { ltree: ltreePack },
  models: {
    Category: model("Category", {
      fields: {
        id: field.column(int4Column).id(),
        name: field.column(textColumn),
        path: field.column(ltree()),
        // Optional: ltree[] for first-match array operators
        // altPaths: field.column(ltreeArray()),
      },
    }).sql({ table: "category" }),
  },
});
```

Mirror **existing import paths** in the project — many apps use `@prisma-next/postgres/contract-builder` façade re-exports instead of the granular imports above. Copy the style already in the repo; do not introduce a second convention.

Re-emit after edits:

```bash
pnpm prisma-next contract emit
```

### 4. Runtime — `src/prisma/db.ts`

```typescript
import ltree from "prisma-ltree/runtime";
import { postgres } from "@prisma-next/postgres/runtime";
import contractJson from "./contract.json";

export const db = postgres({
  contractJson,
  extensions: [ltree],
});
```

Match the factory shape your scaffold uses (`postgres<Contract>({ ... })`, connection options, etc.) — only add `ltree` to the `extensions` array.

### 5. Database — extension + tables

**Greenfield** (PN manages schema):

```bash
pnpm prisma-next db init
# or, for migration history: migration plan + migrate
```

**Brownfield** (DB already has `ltree` and tables):

```bash
pnpm prisma-next contract emit
pnpm prisma-next db sign
pnpm prisma-next db verify
```

Ask the system whether the extension is present — do not assume:

```sql
SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'ltree');
```

If the extension is missing and PN has not applied the pack baseline yet, `db init` / `migrate` applies the pack's `CREATE EXTENSION` migration.

### 6. Hand off

Once a round-trip insert/select on an `ltree` column works, route query work to `prisma-ltree-queries`.

## Modeling paths

Paths are **data you design**, not auto-generated by the extension:

| Pattern           | Example path                    | Notes                                                                      |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------- |
| Materialized path | `Electronics.Computers.Laptops` | One column holds full ancestry; fast subtree queries with `isDescendantOf` |
| Root label        | `Top`                           | Single-label paths are valid                                               |
| Sibling ordering  | Not in ltree                    | Use a separate `sort_order` column — ltree orders lexically among siblings |

When inserting rows, build paths in application code (`parentPath.concatText("Child")` in queries — see queries skill) or store precomputed strings that pass codec validation.

## Common Pitfalls

1. **Skipping runtime wiring.** Control + contract alone do not register codecs at execute time — queries fail or lack ltree methods if `prisma-ltree/runtime` is missing from `db.ts`.
2. **Framework / extension version mismatch.** `prisma-ltree` pins exact `@prisma-next/*` versions. Upgrading PN without a matching extension release breaks types and runtime identity.
3. **Skipping a GiST index on hot path columns.** Prefer `@@index([path], type: "gist")` (PSL) or `constraints.index(..., { type: "gist" })` (TS) for hierarchy and pattern-match queries (Prisma Next 0.16+).
4. **Invalid path strings.** Empty labels, double dots, or special characters in labels fail codec validation — normalize slugs before insert.
5. **Confusing `ltree` and `ltree[]`.** Scalar hierarchy ops live on `ltree()` columns; first-match ops live on `ltreeArray()` columns — different column helpers and methods.
6. **Hand-running `CREATE EXTENSION` when PN already manages it.** Prefer pack migrations; manual DDL is only for exceptional brownfield cases.

## What prisma-ltree doesn't do yet

- **Non-Postgres targets** — Mongo, SQLite, etc. Workaround: not supported; use Postgres for ltree.
- **GiST opclass typmod (`siglen`)** — `gist_ltree_ops(siglen=N)` is not expressible via the index-type registry; declare a plain `type: "gist"` index instead.
- **`lquery` / `ltxtquery` as column types** — patterns are **string parameters** to `matchesLquery` / `matchesLtxtquery`, not stored column types.
- **Boolean `ltree[]` operators** (`ltree[] @> ltree`, etc.) — out of scope; use scalar ops or first-match array ops instead.

## Reference Files

- Package README: `node_modules/prisma-ltree/README.md` (after install)
- Feature matrix: https://github.com/slovakian/prisma-ltree/blob/main/docs/feature-support.md
- PostgreSQL ltree semantics: https://www.postgresql.org/docs/current/ltree.html

## Checklist

- [ ] Confirmed Postgres target and `@prisma-next/*` pin compatible with installed `prisma-ltree`.
- [ ] Added `prisma-ltree/control` to config `extensions` / `extensionPacks`.
- [ ] Registered `prisma-ltree/pack` in contract `extensionPacks` and declared `ltree()` / `ltreeArray()` columns.
- [ ] Added `prisma-ltree/runtime` to `db.ts` `extensions`.
- [ ] Ran `contract emit` after contract edits.
- [ ] Applied or signed DB state so `ltree` extension and tables match contract.
- [ ] Routed next query work to `prisma-ltree-queries`.
