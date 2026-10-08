---
title: Array boolean checks
description: Ask whether any path in an ltree array matches
---

These methods return a boolean. They are the predicates a GiST index on an `ltree[]` column can serve, plus `containsAncestorOf`.

Call the method on the column you filter.

## On an `ltree[]` column

| Method | SQL | GiST on the array column |
| --- | --- | --- |
| `paths.containsDescendantOf(path)` | `ltree[] <@ ltree` | yes |
| `paths.containsAncestorOf(path)` | `ltree[] @> ltree` | no |
| `paths.matchesAnyLquery(pattern)` | `ltree[] ~ lquery` | yes |
| `paths.matchesAnyLqueryArray(patterns)` | `ltree[] ? lquery[]` | yes |
| `paths.matchesAnyLtxtquery(query)` | `ltree[] @ ltxtquery` | yes |

```typescript
const rows = await db.orm.Page.where((p) => p.breadcrumbs.containsDescendantOf("Top.Science"))
  .select("id")
  .all();
```

## On an `ltree` column, with an array argument

| Method | SQL | Same predicate as |
| --- | --- | --- |
| `path.isAncestorOfAny(paths)` | `ltree @> ltree[]` | `paths.containsDescendantOf(path)` |
| `path.isDescendantOfAny(paths)` | `ltree <@ ltree[]` | `paths.containsAncestorOf(path)` |

```typescript
const rows = await db.orm.Page.where((p) =>
  p.path.isDescendantOfAny(["Top.Science", "Top.Hobbies"]),
)
  .select("id")
  .all();
```

A GiST index on the **scalar** `path` column does not serve `isDescendantOfAny`. That index serves `isDescendantOf` against one `ltree` value. Use `isDescendantOf` (or several of them combined with `or`) when the path column is the indexed side and the roots are separate values.
