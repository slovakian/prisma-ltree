# GiST indexes: PSL↔TS parity blocker (technical analysis)

**Status:** Open blocker — do not ship GiST index support until resolved  
**Date:** 2026-07-08  
**Related:** [ADR-004](ADR-004-psl-lane-support.md) (column parity), [ADR-006](ADR-006-gist-index-parity.md) (initial GiST spike), [PostgreSQL ltree reference](../ltree/postgresql-ltree-reference.md)

This document explains why GiST index authoring for prisma-ltree is **blocked on
shipping**, what works today on each contract lane, where the framework gap lives, and
what `siglen` is (a separate, second-order limitation).

---

## Executive summary

| Question | Answer |
| -------- | ------ |
| Does prisma-next support `USING gist` in migrations? | **Yes** — postgres `createIndex` emits `CREATE INDEX … USING gist (cols)`. |
| Can an extension register a custom index `type`? | **Yes** — via `defineIndexTypes()` on pack metadata (paradedb `bm25` is the reference). |
| Does GiST work for **TS** contract authors today? | **Yes** — if the pack is in `defineContract({ extensionPacks: { ltree } })` and indexes use `type: "gist"`. |
| Does GiST work for **PSL** authors with standard `defineConfig`? | **No** — `prisma-next contract emit` fails with `unregistered index type "gist"`. |
| Is the PSL failure an ltree-pack bug? | **No** — postgres `defineConfig` never passes full pack refs into the PSL provider. |
| Do we have real PSL↔TS parity? | **No** — not on the consumer path PSL users actually take. |
| What is `siglen`? | A **GiST operator-class tuning parameter** for ltree paths (see below). Unrelated to the PSL blocker, but also **not expressible** in prisma-next's index DSL today. |

**Shipping policy:** prisma-ltree treats PSL↔TS parity as mandatory (ADR-004). Until a
PSL author can use the same `defineConfig` shape as every other ltree feature **and**
emit byte-compatible Contract IR, GiST indexes stay **out of scope** in releases.

---

## Background: why GiST indexes matter for ltree

PostgreSQL's `ltree` type stores hierarchical dot-separated paths (`Top.Science.Astronomy`).
The extension's hierarchy and pattern operators (`@>`, `<@`, `~`, `?`, `@`) are how ORM
queries express tree logic.

Without a GiST index, those operators typically devolve to sequential scans. PostgreSQL
documents GiST as the index access method that accelerates ltree hierarchy and
full-text-style pattern predicates. B-tree indexes only help ordering equality on
`ltree` itself, not ancestor/descendant or `lquery` matching.

So GiST is not a cosmetic DDL feature — it is the standard way to make ltree queries
fast at scale.

---

## What prisma-next's index model actually provides

Prisma-next separates three layers:

1. **Contract IR** — serialized `storage.namespaces.*.entries.table.*.indexes[]` nodes
   carrying `columns`, optional `name`, optional `type`, optional `options`.
2. **Index-type registry (authoring-time)** — extension packs contribute named types
   (`gist`, `bm25`, …) with arktype validators for `options`. Unknown `type` literals
   are rejected at emit.
3. **DDL lowering (migration-time)** — postgres `createIndex` turns IR into SQL:

```sql
CREATE INDEX "doc_body_idx" ON "public"."doc" USING "gin" ("body") WITH ("fastupdate" = false);
```

For gist, the emitted shape is:

```sql
CREATE INDEX "page_path_gist_idx" ON "public"."page" USING "gist" ("path");
```

**Important:** Layer 3 exists and works for `gist`. Layer 2 is where extensions must
register the type. Layer 1 is shared by PSL and TS — parity means both lanes must
produce the same index nodes after validation.

### Reference: paradedb `bm25`

`@prisma-next/extension-paradedb` registers `bm25` via:

```typescript
export const paradedbIndexTypes = defineIndexTypes().add('bm25', {
  options: type({ '+': 'reject', key_field: 'string' }),
});
```

attached to `paradedbPackMeta.indexTypes`. Consumers author:

```prisma
@@index([body], type: "bm25", options: { key_field: "id" })
```

The ltree GiST spike mirrors this: register `gist` on `ltreePackMeta.indexTypes`.

---

## The PSL↔TS parity contract (why we care)

ADR-004 established a project invariant:

> Both lanes lower to one Contract IR. PSL-emitted and TS-emitted `contract.json` must
> be byte-identical (including `profileHash` / `storageHash`).

That invariant exists because prisma-next markets **two first-class authoring surfaces**:

| Lane | Typical consumer | Entry |
| ---- | -------------- | ----- |
| PSL | `contract.prisma` + `defineConfig` | Documented canonical surface for official extensions |
| TS | `contract.ts` + `defineContract` | Programmatic / computed contracts |

For ltree **columns**, parity is proven: `ltree.Ltree()` in PSL and
`type.ltree.Ltree()` in TS emit identical codec registrations. GiST indexes are the
first feature where **the lanes diverge on the normal consumer path** — not in IR
theory, but in **whether emit succeeds at all**.

A feature that works only in TS is not “parity with a workaround”; it is a **lane skew**
that breaks the product promise for PSL-first users and invalidates cross-lane migration
workflows (teams mixing PSL and TS, or docs that show PSL).

---

## Technical root cause: two different pack-resolution paths

### TS lane (works)

`defineContract` in `build-contract.ts` builds an index-type registry from:

```typescript
const packsToRegister = [
  definition.target,
  ...Object.values(definition.extensionPacks ?? {}),
];
```

When the consumer writes:

```typescript
defineContract({ extensionPacks: { ltree: ltreePack } }, ...)
```

`ltreePack` is the full `/pack` export including `indexTypes`. Registration runs,
`validateIndexTypes` passes, contract emits.

### PSL lane (fails on standard config)

Postgres `defineConfig` (`@prisma-next/postgres/config`) builds the PSL provider as:

```typescript
prismaContract(options.contract, {
  output,
  target: postgresPackRef,
  createNamespace: postgresCreateNamespace,
  enumInferenceCodecs: { text: PG_TEXT_CODEC_ID, int: PG_INT_CODEC_ID },
  // NOTE: no composedExtensionPackRefs
});
```

`extensions: [ltree]` (the **control** descriptor) is passed separately to
`coreDefineConfig` as `extensionPacks` for the **runtime/migration stack** — authoring
contributions, codec lookup, contract-space wiring — but **not** into
`prismaContract`'s `composedExtensionPackRefs` option.

During PSL interpretation, `buildComposedExtensionPackRefs` in `interpreter.ts` maps
each composed extension id to a pack ref:

```typescript
extensionPackRefById.get(extensionId) ?? {
  kind: 'extension',
  id: extensionId,
  familyId: target.familyId,
  targetId: target.targetId,
  version: '0.0.1',
  // NO indexTypes, NO authoring, NO capabilities — stub only
}
```

Because `composedExtensionPackRefs` was never supplied, **every** PSL-composed extension
gets a **stub pack** at contract-build time. Stubs satisfy extension id presence in
`extensionPacks` metadata but carry **no `indexTypes`**.

Later, `assertStorageSemantics` → `validateIndexTypes` runs with a registry that never
received `gist`. Result:

```
Namespace "public" table "page" index on columns [path] uses unregistered index type "gist"
```

### Why the control descriptor does not save PSL emit

`ltreeExtensionDescriptor` (from `/control`) **does** spread `...ltreePackMeta`, so it
**contains** `indexTypes` in memory. That metadata is used when the CLI composes the
**stack** (authoring namespaces for `ltree.Ltree()`, migration plane, etc.).

It is **not** automatically forwarded as the pack ref used during
`buildSqlContractFromDefinition` unless `composedExtensionPackRefs` is explicitly passed
to `prismaContract`. The PSL interpreter only uses full pack refs from that parameter;
everything else becomes a stub.

This is a **wiring gap in postgres `defineConfig`**, not missing data on the descriptor.

### What the test fixture workaround does (and why it is not shippable)

`packages/extension-ltree/test/psl-lane/prisma.config.ts` bypasses postgres
`defineConfig` and calls `coreDefineConfig` directly:

```typescript
contract: prismaContract("./contract.prisma", {
  target: postgresPackRef,
  createNamespace: postgresCreateNamespace,
  composedExtensionPackRefs: [ltree], // control descriptor carries indexTypes via pack meta spread
}),
```

With this, PSL emit succeeds and storage IR matches TS. **Consumers are not told to
do this**; it is not exported as a public API; it duplicates framework config internals.

ParadeDB's own integration tests pass `composedExtensionPackRefs: [paradedbPack]` the
same way (`psl-index-type-options.integration.test.ts`). The framework authors know
this parameter exists; postgres `defineConfig` simply does not set it.

---

## Secondary serialization differences (even after the wiring fix)

Once `composedExtensionPackRefs` is wired, minor IR serialization differences remain
between lanes (observed in spike work):

| Field | PSL | TS |
| ----- | --- | -- |
| Empty `options: {}` on indexes | Omitted | Retained |
| Empty `typeParams: {}` on codec types | Omitted | Retained |

These do not block emit but can break **byte-identical** `contract.json` comparison
unless normalized. ADR-004 parity tests for columns did not hit this because indexes were
absent. GiST introduces index nodes where lane serializers diverge on empty objects.

**Resolution options:**

1. Upstream normalization in prisma-next emit (preferred for true byte parity).
2. Documented canonical comparison that strips empty objects (weakens ADR-004 strictness).
3. Accept storage-subtree equality only for indexes (pragmatic but changes the parity bar).

Any shipping decision should restate which bar applies.

---

## What `siglen` is (and why it came up)

`siglen` is **not** part of the PSL parity blocker. It is a **PostgreSQL GiST tuning
knob** specific to the ltree operator classes.

### GiST recap

GiST (Generalized Search Tree) is Postgres's extensible index framework. For each
indexed type, an **operator class** (opclass) defines:

- which operators the index can accelerate (`@>`, `<@`, …),
- how keys are compressed into index tuples,
- optional **opclass parameters**.

For `ltree`, PostgreSQL ships:

| Opclass | Column type | Default `siglen` | Role |
| ------- | ----------- | ---------------- | ---- |
| `gist_ltree_ops` | `ltree` | 8 bytes | Hierarchy + pattern ops on scalar paths |
| `gist__ltree_ops` | `ltree[]` | 28 bytes | Ops involving array ↔ scalar paths |

### What `siglen` controls

Ltree GiST indexes store a **binary signature** (compressed fingerprint) of each path,
not the full path text. `siglen` is the **signature length in bytes**.

- **Smaller `siglen`** — smaller index, faster builds, more false positives (filtering
  is less precise; heap rechecks increase).
- **Larger `siglen`** — larger index, better selectivity for long paths.

PostgreSQL docs and `docs/ltree/postgresql-ltree-reference.md` show:

```sql
-- Default (implicit gist_ltree_ops, siglen=8 for ltree)
CREATE INDEX path_gist_idx ON test USING GIST (path);

-- Custom signature length
CREATE INDEX path_gist_idx ON test USING GIST (path gist_ltree_ops(siglen=100));
```

`siglen` is an **operator-class parameter** embedded in the index column expression —
not a table-level `WITH (...)` reloption like `fillfactor` or gin's `fastupdate`.

### Why prisma-next cannot express `siglen` today

Postgres migration `createIndex` renders:

```typescript
`CREATE INDEX ... USING ${type} (${columnList})${withClause}`
```

There is no slot for per-column opclass or opclass parameters. Index-level `options`
map to `WITH (...)` reloptions only. `siglen` cannot be threaded through `WITH` — Postgres
will not interpret it there for ltree GiST.

Prisma-next ADR 116 discusses future **extension-specific** migration ops
(`createVectorIndex`, `createSpatialIndex`) with explicit opclass fields. The general
`constraints.index()` / `@@index(..., type: "...")` surface has no opclass story yet.

### User impact of missing `siglen`

- **Default GiST** (`CREATE INDEX ... USING gist (path)`) **works** without mentioning
  `siglen` — Postgres applies opclass defaults. This covers the common case.
- **Tuned GiST** for very deep paths or strict memory/perf tradeoffs requires raw SQL
  migrations or waiting for framework opclass support.

Missing `siglen` is a **capability ceiling**, not the reason PSL emit fails. We
mentioned it in spike docs so nobody assumes `options: { siglen: 100 }` would work via
`WITH (siglen = 100)` — it would silently do the wrong thing if we allowed it without
proper lowering.

---

## Failure reproduction (standard consumer path)

**`prisma-next.config.ts`**

```typescript
import { defineConfig } from "@prisma-next/postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  contract: "./contract.prisma",
  extensions: [ltree],
});
```

**`contract.prisma`**

```prisma
types {
  Path = ltree.Ltree()
}

model Page {
  id   String @id @default(uuid())
  path Path

  @@index([path], type: "gist", map: "page_path_gist_idx")
  @@map("page")
}
```

**`pnpm exec prisma-next contract emit`**

```
unregistered index type "gist"
```

Column types (`ltree.Ltree()`) still resolve — only the index `type` fails validation.

---

## Why this is a problem (beyond “tests are red”)

1. **Broken product promise** — PSL is documented as a first-class lane. Shipping GiST for
   TS-only means half the audience cannot declare indexes in the schema format we steer
   them toward.

2. **Docs and examples fracture** — Any PSL example with `@@index(..., type: "gist")`
   fails copy-paste. TS examples work. Support burden and confusion follow.

3. **Parity regression vs ADR-004** — Columns proved both lanes emit identical IR via
   standard config. Indexes would be the first shipped feature that requires a hidden
   config flag — a precedent we do not want.

4. **False confidence from spike code** — Implementation on branch `cursor/gist-indexes-b338`
   registers `gist` correctly on the pack. Tests pass **only** because the PSL fixture
   uses non-standard `coreDefineConfig` wiring. That is not consumer parity.

5. **Downstream verify/migrate skew** — Teams that emit from PSL never reach migration
   planning with gist indexes in the contract. Teams on TS do. Same repo, divergent
   `contract.json` shapes — the opposite of prisma-next's single-IR goal.

---

## Resolution paths (ordered)

### A. Upstream fix (preferred)

Extend postgres `defineConfig` to pass extension control descriptors (or `/pack` refs)
into `prismaContract({ composedExtensionPackRefs: extensions })`, mirroring what the
stack already knows from `extensions: [...]`.

**Acceptance:** Standard `defineConfig` + PSL `@@index(..., type: "gist")` emits
successfully; `test/psl-lane/psl-parity.test.ts` uses stock `defineConfig` and passes
byte-identical storage IR (with agreed normalization rules for empty objects).

### B. prisma-ltree consumer helper (interim)

Export something like `ltreePrismaContract(schemaPath)` that wraps `prismaContract` with
`composedExtensionPackRefs: [ltreePack]`, and document replacing the `contract:` field in
config.

**Gap:** Still not stock `defineConfig`; parity is “achieved via helper” not “achieved
by default”. Better than nothing, but weaker than ADR-004 bar unless upstream adopts the
same pattern.

### C. Register `gist` on postgres target (upstream)

Register builtin access methods (`gin`, `gist`, `brin`, …) on the postgres target pack
instead of ltree-only.

**Gap:** Does not fix stub pack refs for **extension-specific** types like `bm25`;
solves gist globally but is a policy change in prisma-next core.

### D. Ship TS-only (rejected)

Violates project parity requirement.

---

## Current disposition

| Artifact | Status |
| -------- | ------ |
| GiST pack registration (`indexTypes`) | Implemented on feature branch only — **not released** |
| `docs/feature-support.md` GiST rows | Should remain **out-of-scope** / blocked until parity |
| ADR-006 | Superseded by this doc for shipping decisions; see status update there |
| PR `#19` | Do not merge until path **A** or agreed equivalent |

---

## References (prisma-next source)

| Topic | Location (under `.sync/prisma-next/`) |
| ----- | ------------------------------------- |
| Postgres `defineConfig` (no `composedExtensionPackRefs`) | `packages/3-extensions/postgres/src/config/define-config.ts` |
| Index registry + validation | `packages/2-sql/2-authoring/contract-ts/src/build-contract.ts` (`assertStorageSemantics`) |
| PSL stub pack fallback | `packages/2-sql/2-authoring/contract-psl/src/interpreter.ts` (`buildComposedExtensionPackRefs`) |
| PSL provider option | `packages/2-sql/2-authoring/contract-psl/src/provider.ts` (`PrismaContractOptions.composedExtensionPackRefs`) |
| ParadeDB index spike test | `test/integration/test/authoring/psl-index-type-options.integration.test.ts` |
| `createIndex` DDL | `packages/3-targets/3-targets/postgres/src/core/migrations/operations/indexes.ts` |
| Opclass future | `docs/architecture docs/adrs/ADR 116 - Extension-aware migration ops.md` |
