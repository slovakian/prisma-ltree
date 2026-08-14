---
title: Index ltree columns
description: Use Prisma Next GiST indexes so ancestor, descendant, and pattern queries stay fast
---

Hierarchy and pattern operators on `ltree` (`@>`, `<@`, `~`, `@`, `?`) need a
**GiST** index. A B-tree (the Prisma default) only helps comparisons (`<`, `=`,
`>`). `prisma-ltree` does not register a custom index type: Prisma Next
`8.0.0-rc.1` already registers `gist` on the postgres target, so you author the
index in the contract like any other Postgres access method.

## Why GiST

PostgreSQL's `ltree` module ships two GiST operator classes:

- `gist_ltree_ops` for `ltree` columns (default when the column type is `ltree`)
- `gist__ltree_ops` for `ltree[]` columns (default when the column type is `ltree[]`)

`CREATE INDEX … USING gist (path)` uses that default. You do not name the
operator class unless you are tuning `siglen` (see [Limitations](#limitations)).

Without GiST, `path.isDescendantOf("Top.Science")` and
`path.matchesLquery("Top.*")` still run, but Postgres seq-scans the table.

## Author a GiST index

Compose `ltree` as usual, then add `type: "gist"` on the path column.

<!-- ::start:tabs -->

## PSL

```prisma title="contract.prisma"
model Page {
  id   String @id @default(uuid())
  path Path

  @@index([path], type: "gist")
  @@map("page")
}
```

`Path` is `ltree.Ltree()` from [Authoring Contracts](/docs/authoring).

## TypeScript

```typescript title="contract.ts"
Page.sql(({ cols, constraints }) => ({
  table: "page",
  indexes: [
    constraints.index([cols.path], {
      type: "gist",
      options: {},
    }),
  ],
}));
```

When `type` is set, the TypeScript builder also requires `options`. Use `{}`
unless you are passing GiST **storage** parameters (`fillfactor`, `buffering`).

<!-- ::end:tabs -->

Re-emit and plan a migration (`prisma-next contract emit`, then `db update` or
`migration plan`). Prisma renders:

```sql
CREATE INDEX … ON "page" USING "gist" ("path")
```

The same `type: "gist"` works on an `ltree[]` column (`ltree.LtreeArray()` /
`ltreeArray()`).

## Other access methods

| `type` | Use when |
| ------ | -------- |
| omit / `"btree"` | Equality and order (`=`, `<`, `>`). `@unique` already creates a B-tree |
| `"hash"` | Equality only |
| `"gist"` | Ancestor, descendant, `lquery`, `ltxtquery` |

You can have both a unique B-tree and a GiST index on the same column.

## Limitations

Prisma's index `options` become `WITH (…)` **storage** parameters, not
operator-class arguments. That means:

- **No `gist_ltree_ops(siglen=N)`.** Signature length stays at Postgres defaults
  (8 bytes for `ltree`, 28 bytes for `ltree[]`).
- **No first-class operator class field.** Prisma does not model per-column
  opclasses. The default class for `ltree` / `ltree[]` is what you want for
  almost every query this pack exposes.
- **PSL `options` values are strings.** `options: { fillfactor: "70" }` in PSL;
  numbers and booleans belong on the TypeScript surface.

`expression:` and `where:` still work (functional and partial indexes). Putting
an opclass in `expression:` is opaque SQL: Prisma byte-compares it to Postgres's
reprint, so drift is likely. Prefer the default GiST column index.

`prisma-ltree` does not add `indexTypes` of its own. A second `gist`
registration would fail emit with a duplicate index-type error.
