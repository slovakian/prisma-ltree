# ADR-002: Free-function lowering — re-root on a natural `self`, don't invent self-less ops

**Status:** Accepted
**Date:** 2026-06-19
**Phase/Task:** Phase 4, Task 4.1 (Tier 2 — concatenation + conversion)

## Context

Tier 2 adds five PostgreSQL forms. Four have a natural `ltree` receiver; one does
not:

| SQL                 | Natural receiver        | Shape question        |
| ------------------- | ----------------------- | --------------------- |
| `ltree \|\| ltree`  | left ltree              | trivial self-method   |
| `ltree \|\| text`   | left ltree              | trivial self-method   |
| `text \|\| ltree`   | **right** ltree         | self not first        |
| `ltree2text(ltree)` | the ltree               | trivial self-method   |
| `text2ltree(text)`  | **none** (text → ltree) | genuine free function |

The prisma-next operation model is `self`-centric: each `QueryOperationTypeEntry`
declares a `self` codec and an `impl(self, ...args)`, and the ORM client surfaces an
operation as a method on every column whose codec matches `self.codecId`. The open
question (flagged for this ADR since Task 3.2): how does a **free function** with no
natural `ltree` `self` — `text2ltree`, and by extension `lca(ltree[])` — surface?

### What the source says (verified against `.sync/prisma-next/`)

- `QueryOperationTypeEntry.self` is **optional** (`packages/2-sql/1-core/contract/src/types.ts`),
  so a self-less op type-checks.
- **But a self-less op is never reachable.** The ORM client's model-accessor
  (`packages/3-extensions/sql-orm-client/src/model-accessor.ts:97`) iterates
  operations and does `const self = entry.self; if (!self) continue;` — operations
  without a `self` are silently skipped and registered on no field. There is no
  "static" / namespace-function call surface today.
- An op **can** be keyed on any codec, including core codecs the pack does not own.
  paradedb keys its operations on `pg/text@1` / `pg/int4@1`
  (`packages/3-extensions/paradedb/src/core/descriptor-meta.ts`). The model-accessor
  registers by `self.codecId`, so a text-rooted op surfaces on text columns.
- The lowering renderer substitutes `{{self}}` / `{{arg0}}` **by placeholder name**,
  not by argument position, so `{{self}}` may appear anywhere in the template while
  `args[0]` remains the receiver.

All five SQL forms were smoke-tested executable under PGlite before this decision
(`||` overloads resolve from an explicit `({{arg0}})::text` cast; `text || ltree`
renders with `{{self}}` second; `text2ltree`/`ltree2text` execute as written).

## Decision

**Model every operation on a real `self` — re-root the free function on its input
type rather than inventing a self-less op.** Concretely:

| Op            | `self` codec | Template                         | Returns      |
| ------------- | ------------ | -------------------------------- | ------------ |
| `concat`      | `pg/ltree@1` | `{{self}} \|\| {{arg0}}`         | `pg/ltree@1` |
| `concatText`  | `pg/ltree@1` | `{{self}} \|\| ({{arg0}})::text` | `pg/ltree@1` |
| `prependText` | `pg/ltree@1` | `({{arg0}})::text \|\| {{self}}` | `pg/ltree@1` |
| `toText`      | `pg/ltree@1` | `ltree2text({{self}})`           | `pg/text@1`  |
| `toLtree`     | `pg/text@1`  | `text2ltree({{self}})`           | `pg/ltree@1` |

- **`prependText`** keeps the ltree receiver as `self` even though it is the right
  operand of `text || ltree`; only the template order changes. No new SPI.
- **`toLtree`** is the reachable form of `text2ltree`. Because it has no ltree
  receiver, its `self` is `pg/text@1` and it surfaces as `.toLtree()` on **text**
  columns (mirroring paradedb's text-rooted ops, and symmetric to `toText` on
  ltree). It is renamed from the spec's `fromText`: as a method on a text receiver,
  `fromText` is a misnomer; `toLtree` reads correctly (`someTextColumn.toLtree()`).

**The self-less _constructor_ spelling stays `planned`.** A static
`Ltree.fromText(s)` / `ltree.lca(paths)` with no receiver is the genuinely
unsupported shape — proven unreachable above. It is deferred pending a
free-function / namespace call surface in the framework (the same gate that keeps
`lca(ltree[])` `planned` per ADR-001).

## Rationale

- **It is the only shape that surfaces today.** Self-less ops are dropped by the
  model-accessor; re-rooting on the input type is the sole reachable option and
  needs no framework change.
- **Re-rooting is an established pattern, not a workaround.** paradedb already keys
  operations on core codecs (`pg/text@1`, `pg/int4@1`). A text → ltree conversion is
  honestly "an operation on text", so rooting it on text is faithful, not a hack.
- **Consistent with ADR-001.** ADR-001 deferred the self-less `lca(ltree[])` for the
  same reason; ADR-002 generalizes the rule: _prefer a natural `self`; defer only the
  shapes that have none._
- **Surface cost is acceptable and opt-in.** Loading the pack adds `.toLtree()` to
  text columns. This matches paradedb (loading it adds search ops to text columns)
  and only applies to schemas that opt into the ltree pack.

## Consequences

- `docs/feature-support.md`: `concat`, `concatText`, `prependText`, `toText` →
  `supported` (Tier 2). `text2ltree` → `supported` as `text.toLtree()`; the
  self-less `Ltree.fromText()` constructor is recorded `planned`.
- The spec's `fromText` name is superseded by `toLtree` (text-rooted). Noted here as
  the authoritative shape decision the spec deferred to this ADR.
- `prependText` is the first op whose template places `{{self}}` after `{{arg0}}`;
  golden + PGlite tests lock both the template string and execution.
- `concatText`/`prependText` use an explicit `({{arg0}})::text` cast so PG resolves
  the `||` overload deterministically (both cast and bare forms were verified to
  execute; the cast documents intent and removes overload ambiguity).

## Alternatives rejected

- **Self-less op for `text2ltree`** — type-checks but is silently dropped by the ORM
  client (unreachable). Rejected on evidence.
- **Defer `text2ltree` entirely to `planned`** — leaves a fully implementable,
  reachable conversion unshipped for a soft "keep the pack ltree-only" reason. The
  text-rooted form has no technical unknown, so deferral would be needless.
- **A bespoke namespace export (`ltree.fromText`)** — would require inventing the
  free-function call surface this ADR explicitly leaves to the framework; out of
  scope for Tier 2.
