# ADR-007: Ship boolean `ltree[]` operators on the existing codecs

**Status:** Accepted
**Date:** 2026-10-08

## Context

PostgreSQL's `gist__ltree_ops` operator class indexes these operators on `ltree[]`:

| Operator | Meaning |
| --- | --- |
| `ltree[] <@ ltree` | Array contains a descendant of the path |
| `ltree @> ltree[]` | Commutator: path is an ancestor of an array entry |
| `ltree[] ~ lquery` / `lquery ~ ltree[]` | Array contains a path matching the pattern |
| `ltree[] @ ltxtquery` / `ltxtquery @ ltree[]` | Array contains a path matching the full-text pattern |
| `ltree[] ? lquery[]` / `lquery[] ? ltree[]` | Array contains a path matching any pattern |

The pack already creates that GiST index with `type: "gist"` (ADR-006). The query API did not expose the operators the index serves. First-match operators (`?@>`, `?<@`, `?~`, `?@`) are a different set. PostgreSQL does not list them in `gist__ltree_ops`.

The feature matrix had marked the boolean forms out of scope as "less useful". That decision predates the index, and it leaves the array GiST index with no client predicate.

## Decision

Ship the boolean operators whose **left operand is a codec this pack already has** (`pg/ltree@1` or `pg/ltree-array@1`).

| Method | SQL |
| --- | --- |
| `paths.containsAncestorOf(path)` | `ltree[] @> ltree` |
| `paths.containsDescendantOf(path)` | `ltree[] <@ ltree` |
| `paths.matchesAnyLquery(pattern)` | `ltree[] ~ lquery` |
| `paths.matchesAnyLqueryArray(patterns)` | `ltree[] ? lquery[]` |
| `paths.matchesAnyLtxtquery(query)` | `ltree[] @ ltxtquery` |
| `path.isAncestorOfAny(paths)` | `ltree @> ltree[]` |
| `path.isDescendantOfAny(paths)` | `ltree <@ ltree[]` |

Names are distinct from the scalar methods. Prisma keys operations by name only (ADR-005).

Do not add `lquery` or `ltxtquery` column codecs for the reversed pattern operators (`lquery ~ ltree[]`, and the same shape for `@` and `?`). A pattern stays a string parameter. The array-on-the-left form is the same predicate.

`ltree[] @> ltree` is in the operator table and is not in `gist__ltree_ops`. Ship it anyway. It is the same SPI, and it is the commutator pair of `isDescendantOfAny`.

## Consequences

- `feature-support.md` moves these seven operators from out of scope to supported.
- Return nullability stays `nullable: false`, matching the other boolean operators.
- Index-bypass operators (`^@>`, `^<@`, `^@`, `^~`, `^?`) stay unshipped. PostgreSQL documents them as test-only copies that do not use an index.
