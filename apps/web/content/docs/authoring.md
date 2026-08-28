---
title: Author ltree columns
description: Declare ltree columns in the PSL lane or the TypeScript lane; both produce the same contract
---

Prisma 8 has two contract-authoring lanes, and `prisma-ltree` supports both:

- **PSL lane**: `contract.prisma`, the surface the official extensions document
- **TypeScript lane**: `contract.ts` via `defineContract`

Both emit the same compiled contract. Choose the surface that fits your project.

## Composing the extension

Whichever lane you author in, add `ltree` to `extensions` in `prisma.config.ts` so the `ltree` namespace resolves during emit:

```typescript title="prisma.config.ts"
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./contract.prisma", // or "./contract.ts"
    extensions: [ltree],
  }),
});
```

Omitting `ltree` from `extensions` while a `contract.prisma` references `ltree.Ltree()` fails emit with `PSL_EXTENSION_NAMESPACE_NOT_COMPOSED`.

## Declaring ltree columns

Two named-type constructors cover the Postgres types: `ltree.Ltree()` for a single `ltree` path (codec `pg/ltree@1`) and `ltree.LtreeArray()` for an `ltree[]` array (codec `pg/ltree-array@1`). Author them in either lane:

<!-- ::start:tabs -->

## PSL

```prisma title="contract.prisma"
// use prisma

types {
  // Single ltree path → codec `pg/ltree@1`, native type `ltree`.
  Path = ltree.Ltree()
  // ltree[] array → codec `pg/ltree-array@1`, native type `ltree[]`.
  Paths = ltree.LtreeArray()
}

/// A page in a hierarchy. `path` is its position in the tree;
/// `breadcrumbs` is the array of ancestor paths.
model Page {
  id          String @id @default(uuid())
  path        Path
  breadcrumbs Paths

  @@map("page")
}
```

The parentheses are **required**, even though these constructors take no arguments. `Path = ltree.Ltree` (no parens) fails with `PSL_INVALID_TYPES_MEMBER`.

## TypeScript

```typescript title="contract.ts"
import { defineContract } from "@prisma/orm-postgres/contract-builder";
import ltree from "prisma-ltree/pack";

export const contract = defineContract(
  {
    extensions: { ltree },
  },
  ({ field, model, type }) => {
    const types = {
      // Single ltree path → codec `pg/ltree@1`, native type `ltree`.
      Path: type.ltree.Ltree(),
      // ltree[] array → codec `pg/ltree-array@1`, native type `ltree[]`.
      Paths: type.ltree.LtreeArray(),
    } as const;

    const Page = model("Page", {
      fields: {
        id: field.id.uuidv4String(),
        path: field.namedType(types.Path),
        breadcrumbs: field.namedType(types.Paths),
      },
    });

    return {
      types,
      models: { Page: Page.sql({ table: "page" }) },
    };
  },
);

export default contract;
```

The `ltree` namespace on `type` is the same authoring surface the PSL lane exposes as `ltree.Ltree()` / `ltree.LtreeArray()`.

<!-- ::end:tabs -->

After editing either contract, re-emit:

```bash
pnpm prisma contract emit
```

## Runtime, migrations, and indexes

See [Get started](/docs/getting-started) for runtime wiring, the baseline migration, and your first queries.

Add a GiST index on path columns so ancestor, descendant, and pattern queries can use an index. See [Add a GiST index](/docs/indexes).
