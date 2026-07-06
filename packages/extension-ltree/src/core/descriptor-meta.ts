import type { AnyExpression } from "@prisma-next/sql-relational-core/ast";
import {
  buildOperation,
  type CodecExpression,
  codecOf,
  type Expression,
  toExpr,
} from "@prisma-next/sql-relational-core/expression";
import type { CodecTypes } from "../types/codec-types";
import type { QueryOperationTypes } from "../types/operation-types";
import { ltreeAuthoringTypes } from "./authoring";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "./constants";
import { LTREE_ARRAY_NATIVE_TYPE, LTREE_NATIVE_TYPE } from "./contract-space-constants";
import { ltreeCodecRegistry } from "./registry";

type CodecTypesBase = Record<string, { readonly input: unknown; readonly output: unknown }>;

type BoolReturn = Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
type LtreeReturn = Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
type IntReturn = Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;
type TextReturn = Expression<{ readonly codecId: "pg/text@1"; readonly nullable: false }>;

const BOOL_RETURN = { codecId: "pg/bool@1", nullable: false } as const;
const LTREE_RETURN = { codecId: "pg/ltree@1", nullable: false } as const;
const INT_RETURN = { codecId: "pg/int4@1", nullable: false } as const;
const TEXT_RETURN = { codecId: "pg/text@1", nullable: false } as const;
const TEXT_CODEC_ID = "pg/text@1" as const;
const TEXT_ARRAY_CODEC_ID = "pg/text-array@1" as const;
const INT_CODEC_ID = "pg/int4@1" as const;

/**
 * Build a function-style operation whose SQL is `fnName(self, arg0, arg1, ...)`.
 * The template's placeholder count is derived from the actual argument list, so
 * one helper covers fixed-arity functions (`nlevel`, `subltree`), optional-arg
 * overloads (`subpath`, `index`), and the variadic `lca` (see ADR-001). `args`
 * already carries each value through `toExpr` with its codec; `args[0]` is the
 * `self` receiver.
 */
function funcOp<C extends string>(
  method: string,
  fnName: string,
  returns: { readonly codecId: C; readonly nullable: false },
  args: readonly [AnyExpression, ...AnyExpression[]],
): Expression<{ readonly codecId: C; readonly nullable: false }> {
  const placeholders = args.map((_, i) => (i === 0 ? "{{self}}" : `{{arg${i - 1}}}`)).join(", ");
  return buildOperation({
    method,
    args,
    returns,
    lowering: {
      targetFamily: "sql",
      strategy: "function",
      template: `${fnName}(${placeholders})`,
    },
  });
}

export function ltreeQueryOperations<CT extends CodecTypesBase>(): QueryOperationTypes<CT> {
  // Hierarchy operators compare two `ltree` values; the user argument shares the
  // column's `pg/ltree@1` codec. Pattern-match operators take a query/pattern
  // string (or `string[]`) that is NOT an ltree — it is bound as text and cast
  // in-template to `lquery` / `lquery[]` / `ltxtquery` (the validated-string-param
  // approach; verified executable under PGlite).
  const hierarchyOp = (
    method: string,
    operator: string,
    self: CodecExpression<typeof LTREE_CODEC_ID, boolean, CT>,
    other: CodecExpression<typeof LTREE_CODEC_ID, boolean, CT>,
  ): BoolReturn => {
    const selfCodec = codecOf(self);
    return buildOperation({
      method,
      args: [toExpr(self, selfCodec), toExpr(other, selfCodec)],
      returns: BOOL_RETURN,
      lowering: {
        targetFamily: "sql",
        strategy: "function",
        template: `{{self}} ${operator} {{arg0}}`,
      },
    });
  };

  const patternOp = (
    method: string,
    operator: string,
    castType: string,
    argCodecId: typeof TEXT_CODEC_ID | typeof TEXT_ARRAY_CODEC_ID,
    self: CodecExpression<typeof LTREE_CODEC_ID, boolean, CT>,
    arg: unknown,
  ): BoolReturn => {
    const selfCodec = codecOf(self);
    return buildOperation({
      method,
      args: [toExpr(self, selfCodec), toExpr(arg, { codecId: argCodecId })],
      returns: BOOL_RETURN,
      lowering: {
        targetFamily: "sql",
        strategy: "function",
        template: `{{self}} ${operator} ({{arg0}})::${castType}`,
      },
    });
  };

  // Concatenation operators produce a new ltree. `concat` joins two ltree paths
  // (`{{self}} || {{arg0}}`); `concatText`/`prependText` splice a text label onto
  // the right/left. The text operand binds as `pg/text@1` and is cast in-template
  // (PG resolves the `||` overload from the cast). `prependText` places `{{self}}`
  // second because the ltree receiver is the RIGHT operand of `text || ltree`;
  // `args[0]` is still `self` (the renderer binds by placeholder name, not order).
  const concatOp = (
    method: string,
    template: string,
    args: readonly [AnyExpression, ...AnyExpression[]],
  ): LtreeReturn =>
    buildOperation({
      method,
      args,
      returns: LTREE_RETURN,
      lowering: { targetFamily: "sql", strategy: "function", template },
    });

  // Tier 3 — first-match operators on an `ltree[]` receiver (ADR-003).
  const firstMatchOp = (
    method: string,
    operator: string,
    self: CodecExpression<typeof LTREE_ARRAY_CODEC_ID, boolean, CT>,
    arg: unknown,
    argCodecId: typeof LTREE_CODEC_ID | typeof TEXT_CODEC_ID,
    castType?: string,
  ): LtreeReturn => {
    const selfCodec = codecOf(self);
    const template = castType
      ? `{{self}} ${operator} ({{arg0}})::${castType}`
      : `{{self}} ${operator} {{arg0}}`;
    return buildOperation({
      method,
      args: [toExpr(self, selfCodec), toExpr(arg, { codecId: argCodecId })],
      returns: LTREE_RETURN,
      lowering: { targetFamily: "sql", strategy: "function", template },
    });
  };

  return {
    isAncestorOf: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other) => hierarchyOp("isAncestorOf", "@>", self, other),
    },
    isDescendantOf: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other) => hierarchyOp("isDescendantOf", "<@", self, other),
    },
    matchesLquery: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, pattern) =>
        patternOp("matchesLquery", "~", "lquery", TEXT_CODEC_ID, self, pattern),
    },
    matchesLqueryArray: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, patterns) =>
        patternOp("matchesLqueryArray", "?", "lquery[]", TEXT_ARRAY_CODEC_ID, self, patterns),
    },
    matchesLtxtquery: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, query) =>
        patternOp("matchesLtxtquery", "@", "ltxtquery", TEXT_CODEC_ID, self, query),
    },
    nlevel: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self): IntReturn =>
        funcOp("nlevel", "nlevel", INT_RETURN, [toExpr(self, codecOf(self))]),
    },
    subltree: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, start, end): LtreeReturn =>
        funcOp("subltree", "subltree", LTREE_RETURN, [
          toExpr(self, codecOf(self)),
          toExpr(start, { codecId: INT_CODEC_ID }),
          toExpr(end, { codecId: INT_CODEC_ID }),
        ]),
    },
    // `subpath(self, offset, len?)` — `len` omitted lowers to the 2-arg overload.
    subpath: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, offset, len): LtreeReturn => {
        const head: readonly [AnyExpression, AnyExpression] = [
          toExpr(self, codecOf(self)),
          toExpr(offset, { codecId: INT_CODEC_ID }),
        ];
        return funcOp(
          "subpath",
          "subpath",
          LTREE_RETURN,
          len === undefined ? head : [...head, toExpr(len, { codecId: INT_CODEC_ID })],
        );
      },
    },
    // `index(self, other, offset?)` — `offset` omitted lowers to the 2-arg overload.
    indexOf: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other, offset): IntReturn => {
        const selfCodec = codecOf(self);
        const head: readonly [AnyExpression, AnyExpression] = [
          toExpr(self, selfCodec),
          toExpr(other, selfCodec),
        ];
        return funcOp(
          "indexOf",
          "index",
          INT_RETURN,
          offset === undefined ? head : [...head, toExpr(offset, { codecId: INT_CODEC_ID })],
        );
      },
    },
    // `lca(self, other, ...rest)` — variadic longest-common-ancestor (ADR-001).
    // PostgreSQL has no single-arg `lca`, so `other` is required (2–8 paths).
    lca: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other, ...rest): LtreeReturn => {
        const selfCodec = codecOf(self);
        return funcOp("lca", "lca", LTREE_RETURN, [
          toExpr(self, selfCodec),
          toExpr(other, selfCodec),
          ...rest.map((p) => toExpr(p, selfCodec)),
        ]);
      },
    },
    // Tier 2 — concatenation (`||`).
    concat: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other): LtreeReturn => {
        const selfCodec = codecOf(self);
        return concatOp("concat", "{{self}} || {{arg0}}", [
          toExpr(self, selfCodec),
          toExpr(other, selfCodec),
        ]);
      },
    },
    concatText: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, label): LtreeReturn =>
        concatOp("concatText", "{{self}} || ({{arg0}})::text", [
          toExpr(self, codecOf(self)),
          toExpr(label, { codecId: TEXT_CODEC_ID }),
        ]),
    },
    // `text || ltree` — the ltree receiver is the right operand (ADR-002).
    prependText: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, prefix): LtreeReturn =>
        concatOp("prependText", "({{arg0}})::text || {{self}}", [
          toExpr(self, codecOf(self)),
          toExpr(prefix, { codecId: TEXT_CODEC_ID }),
        ]),
    },
    // Tier 2 — conversion.
    toText: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self): TextReturn =>
        funcOp("toText", "ltree2text", TEXT_RETURN, [toExpr(self, codecOf(self))]),
    },
    // `text2ltree(text)` — rooted on `pg/text@1` (the only reachable form of the
    // free-function `text2ltree`; see ADR-002). Surfaces as `.toLtree()` on text.
    toLtree: {
      self: { codecId: TEXT_CODEC_ID },
      impl: (self): LtreeReturn =>
        funcOp("toLtree", "text2ltree", LTREE_RETURN, [toExpr(self, codecOf(self))]),
    },
    // Tier 3 — array first-match operators (ADR-003).
    firstAncestorOf: {
      self: { codecId: LTREE_ARRAY_CODEC_ID },
      impl: (self, other) => firstMatchOp("firstAncestorOf", "?@>", self, other, LTREE_CODEC_ID),
    },
    firstDescendantOf: {
      self: { codecId: LTREE_ARRAY_CODEC_ID },
      impl: (self, other) => firstMatchOp("firstDescendantOf", "?<@", self, other, LTREE_CODEC_ID),
    },
    firstMatchLquery: {
      self: { codecId: LTREE_ARRAY_CODEC_ID },
      impl: (self, pattern) =>
        firstMatchOp("firstMatchLquery", "?~", self, pattern, TEXT_CODEC_ID, "lquery"),
    },
    firstMatchLtxtquery: {
      self: { codecId: LTREE_ARRAY_CODEC_ID },
      impl: (self, query) =>
        firstMatchOp("firstMatchLtxtquery", "?@", self, query, TEXT_CODEC_ID, "ltxtquery"),
    },
    // `lca(ltree[])` — array-receiver form (ADR-001, ADR-005). Named `lcaAll`
    // because prisma-next keys operations by name only (`createOperationRegistry`
    // throws on a duplicate); `lca` is already the variadic scalar method on
    // `pg/ltree@1`. Declares `nullable: false` for parity with the Tier 3
    // first-match ops even though PG returns NULL for an empty/NULL `ltree[]`
    // (see the empty-array integration test) — a family-wide gap, not specific
    // to `lcaAll`.
    lcaAll: {
      self: { codecId: LTREE_ARRAY_CODEC_ID },
      impl: (self): LtreeReturn =>
        funcOp("lcaAll", "lca", LTREE_RETURN, [toExpr(self, codecOf(self))]),
    },
  };
}

const ltreePackMetaBase = {
  kind: "extension",
  id: "ltree",
  familyId: "sql",
  targetId: "postgres",
  version: "0.1.0",
  capabilities: {
    postgres: {
      "ltree.path": true,
    },
  },
  authoring: {
    type: ltreeAuthoringTypes,
  },
  types: {
    codecTypes: {
      codecDescriptors: Array.from(ltreeCodecRegistry.values()),
      import: {
        package: "prisma-ltree/codec-types",
        named: "CodecTypes",
        alias: "LtreeTypes",
      },
      typeImports: [
        {
          package: "prisma-ltree/codec-types",
          named: "Ltree",
          alias: "Ltree",
        },
      ],
    },
    queryOperationTypes: {
      import: {
        package: "prisma-ltree/operation-types",
        named: "QueryOperationTypes",
        alias: "LtreeQueryOperationTypes",
      },
    },
    storage: [
      {
        typeId: LTREE_CODEC_ID,
        familyId: "sql",
        targetId: "postgres",
        nativeType: LTREE_NATIVE_TYPE,
      },
      {
        typeId: LTREE_ARRAY_CODEC_ID,
        familyId: "sql",
        targetId: "postgres",
        nativeType: LTREE_ARRAY_NATIVE_TYPE,
      },
    ],
  },
} as const;

export const ltreePackMeta: typeof ltreePackMetaBase & {
  readonly __codecTypes?: CodecTypes;
} = ltreePackMetaBase;
