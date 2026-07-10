# Pattern matching (lquery & ltxtquery)

Read when the user asks about **wildcards, path patterns, regex-like matching, or full-text search over labels**.

Pattern arguments are **strings** passed to methods — not separate column types.

## Which method?

| Method                              | PG type     | Style                                           |
| ----------------------------------- | ----------- | ----------------------------------------------- |
| `path.matchesLquery(pattern)`       | `lquery`    | Label-path patterns with `*`, `\|`, quantifiers |
| `path.matchesLqueryArray(patterns)` | `lquery[]`  | Match if **any** pattern matches                |
| `path.matchesLtxtquery(query)`      | `ltxtquery` | Word-based AND/OR/NOT over labels               |

## lquery basics

Each label in the path is matched left-to-right:

| Pattern           | Matches                                 |
| ----------------- | --------------------------------------- |
| `Top.Science`     | Exact path                              |
| `Top.*`           | Anything under `Top`                    |
| `*.Astronomy`     | Any path ending with `.Astronomy`       |
| `Top.*.Astronomy` | `Top`, any depth, `Astronomy`           |
| `*{1}.*{1}.Astronomy` | Exactly three levels, last is Astronomy |

Quantifiers on `*`: `*{n}`, `*{n,m}`, `*{,m}` — same idea as PostgreSQL docs.

Alternation: `foo|bar` matches either label at that position. Negation prefix `!` excludes alternatives.

Modifiers on words: `@` (case-insensitive), `*` (prefix), `%` (underscore-separated words).

## ltxtquery basics

Words combined with `&` (AND), `|` (OR), `!` (NOT), parentheses. Matches words **anywhere** in the path — good for "paths mentioning Astronomy" without fixing depth.

Example query string: `Astronomy & !Top.Art` — contains Astronomy label but not under that art branch (verify against your data).

## Examples

```typescript
// All paths one level under Top.Science
sql
  .from(tables.category)
  .where(tables.category.columns.path.matchesLquery(param("pat")))
  .build({ params: { pat: "Top.Science.*{1}" } });

// Paths ending in Painting OR under Top.Science branch
sql
  .from(tables.category)
  .where(tables.category.columns.path.matchesLqueryArray(param("pats")))
  .build({ params: { pats: ["*.Painting", "Top.Science.*"] } });

// Full-text style: label contains Astronomy
sql
  .from(tables.category)
  .where(tables.category.columns.path.matchesLtxtquery(param("q")))
  .build({ params: { q: "Astronomy" } });
```

## Pitfalls

1. **Confusing lquery with SQL LIKE.** `*` in lquery is label-oriented, not character-oriented.
2. **Forgetting to escape or validate user-supplied patterns.** Treat patterns as query input; malformed patterns surface as PostgreSQL errors.
3. **Using ltxtquery when lquery is clearer** (or vice versa). Fixed structure → lquery; keyword search across labels → ltxtquery.
4. **`matchesLqueryArray` expects `string[]`** in params, not a PostgreSQL array literal string.

## Authority

PostgreSQL 18 ltree docs: https://www.postgresql.org/docs/current/ltree.html — full lquery / ltxtquery grammar.

Repo reference copy: `docs/ltree/postgresql-ltree-reference.md` in the prisma-ltree repository.
