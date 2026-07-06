# ADR-005: `lca(ltree[])` surfaces as `paths.lcaAll()` (naming under a flat registry)

**Status:** Accepted
**Date:** 2026-07-06
**Phase/Task:** Array LCA follow-up (unblocks the `lca(ltree[])` item left `planned` by ADR-003)

## Context

PostgreSQL exposes two `lca` forms (see ADR-001):

- `lca(ltree, ltree, ...)` — up to 8 positional `ltree` args. Ships as the variadic
  scalar method `path.lca(other, ...rest)` on `pg/ltree@1` (ADR-001).
- `lca(ltree[])` — a single `ltree[]` arg. ADR-003 delivered the `pg/ltree-array@1`
  array receiver but left this method **`planned`**; the earlier docs pencilled it in
  as `paths.lca()`.

Now that the array receiver exists, the array form can ship. The open question is
purely **what to name the method**, because the natural name `lca` is already taken by
the scalar method.

## Decision

**Ship the array form as `paths.lcaAll()` on `pg/ltree-array@1`** — a zero-arg
receiver method lowering to `lca({{self}})` (i.e. `lca($1::ltree[])`).

**It cannot be named `lca`.** prisma-next keys operations by name only, not by
`(self codec, name)`. `createOperationRegistry` throws on a duplicate:

```ts
register(name, descriptor) {
  if (name in operations) {
    throw new Error(`Operation "${name}" is already registered`);
  }
  // ...
}
```

Two operations both named `lca` (one on `pg/ltree@1`, one on `pg/ltree-array@1`) would
collide at registration. The pack's own `QueryOperationTypes` map is likewise a single
record keyed by method name, so a duplicate `lca` key is impossible even before
registration. The previously-documented `paths.lca()` was therefore never viable.

## Rationale

- **`lcaAll` reads as "the array form of `lca`."** It sorts next to `lca`
  alphabetically and in docs, keeping the two forms discoverable together while making
  the "operate over all elements of the array" intent explicit.
- **Rejected alternatives:** `lca` (registry collision, see above); `arrayLca` /
  `lcaArray` (leads with the receiver type rather than the operation, and the receiver
  is already implied by the `ltree[]` column); `commonAncestor` (drifts from PG's own
  `lca` vocabulary — this was the initial name and was renamed to `lcaAll` before ship
  to stay close to `lca`).
- **Reuses existing machinery.** Lowering goes through the shared `funcOp` helper with
  the array-bound `self`, identical in shape to the Tier 3 first-match ops (ADR-003); no
  new SPI.

## Consequences

- `feature-support.md`: `lca(ltree[])` → `paths.lcaAll()` moves from `planned` to
  `supported` (Tier 3).
- **Return nullability is `false`, mirroring the first-match ops — a known,
  family-wide gap.** PG returns SQL NULL for `lca('{}'::ltree[])` and `lca(NULL)`; an
  empty array is reachable even on a `ltree[] NOT NULL` column (`'{}'` is non-null but
  empty). The first-match ops (`firstAncestorOf`, …) share this: they declare
  `nullable: false` yet return NULL on no match. `lcaAll` follows the same convention
  rather than special-casing itself; tightening the receiver ops to `nullable: true` is
  tracked as a separate cross-cutting change. The empty-array NULL behavior is pinned by
  an integration test.
- Golden + PGlite integration + type-level coverage added for `lcaAll`.
