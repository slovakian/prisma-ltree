# prisma-ltree

A [Prisma Next](https://github.com/prisma/prisma) extension pack for PostgreSQL's
[`ltree`](https://www.postgresql.org/docs/current/ltree.html) hierarchical-tree data type.

Model category trees, org charts, taxonomies, and filesystem-like paths in Postgres and query
them with type-safe, prisma-native operators — ancestor/descendant checks, `lquery`/`ltxtquery`
pattern matching, path manipulation, and lowest-common-ancestor computation — without dropping to
raw SQL.

## Overview

This extension pack provides:

- **`pg/ltree@1` codec** — `string ↔ string` with label-syntax + length validation (traits
  `['equality', 'order']`).
- **`pg/ltree-array@1` codec** — `string[] ↔ string[]` with per-element validation, for the
  `ltree[]` first-match operators (see [ADR-003](../../docs/decisions/ADR-003-array-receiver.md)).
- **`ltree()` / `ltreeArray()` column helpers** — non-parameterized columns with `nativeType`
  `'ltree'` / `'ltree[]'`.
- **Query operators** — hierarchy, pattern-match, scalar functions, concatenation, conversion, and
  array first-match operators (full list under [Operations](#operations)).
- **Baseline migration** — installs the Postgres extension via
  `CREATE EXTENSION IF NOT EXISTS ltree` (invariantId `ltree:install-ltree-v1`).
- **Multi-plane entrypoints** — `/control`, `/runtime`, `/column-types`, `/codec-types`,
  `/operation-types`, `/pack`.

The single source of truth for what is supported, planned, or out-of-scope is
[`docs/feature-support.md`](../../docs/feature-support.md).

## Installation

```bash
pnpm add prisma-ltree
```

Requires Node `>=24` and `@prisma-next/*@0.14.0`.

## Database Setup

The extension ships an on-disk baseline migration that installs `ltree` when the pack is composed
into an application. `prisma-next db init` / `db update` apply it automatically. The equivalent
manual DDL is:

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
```

## Configuration

Add the pack to your `prisma-next.config.ts`:

```typescript
import { defineConfig } from "@prisma-next/cli/config-types";
import postgresAdapter from "@prisma-next/adapter-postgres/control";
import sql from "@prisma-next/family-sql/control";
import postgres from "@prisma-next/target-postgres/control";
import ltree from "prisma-ltree/control";

export default defineConfig({
  family: sql,
  target: postgres,
  adapter: postgresAdapter,
  extensionPacks: [ltree],
});
```

## Usage

### Contract Definition

```typescript
import { int4Column, textColumn } from "@prisma-next/adapter-postgres/column-types";
import sqlFamily from "@prisma-next/family-sql/pack";
import { defineContract, field, model } from "@prisma-next/sql-contract-ts/contract-builder";
import { ltree } from "prisma-ltree/column-types";
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
      },
    }).sql({ table: "category" }),
  },
});
```

### Runtime Setup

```typescript
import { instantiateExecutionStack } from "@prisma-next/framework-components/execution";
import { createExecutionContext, createSqlExecutionStack } from "@prisma-next/sql-runtime";
import postgresAdapter from "@prisma-next/adapter-postgres/runtime";
import postgresTarget from "@prisma-next/target-postgres/runtime";
import ltree from "prisma-ltree/runtime";

const stack = createSqlExecutionStack({
  target: postgresTarget,
  adapter: postgresAdapter,
  extensionPacks: [ltree],
});
const context = createExecutionContext({ contract, stack });
const stackInstance = instantiateExecutionStack(stack);
```

### Query Usage

```typescript
import { sql, tables } from "../prisma/query";
import { param } from "@prisma-next/sql-query/param";

// Find every descendant of "Top.Science"
const plan = sql
  .from(tables.category)
  .select({
    id: tables.category.columns.id,
    depth: tables.category.columns.path.nlevel(),
  })
  .where(tables.category.columns.path.isDescendantOf(param("prefix")))
  .build({ params: { prefix: "Top.Science" } });
```

## Operations

All boolean operators return `pg/bool@1`. See
[`docs/feature-support.md`](../../docs/feature-support.md) for the authoritative matrix.

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

| Method                       | SQL                           | Returns      |
| ---------------------------- | ----------------------------- | ------------ |
| `path.nlevel()`              | `nlevel(ltree)`               | `pg/int4@1`  |
| `path.subltree(start, end)`  | `subltree(ltree, start, end)` | `pg/ltree@1` |
| `path.subpath(offset, len?)` | `subpath(ltree, offset, len)` | `pg/ltree@1` |
| `path.indexOf(other, off?)`  | `index(ltree, ltree, off)`    | `pg/int4@1`  |
| `path.lca(other, ...rest)`   | `lca(ltree, ltree, ...)`      | `pg/ltree@1` |

`lca` is a variadic method requiring **≥2 paths** and returns the proper (strictly shorter) lowest
common ancestor (see [ADR-001](../../docs/decisions/ADR-001-lca-api-shape.md)).

### Concatenation (→ ltree) & conversion

| Method                    | SQL                 | Returns      |
| ------------------------- | ------------------- | ------------ |
| `path.concat(rhs)`        | `ltree \|\| ltree`  | `pg/ltree@1` |
| `path.concatText(label)`  | `ltree \|\| text`   | `pg/ltree@1` |
| `path.prependText(label)` | `text \|\| ltree`   | `pg/ltree@1` |
| `path.toText()`           | `ltree2text(ltree)` | `pg/text@1`  |
| `text.toLtree()`          | `text2ltree(text)`  | `pg/ltree@1` |

`prependText` keeps the ltree column as the receiver even though it is the right operand, and
`toLtree` is rooted on a text column (see
[ADR-002](../../docs/decisions/ADR-002-free-function-lowering.md)).

### Array first-match (→ ltree, receiver `ltree[]`)

| Method                             | SQL                    |
| ---------------------------------- | ---------------------- |
| `paths.firstAncestorOf(rhs)`       | `ltree[] ?@> ltree`    |
| `paths.firstDescendantOf(rhs)`     | `ltree[] ?<@ ltree`    |
| `paths.firstMatchLquery(pattern)`  | `ltree[] ?~ lquery`    |
| `paths.firstMatchLtxtquery(query)` | `ltree[] ?@ ltxtquery` |

## Types

```typescript
import type { CodecTypes, Ltree, LtreeArray } from "prisma-ltree/codec-types";
import type { QueryOperationTypes } from "prisma-ltree/operation-types";

// CodecTypes['pg/ltree@1']['output']       = string
// CodecTypes['pg/ltree-array@1']['output'] = readonly string[]
```

## Development

This package is built with [Vite+](https://viteplus.dev/):

```bash
vp install        # install dependencies
vp check          # format, lint, typecheck
vp test           # run unit + integration + type-level tests
vp test --coverage # enforce the 95% coverage threshold
vp run build      # build dist/
```

Integration tests run against [PGlite](https://pglite.dev/) with the `ltree` contrib extension —
every operator is lowered through a composed Postgres runtime adapter and executed for real.

## License

Apache-2.0
