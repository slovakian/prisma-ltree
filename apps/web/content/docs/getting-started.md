---
title: Get started
description: Install and configure prisma-ltree in a Prisma 8 Postgres app
---

This guide adds the `prisma-ltree` extension pack to a Prisma 8 Postgres project. You need a `prisma.config.ts`, an emitted contract, and a `db.ts` runtime entrypoint.

## Installation

Install the pack and pin the Postgres facade to the SPI this pack was tested against. Leave `prisma-ltree` on a caret range. You do not install `prisma-ltree@8.0.0-rc.8`.

```bash
pnpm add prisma-ltree @prisma/orm-postgres@8.0.0-rc.8
pnpm add -D prisma
```

Or install `prisma-ltree` alone if you already pin the facade:

<!-- ::install-command -->

`prisma-ltree` exact-pins every `@prisma/orm-*` SPI package to `8.0.0-rc.8`. Match `@prisma/orm-postgres` (and any other `@prisma/orm-*` package you install) to that pin. Pre-releases do not match caret ranges such as `^8.0.0`.

The CLI package is `prisma@latest` (today `8.0.0-rc.12`). That CLI version can differ from the SPI pin. `prisma@8.0.0-rc.12` depends on `@prisma/orm-toolchain@8.0.0-rc.8`.

## Configuration

Register the pack in `prisma.config.ts`. Wrap the ORM options in `definePrismaConfig` from `prisma/config`:

```typescript
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.ts",
    extensions: [ltree],
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});
```

Use the config key `extensions` (not `extensionPacks`). If this file reads `process.env`, import `dotenv/config` first. The loader does not load `.env` for you.

## Contract

Declare `ltree` columns in either authoring lane: `contract.prisma` (PSL) or `contract.ts` (TypeScript). Both emit the same compiled contract. See [Author ltree columns](/docs/authoring) for the PSL surface (`ltree.Ltree()` and `ltree.LtreeArray()`) and a side-by-side comparison.

This guide uses the TypeScript contract with `ltree()` from `prisma-ltree/column-types`.

```typescript
import { defineContract } from "@prisma/orm-postgres/contract-builder";
import { ltree } from "prisma-ltree/column-types";
import ltreePack from "prisma-ltree/pack";

export const contract = defineContract(
  {
    extensions: { ltree: ltreePack },
  },
  ({ field, model }) => ({
    models: {
      Category: model("Category", {
        fields: {
          id: field.id.int(),
          name: field.string(),
          path: field.column(ltree()),
        },
      }).sql({ table: "category" }),
    },
  }),
);
```

Re-emit after contract edits:

```bash
pnpm prisma contract emit
```

## Runtime

Register codecs and query operations at execute time:

```typescript
import postgres from "@prisma/orm-postgres/runtime";
import ltree from "prisma-ltree/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const db = postgres<Contract>({
  contractJson,
  extensions: [ltree],
  url: process.env.DATABASE_URL!,
});
```

Control and contract wiring alone are not enough. Queries fail or lack ltree methods without `prisma-ltree/runtime` in `extensions`.

## Database setup

The pack ships a baseline migration that runs `CREATE EXTENSION IF NOT EXISTS ltree`. Apply it with Prisma 8’s control plane:

```bash
pnpm prisma db init
```

For projects using migration history, use `migration plan` and `migrate` instead. On brownfield databases that already have `ltree` enabled, emit the contract and run `db sign` / `db verify` to align the marker.

## Inserting tree paths

Paths are plain strings validated by the codec (dot-separated labels, e.g. `electronics.computers.laptops`). Build and insert them in application code:

```typescript
import { db } from "./prisma/db";

async function seedCategories() {
  await db.orm.Category.createMany([
    { path: "electronics", name: "Electronics" },
    { path: "electronics.computers", name: "Computers" },
    { path: "electronics.computers.laptops", name: "Laptops" },
  ]);
}
```

## Basic queries

Ltree operators attach to ltree-typed fields in the ORM lane, and to column references in the SQL query builder. They do not appear as nested Prisma Client `where` objects.

```typescript
import { db } from "./prisma/db";

const rows = await db.orm.Category.where((c) => c.path.isDescendantOf("electronics"))
  .select("id", "path")
  .all();
```

See [Hierarchy operators](/docs/operations/hierarchy) and [Pattern matching operators](/docs/operations/pattern-matching) for the full operator set.

## Index path columns

Ancestor, descendant, and pattern queries need a Generalized Search Tree (GiST) index. Declare it on the path column:

```prisma
@@index([path], type: "gist")
```

See [Add a GiST index](/docs/indexes) for TypeScript, `ltree[]`, and `siglen` (Prisma doesn’t support that yet).
