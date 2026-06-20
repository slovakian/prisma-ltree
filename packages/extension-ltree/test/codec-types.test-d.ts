import type { AnyCodecDescriptor } from "@prisma-next/sql-relational-core/ast";
import { expectTypeOf, test } from "vite-plus/test";
import {
  codecDescriptors,
  type LtreeArrayDescriptor,
  type LtreeDescriptor,
  ltreeArrayDescriptor,
  ltreeDescriptor,
} from "../src/core/codecs";
import type { CodecTypes, Ltree, LtreeArray } from "../src/exports/codec-types";

test("codecDescriptors is a readonly AnyCodecDescriptor list", () => {
  expectTypeOf(codecDescriptors).toEqualTypeOf<readonly AnyCodecDescriptor[]>();
  expectTypeOf<(typeof codecDescriptors)[number]>().toExtend<AnyCodecDescriptor>();
});

test("ltreeDescriptor.codecId is the literal `pg/ltree@1`", () => {
  expectTypeOf(ltreeDescriptor.codecId).toEqualTypeOf<"pg/ltree@1">();
  expectTypeOf<LtreeDescriptor["codecId"]>().toEqualTypeOf<"pg/ltree@1">();
});

test("ltreeDescriptor.traits is the readonly literal tuple", () => {
  expectTypeOf(ltreeDescriptor.traits).toEqualTypeOf<readonly ["equality", "order"]>();
});

test("CodecTypes['pg/ltree@1'] exposes string input/output", () => {
  expectTypeOf<CodecTypes["pg/ltree@1"]["input"]>().toEqualTypeOf<string>();
  expectTypeOf<CodecTypes["pg/ltree@1"]["output"]>().toEqualTypeOf<string>();
});

test("a non-registered codec id is absent from CodecTypes", () => {
  // @ts-expect-error -- `pg/nonexistent@1` is not a registered codec id
  type _Missing = CodecTypes["pg/nonexistent@1"];
});

test("ltreeArrayDescriptor.codecId is the literal `pg/ltree-array@1`", () => {
  expectTypeOf(ltreeArrayDescriptor.codecId).toEqualTypeOf<"pg/ltree-array@1">();
  expectTypeOf<LtreeArrayDescriptor["codecId"]>().toEqualTypeOf<"pg/ltree-array@1">();
});

test("CodecTypes['pg/ltree-array@1'] exposes string[] input/output", () => {
  expectTypeOf<CodecTypes["pg/ltree-array@1"]["input"]>().toEqualTypeOf<readonly string[]>();
  expectTypeOf<CodecTypes["pg/ltree-array@1"]["output"]>().toEqualTypeOf<readonly string[]>();
});

test("the Ltree branded type is assignable to/from string", () => {
  expectTypeOf<Ltree>().toExtend<string>();
  const value: Ltree = "Top.Science";
  expectTypeOf(value).toExtend<string>();
});

test("the LtreeArray branded type is assignable to/from readonly string[]", () => {
  expectTypeOf<LtreeArray>().toExtend<readonly string[]>();
  const paths: LtreeArray = ["Top.Science", "Top.Hobbies"];
  expectTypeOf(paths).toExtend<readonly string[]>();
});
