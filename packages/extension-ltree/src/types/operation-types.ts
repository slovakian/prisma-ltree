import type { SqlQueryOperationTypes } from "@prisma-next/sql-contract/types";
import type { CodecExpression, Expression } from "@prisma-next/sql-relational-core/expression";

type CodecTypesBase = Record<string, { readonly input: unknown; readonly output: unknown }>;

export type QueryOperationTypes<CT extends CodecTypesBase> = SqlQueryOperationTypes<
  CT,
  {
    readonly isAncestorOf: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    readonly isDescendantOf: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    // Pattern-match operators: the argument is a query/pattern string (or
    // `string[]`), bound as text and cast in-template to lquery/ltxtquery — not
    // an ltree value.
    readonly matchesLquery: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        pattern: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    readonly matchesLqueryArray: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        patterns: CodecExpression<"pg/text-array@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    readonly matchesLtxtquery: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        query: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    // Scalar functions.
    readonly nlevel: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;
    };
    readonly subltree: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        start: CodecExpression<"pg/int4@1", boolean, CT>,
        end: CodecExpression<"pg/int4@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly subpath: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        offset: CodecExpression<"pg/int4@1", boolean, CT>,
        len?: CodecExpression<"pg/int4@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly indexOf: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
        offset?: CodecExpression<"pg/int4@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;
    };
    // Variadic longest-common-ancestor on the first path (ADR-001). PostgreSQL's
    // positional `lca` has no single-argument form, so at least one `other` path
    // is required (total 2–8 paths).
    readonly lca: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
        ...rest: ReadonlyArray<CodecExpression<"pg/ltree@1", boolean, CT>>
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    // Tier 2 — concatenation. The text operand is bound as text and cast
    // in-template; `prependText` splices the label on the left (`text || ltree`).
    readonly concat: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly concatText: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        label: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly prependText: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        prefix: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    // Tier 2 — conversion. `toLtree` is rooted on `pg/text@1` (ADR-002): it is the
    // reachable form of `text2ltree`, surfacing on text columns rather than ltree.
    readonly toText: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/text@1"; readonly nullable: false }>;
    };
    readonly toLtree: {
      readonly self: { readonly codecId: "pg/text@1" };
      readonly impl: (
        self: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    // Tier 3 — array first-match operators on `pg/ltree-array@1` (ADR-003).
    readonly firstAncestorOf: {
      readonly self: { readonly codecId: "pg/ltree-array@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree-array@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly firstDescendantOf: {
      readonly self: { readonly codecId: "pg/ltree-array@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree-array@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly firstMatchLquery: {
      readonly self: { readonly codecId: "pg/ltree-array@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree-array@1", boolean, CT>,
        pattern: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly firstMatchLtxtquery: {
      readonly self: { readonly codecId: "pg/ltree-array@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree-array@1", boolean, CT>,
        query: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    // `lca(ltree[])` — ships as `lcaAll()` (ADR-001, ADR-005); not `lca()`
    // because prisma-next operation names are globally unique across the composed
    // stack. `nullable: false` mirrors the first-match ops (PG can return NULL for
    // an empty/NULL array — a shared Tier 3 gap, tracked separately).
    readonly lcaAll: {
      readonly self: { readonly codecId: "pg/ltree-array@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree-array@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
  }
>;
