---
title: Getting Started
description: Install and configure prisma-ltree in a Prisma Next Postgres app
---

This guide wires the `prisma-ltree` extension pack into a **Prisma Next** Postgres project. It assumes you already have a Prisma Next app scaffold (`prisma-next.config.ts`, emitted contract, and a `db.ts` runtime entrypoint).

## Installation

```bash
pnpm add prisma-ltree @prisma/orm-postgres@8.0.0-rc.1
```

Or install `prisma-ltree` alone if you already pin the facade:

<!-- ::install-command -->

`prisma-ltree` exact-pins `@prisma/orm-*` packages to **`8.0.0-rc.1`**. Align `@prisma/orm-postgres` (and any other Prisma Next packages you install) with that pin before continuing. Pre-releases do not match caret ranges like `^0.x`.

## Configuration

Register the pack in `prisma-next.config.ts`:

```typescript
import { defineConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  contract: "./src/prisma/contract.ts",
  extensions: [ltree],
  db: {
    connection: process.env.DATABASE_URL!,
  },
});
```

Use the config key `extensions` (not `extensionPacks`).

## Contract

Declare `ltree` columns in either authoring lane: `contract.prisma` (PSL) or `contract.ts` (TypeScript). Both emit the same compiled contract. See [Authoring Contracts](/docs/authoring) for the PSL surface (`ltree.Ltree()` and `ltree.LtreeArray()`) and a side-by-side comparison.

This guide uses the **TypeScript contract** with `ltree()` from `prisma-ltree/column-types`.

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
pnpm prisma-next contract emit
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

The pack ships a baseline migration that runs `CREATE EXTENSION IF NOT EXISTS ltree`. Apply it with Prisma Next's control plane:

```bash
pnpm prisma-next db init
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

Ltree operators attach to **ltree-typed fields** in the ORM lane (and to column references in the SQL query builder). They do not appear as nested Prisma Client `where` objects.

```typescript
import { db } from "./prisma/db";

const rows = await db.orm.Category.where((c) => c.path.isDescendantOf("electronics"))
  .select("id", "path")
  .all();
```

See [Hierarchy Operators](/docs/operations/hierarchy) and [Pattern Matching](/docs/operations/pattern-matching) for the full operator set.

## Index path columns

Ancestor, descendant, and pattern queries need a **GiST** index. Prisma Next
registers `gist` on the postgres target, so you author it in the contract:

```prisma
@@index([path], type: "gist")
```

See [Index ltree columns](/docs/indexes) for TypeScript authoring, `ltree[]`,
and what Prisma still cannot express (`siglen`, operator classes).
