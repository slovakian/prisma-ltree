# ADR-007: Ship boolean `ltree[]` operators on the existing array codec

**Status:** Accepted
**Date:** 2026-11-12

## Context

PostgreSQL exposes five boolean operators whose left operand is `ltree[]`:

| Operator              | Meaning                                              |
| --------------------- | ---------------------------------------------------- |
| `ltree[] @> ltree`    | Array contains an ancestor of the path               |
| `ltree[] <@ ltree`    | Array contains a descendant of the path              |
| `ltree[] ~ lquery`    | Array contains a path matching the pattern           |
| `ltree[] ? lquery[]`  | Array contains a path matching any pattern           |
| `ltree[] @ ltxtquery` | Array contains a path matching the full-text pattern |

`gist__ltree_ops` indexes `<@`, `~`, `@`, and `?` on `ltree[]`. It does not index `@>`. First-match operators (`?@>`, `?<@`, `?~`, `?@`) are a different set and return `ltree`, not `boolean`.

The feature matrix marked these boolean forms out of scope as "less useful". That decision predated the array receiver (ADR-003) and the GiST story (ADR-006). Leaving them out means the array GiST index has no matching client predicates for the existence checks.

Operation names must be unique across the pack: prisma-next keys the registry by name only (ADR-005). Scalar `isAncestorOf` / `matchesLquery` / … already occupy the natural spellings.

## Decision

Ship the five boolean operators on `pg/ltree-array@1`:

| Method                                  | SQL                   |
| --------------------------------------- | --------------------- |
| `paths.containsAncestorOf(path)`        | `ltree[] @> ltree`    |
| `paths.containsDescendantOf(path)`      | `ltree[] <@ ltree`    |
| `paths.matchesAnyLquery(pattern)`       | `ltree[] ~ lquery`    |
| `paths.matchesAnyLqueryArray(patterns)` | `ltree[] ? lquery[]`  |
| `paths.matchesAnyLtxtquery(query)`      | `ltree[] @ ltxtquery` |

Naming:

- Hierarchy uses `contains*` so it reads as “array contains an ancestor/descendant of …” and stays distinct from scalar `isAncestorOf` / `isDescendantOf` and first-match `firstAncestorOf` / `firstDescendantOf`.
- Pattern checks use `matchesAny*` so they pair with scalar `matches*` and first-match `firstMatch*`.

Do not add `lquery` / `ltxtquery` column codecs for reversed pattern operators (`lquery ~ ltree[]`, etc.). Patterns stay string (or `string[]`) parameters cast in-template, same as Tier 1.

Scalar commutators (`ltree @> ltree[]`, `ltree <@ ltree[]`) are out of this decision’s scope; they can ship later under distinct names if needed.

Index-bypass operators (`^@>`, `^<@`, `^@`, `^~`, `^?`) stay unshipped. PostgreSQL documents them as test-only copies that do not use an index.

## Consequences

- `feature-support.md` moves the five operators from out of scope to supported.
- Return nullability stays `nullable: false`, matching the other boolean operators.
- A GiST index on `ltree[]` can serve `containsDescendantOf` and the three `matchesAny*` methods; it does not serve `containsAncestorOf`.
