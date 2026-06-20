# Progress Log — Tier 2 (Concatenation + Conversion)

**Status:** ✅ Complete (Checkpoint 3)
**Phase:** 4

## Operators

- **Concatenation (→ `pg/ltree@1`):** `concat` (`ltree || ltree`), `concatText` (`ltree || text`),
  `prependText` (`text || ltree`).
- **Conversion:** `toText` → `ltree2text` (`pg/text@1`), `toLtree` → `text2ltree` (`pg/ltree@1`).

All five SQL forms were smoke-tested under PGlite before coding. Added a `concatOp` helper
(operator-style, returns ltree) alongside the reused `funcOp` helper.

## Free-function lowering — ADR-002

The framework's ORM client model-accessor drops any operation without a `self`
(`sql-orm-client/src/model-accessor.ts:97` does `if (!self) continue`). So self-less ops are
unreachable, and free functions must **re-root on a natural `self`**:

- `text2ltree` ships as **`text.toLtree()`** — rooted on `pg/text@1` (paradedb precedent for
  text-rooted ops), renamed from the spec's `fromText` (a misnomer on a text receiver).
- `prependText` keeps the ltree column as `self` even though it is the right operand of
  `text || ltree`; the renderer binds template placeholders by name (`{{self}}` placed second), not
  position.
- The self-less `Ltree.fromText()` constructor and `lca(ltree[])` stay **`planned`** pending a
  free-function call surface.

See [ADR-002](../decisions/ADR-002-free-function-lowering.md).

## Coverage

Golden + PGlite integration + type-level coverage for all five operators. `toLtree` is driven from a
text-literal `self`; the integration test confirms both the self-not-first template (`prependText`)
and the text-rooted op (`toLtree`) execute correctly.

**Result:** `vp run ready` green; Tier 2 features `supported` in
[`feature-support.md`](../feature-support.md).
