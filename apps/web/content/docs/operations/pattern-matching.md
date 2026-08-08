---
title: Pattern Matching Operators
description: Query paths using lquery and ltxtquery patterns
---

Pattern matching operators filter `ltree` paths using PostgreSQL `lquery` and `ltxtquery` syntax. Pattern arguments are **strings** (or `string[]` for array matching). They are not separate column types.

```typescript
import { db } from "../prisma/db";
```

## matchesLquery()

Match a path against a single `lquery` pattern.

```typescript
const rows = await db.orm.Category.where((c) => c.path.matchesLquery("*.computers.*"))
  .select("id", "path")
  .all();
```

Common `lquery` syntax:

- `*`: matches zero or more labels (default quantifier `{,}`)
- `*{1}`: exactly one label; `*{n}` / `*{n,m}` / `*{n,}` / `*{,m}`: other quantifiers on wildcard labels
- `{a,b,c}`: matches any one of the labels at that position
- `|`: alternation within a label

**SQL equivalent:** `path ~ $1::lquery`

### Examples

**Paths exactly two labels deep:**

```typescript
await db.orm.Category.where((c) => c.path.matchesLquery("*{1}.*{1}"))
  .select("id", "path")
  .all();
```

**Paths under `electronics` at any depth:**

```typescript
await db.orm.Category.where((c) => c.path.matchesLquery("electronics.*"))
  .select("id", "path")
  .all();
```

**Direct children of `electronics` only:**

```typescript
await db.orm.Category.where((c) => c.path.matchesLquery("electronics.*{1}"))
  .select("id", "path")
  .all();
```

## matchesLqueryArray()

Match if the path satisfies **any** pattern in a `string[]`.

```typescript
const rows = await db.orm.Category.where((c) =>
  c.path.matchesLqueryArray(["electronics.*", "software.*"]),
)
  .select("id", "path")
  .all();
```

**SQL equivalent:** `path ? $1::lquery[]`

## matchesLtxtquery()

Match using `ltxtquery` full-text-style patterns over path labels (words combined with `&`, `|`, `!`).

```typescript
const rows = await db.orm.Category.where((c) => c.path.matchesLtxtquery("computer | phone"))
  .select("id", "path")
  .all();
```

**SQL equivalent:** `path @ $1::ltxtquery`

## Pattern syntax reference

| Syntax            | Meaning             | Example                                           |
| ----------------- | ------------------- | ------------------------------------------------- |
| `*`               | Zero or more labels | `a.*.c` matches `a.c`, `a.b.c`, …                 |
| `*{1}` / `*{n,m}` | Bounded wildcards   | `Top.Science.*{1}`: one label under `Top.Science` |
| `{a,b}`           | Label alternatives  | `{a,b}.c` matches `a.c` or `b.c`                  |
| `\|` (ltxtquery)  | Boolean OR          | `computer \| phone`                               |
| `&` (ltxtquery)   | Boolean AND         | `computer & laptop`                               |

Refer to [PostgreSQL ltree documentation](https://www.postgresql.org/docs/current/ltree.html) for full pattern syntax.
