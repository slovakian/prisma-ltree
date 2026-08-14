# ADR-006: Do not register GiST on the ltree pack

**Status:** Accepted
**Date:** 2026-08-14
**Phase/Task:** Prisma 8.0.0-rc.1 index-type registry (postgres target)

## Context

PostgreSQL `ltree` hierarchy and pattern operators (`@>`, `<@`, `~`, `@`, `?`)
need a **GiST** index to avoid sequential scans. B-tree covers only `<` / `<=` /
`=` / `>=` / `>`; hash covers only `=`. The contrib module ships default operator
classes (`gist_ltree_ops` for `ltree`, `gist__ltree_ops` for `ltree[]`), so:

```sql
CREATE INDEX page_path_gist_idx ON page USING gist (path);
```

is the usual index. Optional `gist_ltree_ops(siglen=N)` tunes signature length.

Earlier prisma-ltree tracked GiST as **out of scope**: Prisma Next's index-type
registry (ADR 210) existed, but the postgres **target** did not register `gist`,
and extension-registered types did not reach the PSL `defineConfig` path.

In **`8.0.0-rc.1`**, `@prisma/orm-target-postgres` registers:

`btree`, `hash`, `gin`, `gist`, `spgist`, `brin`

on the target pack's `indexTypes`. Contract lowering always includes
`definition.target` in the index-type registry, so both lanes accept
`type: "gist"` without an extension contribution.

Registering `gist` again on `prisma-ltree` would throw at lowering:
`Index type "gist" is already registered`.

## Decision

**Do not add `indexTypes` to `ltreePackMeta`.** Consumers author GiST indexes
through Prisma Next's postgres target:

- PSL: `@@index([path], type: "gist")`
- TypeScript: `constraints.index([cols.path], { type: "gist", options: {} })`

Document how that maps to ltree, and the remaining Prisma gaps.

## Authoring-lane reality

| Lane | Standard config | `type: "gist"` on `ltree` / `ltree[]` |
| ---- | --------------- | ------------------------------------- |
| PSL  | `defineConfig({ extensions: [ltree] })` | Supported (target registry) |
| TS   | `defineContract({ extensions: { ltree } })` | Supported (target registry) |

## What Prisma 8 still does not express

ADR 210's non-goals still apply:

| Want | Prisma 8.0.0-rc.1 |
| ---- | ----------------- |
| `USING gist` | `type: "gist"` |
| Default opclass (`gist_ltree_ops` / `gist__ltree_ops`) | Implicit when the column type is `ltree` / `ltree[]` |
| `WITH (fillfactor = …, buffering = …)` | `options` (storage parameters). PSL option values are strings |
| `gist_ltree_ops(siglen=N)` | No per-column operator class. `options` is `WITH`, not opclass args |
| Exclusion constraints | Not in the index DSL |

An `expression:` index can put opaque SQL between `CREATE INDEX` parens. That can
spell an opclass, but Prisma compares authored text to Postgres's reprint, so it
is a drift-prone escape hatch, not a supported opclass API.

## Consequences

- prisma-ltree stays a type/operator pack. Index access methods stay on the
  postgres target.
- If a future Prisma release **removes** `gist` from the target registry, this
  ADR is the revisit point (then register `gist` on the pack, or wait for core).
- Tests: `test/pack-authoring.test.ts` asserts the pack has no `indexTypes`;
  `test/psl-lane/gist-index.test.ts` asserts both lanes emit `type: "gist"`.
