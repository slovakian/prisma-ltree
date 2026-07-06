# Hierarchy and path operations

Read when the user asks about **ancestors, descendants, depth, slicing paths, or lowest common ancestor**.

## Direction (most common mistake)

PostgreSQL operators:

| SQL      | Meaning                               |
| -------- | ------------------------------------- |
| `A @> B` | A is an **ancestor** of B (or equal)  |
| `A <@ B` | A is a **descendant** of B (or equal) |

Prisma-ltree maps **the row's column as left operand**:

```typescript
// Rows whose path is UNDER Top.Science (including Top.Science)
path.isDescendantOf("Top.Science");

// Rows whose path is ABOVE Top.Science.Astronomy (including itself)
path.isAncestorOf("Top.Science.Astronomy");
```

Mnemonic: **`isDescendantOf(prefix)`** → "my path is a descendant of this prefix" → subtree under prefix.

Both comparisons are **inclusive** of the argument path.

## Path string format

- Labels separated by `.` — `Top.Science.Astronomy`
- Labels: `[A-Za-z0-9_-]+`, non-empty, max 1000 chars each
- Max 65535 labels per path
- Validated at codec encode — fix upstream before insert

## Scalar functions

| Method                         | Returns | Use                                               |
| ------------------------------ | ------- | ------------------------------------------------- |
| `path.nlevel()`                | `int4`  | Depth (label count). `Top.Science` → 2            |
| `path.subltree(start, end)`    | `ltree` | Extract subpath by label indices (PG `subltree`)  |
| `path.subpath(offset, len?)`   | `ltree` | Extract by offset; one-arg form drops to end      |
| `path.indexOf(other, offset?)` | `int4`  | Position of `other` within `path`; `-1` if absent |

Project scalars in `.select({ depth: path.nlevel(), ... })`.

## Lowest common ancestor (`lca`)

Variadic method on the **first** path:

```typescript
pathA.lca(pathB); // lca(pathA, pathB)
pathA.lca(pathB, pathC); // up to 8 paths in PostgreSQL
```

- **Requires at least one `other` argument** — `path.lca()` alone is invalid.
- Returns the longest shared prefix that is a **proper ancestor** of all inputs (strictly shorter than each unless paths share a prefix).

Example: `lca('1.2.3', '1.2.4', '1.2.5.6')` → `'1.2'`.

**Array LCA:** `paths.lcaAll()` lowers to `lca(ltree[])`. Scalar paths use
`path.lca(other, ...rest)` (≥2 paths).

## Concatenation (building paths)

| Method                    | SQL                | Example intent                                      |
| ------------------------- | ------------------ | --------------------------------------------------- |
| `path.concat(otherPath)`  | `ltree \|\| ltree` | Join two paths                                      |
| `path.concatText(label)`  | `ltree \|\| text`  | Append one label: `Top` + `Science` → `Top.Science` |
| `path.prependText(label)` | `text \|\| ltree`  | Prefix label; call on **ltree column**              |
| `path.toText()`           | `ltree2text`       | String for display                                  |

Typical insert pattern: read parent path, compute child with `concatText("NewLabel")` in a select or app logic, insert new row.

## Conversion

| Method              | On column type | SQL          |
| ------------------- | -------------- | ------------ |
| `path.toText()`     | `ltree`        | `ltree2text` |
| `textCol.toLtree()` | `text`         | `text2ltree` |

Use `toLtree()` when ingesting untrusted text — invalid labels still fail at PostgreSQL/codec boundaries.

## Example — subtree with depth

```typescript
sql
  .from(tables.category)
  .select({
    id: tables.category.columns.id,
    path: tables.category.columns.path,
    depth: tables.category.columns.path.nlevel(),
  })
  .where(tables.category.columns.path.isDescendantOf(param("root")))
  .build({ params: { root: "Top.Science" } });
```

## Example — direct children only

PostgreSQL has no single "immediate child" operator. Common approaches:

1. **`lquery` one-level pattern** — `matchesLquery("Top.Science.*{1}")` (see pattern-matching reference).
2. **Depth filter** — descendants where `nlevel() = parentNlevel + 1` (requires knowing parent depth or joining).

Pick based on whether the user already uses pattern matching elsewhere.
