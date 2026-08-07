# prisma-ltree

A [Prisma Next](https://github.com/prisma/prisma) extension pack for PostgreSQL's
[`ltree`](https://www.postgresql.org/docs/current/ltree.html) hierarchical-tree data type.

Model category trees, org charts, taxonomies, and filesystem-like paths in Postgres and query
them with type-safe, prisma-native operators — ancestor/descendant checks, `lquery`/`ltxtquery`
pattern matching, path manipulation, and lowest-common-ancestor computation — without dropping to
raw SQL.

## Features

- **`ltree` and `ltree[]` columns** — `ltree()` / `ltreeArray()` column helpers
- **Hierarchy operators** — ancestor and descendant checks
- **Pattern matching** — `lquery`, `lquery[]`, and `ltxtquery`
- **Scalar functions** — depth, subpaths, label index, lowest common ancestor
- **Concatenation & conversion** — path building and `ltree` ↔ `text` conversion
- **Array first-match** — find the first matching path in an `ltree[]` column
- **Baseline migration** — installs the Postgres extension via
  `CREATE EXTENSION IF NOT EXISTS ltree` when the pack is composed

See the [feature support matrix](https://github.com/slovakian/prisma-ltree/blob/main/docs/feature-support.md)
for what is supported, planned, or out of scope.

## Installation

```bash
pnpm add prisma-ltree
```

Requires Node `>=24` and Prisma Next **`8.0.0-rc.1`** (exact `@prisma/orm-*` pins — see
[versioning & compatibility](https://github.com/slovakian/prisma-ltree/blob/main/docs/prisma-next/versioning-and-compatibility.md)).

Consumer apps typically depend on the Postgres facade at the same version:

```bash
pnpm add @prisma/orm-postgres@8.0.0-rc.1 prisma-ltree
```

### Agent skills (optional)

Agent skills for adoption and query patterns ship in the repo under
[`skills/`](https://github.com/slovakian/prisma-ltree/tree/main/skills):

```bash
pnpm dlx skills add slovakian/prisma-ltree --all
```

## Database setup

The extension ships an on-disk baseline migration that installs `ltree` when the pack is composed
into an application. `prisma-next db init` / `db update` apply it automatically. The equivalent
manual DDL is:

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
```

## Configuration

Add the pack to your `prisma-next.config.ts`:

```typescript
import { defineConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  contract: "./src/prisma/contract.ts",
  extensions: [ltree],
});
```

## Usage

### Contract definition

Author ltree columns in either lane — `contract.prisma` (PSL) or `contract.ts`
(TypeScript). Both emit a byte-identical compiled contract.

**PSL lane** — reference the `ltree` namespace constructors (parens required) and compose
`ltree` into `extensions` in `prisma-next.config.ts`:

```prisma
// contract.prisma — use prisma-next

types {
  Path  = ltree.Ltree()      // → pg/ltree@1 / ltree
  Paths = ltree.LtreeArray() // → pg/ltree-array@1 / ltree[]
}

model Page {
  id          String @id @default(uuid())
  path        Path
  breadcrumbs Paths

  @@map("page")
}
```

**TypeScript lane**:

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

### Runtime setup

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

### Query usage

```typescript
import { db } from "../prisma/db";

// Find every descendant of "Top.Science"
const rows = await db.orm.Category.where((c) => c.path.isDescendantOf("Top.Science"))
  .select("id", {
    depth: (c) => c.path.nlevel(),
  })
  .all();
```
## Operations

### Hierarchy (→ boolean)

| Method                     | SQL              |
| -------------------------- | ---------------- |
| `path.isAncestorOf(rhs)`   | `ltree @> ltree` |
| `path.isDescendantOf(rhs)` | `ltree <@ ltree` |

### Pattern matching (→ boolean)

| Method                              | SQL                 | Arg        |
| ----------------------------------- | ------------------- | ---------- |
| `path.matchesLquery(pattern)`       | `ltree ~ lquery`    | `string`   |
| `path.matchesLqueryArray(patterns)` | `ltree ? lquery[]`  | `string[]` |
| `path.matchesLtxtquery(query)`      | `ltree @ ltxtquery` | `string`   |

### Scalar functions

| Method                       | SQL                           | Returns |
| ---------------------------- | ----------------------------- | ------- |
| `path.nlevel()`              | `nlevel(ltree)`               | `int`   |
| `path.subltree(start, end)`  | `subltree(ltree, start, end)` | `ltree` |
| `path.subpath(offset, len?)` | `subpath(ltree, offset, len)` | `ltree` |
| `path.indexOf(other, off?)`  | `index(ltree, ltree, off)`    | `int`   |
| `path.lca(other, ...rest)`   | `lca(ltree, ltree, ...)`      | `ltree` |

`lca` requires **≥2 paths** and returns the proper (strictly shorter) lowest common ancestor.

### Concatenation (→ ltree) & conversion

| Method                    | SQL                 | Returns |
| ------------------------- | ------------------- | ------- |
| `path.concat(rhs)`        | `ltree \|\| ltree`  | `ltree` |
| `path.concatText(label)`  | `ltree \|\| text`   | `ltree` |
| `path.prependText(label)` | `text \|\| ltree`   | `ltree` |
| `path.toText()`           | `ltree2text(ltree)` | `text`  |
| `text.toLtree()`          | `text2ltree(text)`  | `ltree` |

`prependText` keeps the ltree column as the receiver even though it is the right SQL operand.
`toLtree` is called on a text column.

### Array first-match (→ ltree, receiver `ltree[]`)

| Method                             | SQL                    |
| ---------------------------------- | ---------------------- |
| `paths.firstAncestorOf(rhs)`       | `ltree[] ?@> ltree`    |
| `paths.firstDescendantOf(rhs)`     | `ltree[] ?<@ ltree`    |
| `paths.firstMatchLquery(pattern)`  | `ltree[] ?~ lquery`    |
| `paths.firstMatchLtxtquery(query)` | `ltree[] ?@ ltxtquery` |
| `paths.lcaAll()`                   | `lca(ltree[])`         |

Use `ltreeArray()` for `ltree[]` columns that expose these methods.

`lcaAll` is the array form of `lca`. It is not named `lca` because prisma-next
keys operations by name only and rejects duplicates; scalar columns already
expose `path.lca(other, ...)` (see ADR-005). Note it returns SQL NULL for an
empty `ltree[]`, matching the first-match ops' `nullable: false` convention.

## Types

```typescript
import type { CodecTypes, Ltree, LtreeArray } from "prisma-ltree/codec-types";
import type { QueryOperationTypes } from "prisma-ltree/operation-types";

// CodecTypes['pg/ltree@1']['output']       = string
// CodecTypes['pg/ltree-array@1']['output'] = readonly string[]
```

## License

Apache-2.0
