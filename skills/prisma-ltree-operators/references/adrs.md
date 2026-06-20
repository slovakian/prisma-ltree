# ADRs — API shape constraints

Read full ADRs in `docs/decisions/` before changing public method signatures.

## ADR-001 — LCA API shape

- `path.lca(other, ...rest)` is **variadic** with ≥2 total ltree paths
- Returns the **proper** lowest common ancestor (strictly shorter than operands)
- Do not expose single-arg `lca()` on a column
- Array-receiver `paths.lca()` is planned separately (see feature-support.md)

## ADR-002 — Free-function lowering

Some SQL functions don't have the ltree column as the left operand:

- `prependText(label)` — SQL is `text || ltree`; keep ltree as receiver in API
- `toLtree()` on text columns — receiver is text, not ltree

When adding similar ops, preserve receiver semantics for discoverability even if SQL operand order differs.

## ADR-003 — Array receiver

- `pg/ltree-array@1` codec for `ltree[]` storage
- First-match operators (`?@>`, `?<@`, `?~`, `?@`) use array receiver
- Separate from scalar hierarchy ops — different `self` codec constraint

Violating ADRs breaks type inference and user expectations documented in README.
