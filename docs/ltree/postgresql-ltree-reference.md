# PostgreSQL ltree — Reference

Source: PostgreSQL 18 docs (https://www.postgresql.org/docs/current/ltree.html)

## Overview

The `ltree` module implements a data type for representing labels of data stored in a hierarchical tree-like structure. It is a "trusted" extension — installable by non-superusers with `CREATE` privilege.

## Data Types

| Type        | Description                                               |
| ----------- | --------------------------------------------------------- |
| `ltree`     | Stores a label path (e.g., `Top.Countries.Europe.Russia`) |
| `lquery`    | Regex-like pattern for matching `ltree` values            |
| `ltxtquery` | Full-text-search-like pattern for matching `ltree` values |

### ltree

A label path is a sequence of zero or more labels separated by dots. Labels are alphanumeric + underscores + hyphens (locale-dependent), max 1000 chars each. Max 65535 labels per path.

### lquery

- Simple word matches that label exactly: `foo`
- `*` matches zero or more labels
- Quantifiers: `*{n}`, `*{n,}`, `*{n,m}`, `*{,m}` — same for words
- Modifiers on non-star items: `@` (case-insensitive), `*` (prefix match), `%` (underscore-separated word match)
- `|` (OR) group: `foo|bar` matches either
- `!` (NOT) prefix: `!foo|bar` matches any label NOT matching the alternatives

### ltxtquery

Words with `@`, `*`, `%` modifiers, combined with `&` (AND), `|` (OR), `!` (NOT), and parentheses. Matches words regardless of position in the path.

## Operators

Operators marked with `*` are the MVP set.

### Hierarchy Operators \*

| Operator                   | Description                               |
| -------------------------- | ----------------------------------------- |
| `ltree @> ltree` → boolean | Is left an ancestor of right (or equal)?  |
| `ltree <@ ltree` → boolean | Is left a descendant of right (or equal)? |

### Pattern Matching \*

| Operator                      | Description                           |
| ----------------------------- | ------------------------------------- |
| `ltree ~ lquery` → boolean    | Does ltree match lquery?              |
| `ltree ? lquery[]` → boolean  | Does ltree match any lquery in array? |
| `ltree @ ltxtquery` → boolean | Does ltree match ltxtquery?           |

### Concatenation

| Operator                   | Description                             |
| -------------------------- | --------------------------------------- |
| `ltree \|\| ltree` → ltree | Concatenates ltree paths                |
| `ltree \|\| text` → ltree  | Converts text to ltree and concatenates |
| `text \|\| ltree` → ltree  | Converts text to ltree and concatenates |

### Array Operators

| Operator                        | Description                                      |
| ------------------------------- | ------------------------------------------------ |
| `ltree[] @> ltree` → boolean    | Does array contain an ancestor of ltree?         |
| `ltree[] <@ ltree` → boolean    | Does array contain a descendant of ltree?        |
| `ltree[] ~ lquery` → boolean    | Does array contain any path matching lquery?     |
| `ltree[] ? lquery[]` → boolean  | Does array contain any path matching any lquery? |
| `ltree[] @ ltxtquery` → boolean | Does array contain any path matching ltxtquery?  |
| `ltree[] ?@> ltree` → ltree     | Returns first array entry that is an ancestor    |
| `ltree[] ?<@ ltree` → ltree     | Returns first array entry that is a descendant   |
| `ltree[] ?~ lquery` → ltree     | Returns first array entry matching lquery        |
| `ltree[] ?@ ltxtquery` → ltree  | Returns first array entry matching ltxtquery     |

## Functions (MVP Set)

### Path Navigation

| Function                                      | Description                             | Example                                             |
| --------------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| `nlevel(ltree)` → integer                     | Number of labels in path                | `nlevel('Top.Child1.Child2')` → 3                   |
| `subltree(ltree, start int, end int)` → ltree | Subpath from start to end-1 (0-indexed) | `subltree('Top.Child1.Child2', 1, 2)` → `Child1`    |
| `subpath(ltree, offset int, len int)` → ltree | Subpath at offset with length           | `subpath('Top.Child1.Child2', 0, 2)` → `Top.Child1` |
| `subpath(ltree, offset int)` → ltree          | Subpath from offset to end              | `subpath('Top.Child1.Child2', 1)` → `Child1.Child2` |

### Search & Comparison

| Function                                        | Description                                              | Example                           |
| ----------------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| `index(a ltree, b ltree)` → integer             | Position of first occurrence of b in a (-1 if not found) | `index('0.1.2.3.5.4', '5.4')` → 5 |
| `index(a ltree, b ltree, offset int)` → integer | Like above, starting at offset                           | `index('0.1.2.3.5', '5', -2)` → 4 |

### Common Ancestor

| Function                               | Description                                     |
| -------------------------------------- | ----------------------------------------------- |
| `lca(ltree [, ltree [, ...]])` → ltree | Longest common ancestor of paths (up to 8 args) |
| `lca(ltree[])` → ltree                 | Longest common ancestor of paths in array       |

### Conversion

| Function                   | Description         |
| -------------------------- | ------------------- |
| `ltree2text(ltree)` → text | Casts ltree to text |
| `text2ltree(text)` → ltree | Casts text to ltree |

## Indexes

| Index Type                              | Supported Operators                                   |
| --------------------------------------- | ----------------------------------------------------- |
| B-tree over `ltree`                     | `<`, `<=`, `=`, `>=`, `>`                             |
| Hash over `ltree`                       | `=`                                                   |
| GiST over `ltree` (`gist_ltree_ops`)    | `<`, `<=`, `=`, `>=`, `>`, `@>`, `<@`, `@`, `~`, `?`  |
| GiST over `ltree[]` (`gist__ltree_ops`) | `ltree[] <@ ltree`, `ltree @> ltree[]`, `@`, `~`, `?` |

### GiST Index Examples

```sql
-- Default signature length (8 bytes)
CREATE INDEX path_gist_idx ON test USING GIST (path);

-- Custom signature length (100 bytes)
CREATE INDEX path_gist_idx ON test USING GIST (path gist_ltree_ops(siglen=100));

-- Array index (default siglen 28 bytes)
CREATE INDEX path_gist_idx ON test USING GIST (array_path);
```

## Extension Install

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
```

## Hypothetical prisma-next API Mapping

### Contract

```typescript
import { ltree } from "prisma-ltree/column-types";
import ltreePack from "prisma-ltree/pack";

path: field.column(ltree());
extensionPacks: {
  ltree: ltreePack;
}
```

### Hierarchy operators

| SQL                | API method                          |
| ------------------ | ----------------------------------- |
| `path @> rhs`      | `path.isAncestorOf(rhs)`            |
| `path <@ rhs`      | `path.isDescendantOf(rhs)`          |
| `path ~ lquery`    | `path.matchesLquery(pattern)`       |
| `path ? lquery[]`  | `path.matchesLqueryArray(patterns)` |
| `path @ ltxtquery` | `path.matchesLtxtquery(query)`      |

### Scalar functions

| SQL                   | API method                 |
| --------------------- | -------------------------- |
| `nlevel(path)`        | `path.nlevel()`            |
| `subpath(path, a, b)` | `path.subpath(start, end)` |
| `lca(a, b)`           | `ltree.lca(pathA, pathB)`  |

### Example query

```typescript
sql
  .from(tables.category)
  .where(tables.category.columns.path.isDescendantOf(param("prefix")))
  .select({ depth: tables.category.columns.path.nlevel() })
  .build({ params: { prefix: "Top.Science" } });
// → WHERE "path" <@ 'Top.Science'
```
