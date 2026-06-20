# Operator patterns — template catalog

Existing operators in `descriptor-meta.ts` (verify against source — this is a quick reference):

## Hierarchy (self: pg/ltree@1, returns bool)

| Method           | Template               |
| ---------------- | ---------------------- |
| `isAncestorOf`   | `{{self}} @> {{arg0}}` |
| `isDescendantOf` | `{{self}} <@ {{arg0}}` |

## Pattern match (self: pg/ltree@1, returns bool)

| Method               | Template                           | Arg notes      |
| -------------------- | ---------------------------------- | -------------- |
| `matchesLquery`      | `{{self}} ~ ({{arg0}})::lquery`    | string pattern |
| `matchesLqueryArray` | `{{self}} ? ({{arg0}})::lquery[]`  | string[]       |
| `matchesLtxtquery`   | `{{self}} @ ({{arg0}})::ltxtquery` | string         |

## Scalar functions (via funcOp)

| Method     | Template                                                  |
| ---------- | --------------------------------------------------------- |
| `nlevel`   | `nlevel({{self}})`                                        |
| `subltree` | `subltree({{self}}, {{arg0}}, {{arg1}})`                  |
| `subpath`  | `subpath({{self}}, {{arg0}}, {{arg1}})` or 2-arg overload |
| `indexOf`  | `index({{self}}, {{arg0}}, {{arg1}})` or 2-arg overload   |
| `lca`      | `lca({{self}}, {{arg0}}, ...)` variadic                   |

## Concatenation & conversion

| Method        | Template                 | Receiver                     |
| ------------- | ------------------------ | ---------------------------- |
| `concat`      | `{{self}} \|\| {{arg0}}` | ltree                        |
| `concatText`  | `{{self}} \|\| {{arg0}}` | ltree + text label           |
| `prependText` | `{{arg0}} \|\| {{self}}` | ltree (right operand in SQL) |
| `toText`      | `ltree2text({{self}})`   | ltree                        |
| `toLtree`     | `text2ltree({{self}})`   | text column                  |

## Array first-match (self: pg/ltree-array@1)

| Method                | Template                            |
| --------------------- | ----------------------------------- |
| `firstAncestorOf`     | `{{self}} ?@> {{arg0}}`             |
| `firstDescendantOf`   | `{{self}} ?<@ {{arg0}}`             |
| `firstMatchLquery`    | `{{self}} ?~ ({{arg0}})::lquery`    |
| `firstMatchLtxtquery` | `{{self}} ?@ ({{arg0}})::ltxtquery` |

When adding a new operator, pick the closest family and copy its arg codec threading.
