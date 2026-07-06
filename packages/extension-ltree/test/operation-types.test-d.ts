import type { Expression } from "@prisma-next/sql-relational-core/expression";
import { expectTypeOf, test } from "vite-plus/test";
import type { QueryOperationTypes } from "../src/exports/operation-types";

// A codec-types map covering every codec the Tier 1 operations reference, so the
// `CodecExpression` argument types resolve to their raw-value forms.
type TestCT = {
  "pg/ltree@1": { input: string; output: string };
  "pg/ltree-array@1": { input: readonly string[]; output: readonly string[] };
  "pg/text@1": { input: string; output: string };
  "pg/text-array@1": { input: string[]; output: string[] };
  "pg/int4@1": { input: number; output: number };
  "pg/bool@1": { input: boolean; output: boolean };
};

type Ops = QueryOperationTypes<TestCT>;

type Impl<K extends keyof Ops> = Ops[K]["impl"];
type ArgOf<K extends keyof Ops, I extends number> = Parameters<Impl<K>>[I];
type BoolReturn = Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
type LtreeReturn = Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
type IntReturn = Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;

type TextReturn = Expression<{ readonly codecId: "pg/text@1"; readonly nullable: false }>;

test("the full Tier 1 + Tier 2 + Tier 3 operation set is present", () => {
  expectTypeOf<keyof Ops>().toEqualTypeOf<
    | "isAncestorOf"
    | "isDescendantOf"
    | "matchesLquery"
    | "matchesLqueryArray"
    | "matchesLtxtquery"
    | "nlevel"
    | "subltree"
    | "subpath"
    | "indexOf"
    | "lca"
    | "concat"
    | "concatText"
    | "prependText"
    | "toText"
    | "toLtree"
    | "firstAncestorOf"
    | "firstDescendantOf"
    | "firstMatchLquery"
    | "firstMatchLtxtquery"
    | "commonAncestor"
  >();
});

test("hierarchy operators take an ltree arg and return bool", () => {
  expectTypeOf<ReturnType<Impl<"isAncestorOf">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<ReturnType<Impl<"isDescendantOf">>>().toEqualTypeOf<BoolReturn>();
  // The other path accepts a raw ltree string.
  expectTypeOf<string>().toExtend<ArgOf<"isAncestorOf", 1>>();
});

test("pattern-match operators take text / text[] args and return bool", () => {
  expectTypeOf<ReturnType<Impl<"matchesLquery">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<ReturnType<Impl<"matchesLtxtquery">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<ReturnType<Impl<"matchesLqueryArray">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<string>().toExtend<ArgOf<"matchesLquery", 1>>();
  expectTypeOf<string[]>().toExtend<ArgOf<"matchesLqueryArray", 1>>();
});

test("scalar functions return ltree or int4", () => {
  expectTypeOf<ReturnType<Impl<"nlevel">>>().toEqualTypeOf<IntReturn>();
  expectTypeOf<ReturnType<Impl<"indexOf">>>().toEqualTypeOf<IntReturn>();
  expectTypeOf<ReturnType<Impl<"subltree">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"subpath">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"lca">>>().toEqualTypeOf<LtreeReturn>();
});

test("concatenation operators take ltree/text args and return ltree", () => {
  expectTypeOf<ReturnType<Impl<"concat">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"concatText">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"prependText">>>().toEqualTypeOf<LtreeReturn>();
  // concat's other path accepts a raw ltree string; the text variants a label.
  expectTypeOf<string>().toExtend<ArgOf<"concat", 1>>();
  expectTypeOf<string>().toExtend<ArgOf<"concatText", 1>>();
  expectTypeOf<string>().toExtend<ArgOf<"prependText", 1>>();
});

test("conversion operators bridge ltree<->text", () => {
  // toText: ltree self -> text.
  expectTypeOf<ReturnType<Impl<"toText">>>().toEqualTypeOf<TextReturn>();
  expectTypeOf<Ops["toText"]["self"]["codecId"]>().toEqualTypeOf<"pg/ltree@1">();
  // toLtree: text self -> ltree (ADR-002 — rooted on text, not ltree).
  expectTypeOf<ReturnType<Impl<"toLtree">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<Ops["toLtree"]["self"]["codecId"]>().toEqualTypeOf<"pg/text@1">();
});

test("Tier 3 first-match operators take array receiver and return ltree", () => {
  expectTypeOf<Ops["firstAncestorOf"]["self"]["codecId"]>().toEqualTypeOf<"pg/ltree-array@1">();
  expectTypeOf<ReturnType<Impl<"firstAncestorOf">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"firstDescendantOf">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"firstMatchLquery">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"firstMatchLtxtquery">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<string>().toExtend<ArgOf<"firstAncestorOf", 1>>();
  expectTypeOf<string>().toExtend<ArgOf<"firstMatchLquery", 1>>();
});

test("commonAncestor is a zero-arg array-receiver method returning ltree", () => {
  expectTypeOf<Ops["commonAncestor"]["self"]["codecId"]>().toEqualTypeOf<"pg/ltree-array@1">();
  expectTypeOf<ReturnType<Impl<"commonAncestor">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<Impl<"commonAncestor">>().toBeCallableWith(undefined as never);
});

test("subpath length and indexOf offset are optional, lca requires >= 2 paths", () => {
  // subpath: (self, offset) and (self, offset, len) both valid.
  expectTypeOf<Impl<"subpath">>().toBeCallableWith(undefined as never, undefined as never);
  // indexOf offset optional.
  expectTypeOf<Impl<"indexOf">>().toBeCallableWith(undefined as never, undefined as never);
  // lca needs self + at least one other (two required params).
  expectTypeOf<Parameters<Impl<"lca">>["length"]>().toExtend<number>();
  expectTypeOf<ArgOf<"lca", 1>>().not.toBeUndefined();
});
