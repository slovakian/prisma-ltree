# ADR-006: GiST index authoring and PSL/TS parity limits

**Status:** Accepted
**Date:** 2026-07-08
**Phase/Task:** GiST index support for `ltree` / `ltree[]` columns

## Context

PostgreSQL's `ltree` extension recommends GiST indexes for hierarchy and
pattern-match operators (`@>`, `<@`, `~`, `?`, `@`, …). Typical DDL:

```sql
-- scalar ltree (default siglen = 8)
CREATE INDEX page_path_gist_idx ON page USING gist (path);

-- ltree[] (default siglen = 28)
CREATE INDEX page_breadcrumbs_gist_idx ON page USING gist (breadcrumbs);

-- custom operator-class parameter (NOT covered by this ADR's shipped surface)
CREATE INDEX page_path_gist_idx ON page USING gist (path gist_ltree_ops(siglen=100));
```

Consumers author contracts in **two lanes** (PSL and TS) that must lower to
identical Contract IR. prisma-ltree already guarantees column-type parity via
ADR-004; GiST indexes are the next contract-level concern.

### What prisma-next supports today (verified against `.sync/prisma-next/`)

1. **Index types are extension-contributed.** Packs register entries via
   `defineIndexTypes()` on `packMeta.indexTypes` (see `@prisma-next/extension-paradedb`).
   Contract authoring rejects unregistered `type` literals at emit time.

2. **Postgres DDL for non-btree methods exists.** `createIndex` in
   `@prisma-next/target-postgres` emits `CREATE INDEX … USING <method> (cols)` and
   optional index-level `WITH (…)` reloptions.

3. **Operator classes are not modeled in the general index DSL.** Column expressions
   like `(path gist_ltree_ops(siglen=100))` are out of scope. ADR 116 sketches
   extension-specific ops with opclass parameters, but no general
   `constraints.index()` surface carries opclass today.

4. **`siglen` is an operator-class parameter, not a reloption.** It cannot be
   threaded through index-level `WITH (…)` or introspected via `pg_class.reloptions`.

## Decision

**Register a `gist` index type on the ltree pack; ship default GiST indexes with
PSL↔TS structural parity; document operator-class customization and PSL config
wiring gaps.**

| Aspect | Resolution |
| ------ | ---------- |
| Index type | `gist` registered via `ltreeIndexTypes` on `ltreePackMeta` |
| Capability key | `ltree/gist` under `capabilities.postgres` |
| PSL surface | `@@index([path], type: "gist", map: "…")` on `ltree` / `ltree[]` columns |
| TS surface | `constraints.index([cols.path], { type: "gist", options: {}, name: "…" })` |
| Options | Empty object only — default PostgreSQL siglen |
| DDL | Standard prisma-next `createIndex` → `USING gist (column)` |
| `siglen` / explicit opclass | **Not supported** — requires prisma-next operator-class modeling |
| Parity proof | `test/psl-lane/psl-parity.test.ts` (PSL emit vs TS `defineContract` serialization) |

### PSL lane wiring for `gist` indexes

Standard `defineConfig({ contract: "./contract.prisma", extensions: [ltree] })`
from `@prisma-next/postgres/config` does **not** pass `composedExtensionPackRefs`
into the PSL provider. Without the full pack ref, validation fails with
`unregistered index type "gist"` even though the control descriptor spreads
`indexTypes` from pack meta.

**Workaround (required today for PSL + gist):** pass the control descriptor as
`composedExtensionPackRefs` when building the PSL contract config (see
`test/psl-lane/prisma.config.ts`). The TS lane uses
`defineContract({ extensionPacks: { ltree: ltreePack } })` and does not hit this gap.

### Rejected alternatives

- **`ltree_gist` as a separate index type** — duplicates PostgreSQL's access method name.
- **Accept `siglen` in contract options without DDL support** — breaks contract as source-of-truth.
- **Raw-SQL-only indexes** — abandons PSL/TS parity.

## Consequences

- Consumers can declare GiST indexes on ltree columns in both lanes with identical
  Contract IR for the default-operator-class case.
- Custom `siglen` remains manual migration or a future framework feature.
- `docs/feature-support.md` moves default GiST from `out-of-scope` to `supported`.

## References

- `docs/ltree/postgresql-ltree-reference.md`
- `.sync/prisma-next/packages/3-extensions/paradedb/`
- ADR-004 — PSL lane parity model for ltree columns
- ADR 116 — Extension-aware migration ops (operator-class future)
