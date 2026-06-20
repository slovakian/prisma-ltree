import { describe, expect, it } from "vite-plus/test";
import { ltree, ltreeArray } from "../src/exports/column-types";

describe("prisma-ltree column-types", () => {
  it("creates descriptor with codecId and nativeType", () => {
    const descriptor = ltree();
    expect(descriptor).toMatchObject({
      codecId: "pg/ltree@1",
      nativeType: "ltree",
    });
  });

  it("does not carry typeParams (non-parameterized)", () => {
    const descriptor = ltree();
    expect(descriptor.typeParams).toBeUndefined();
  });

  it("returns a new descriptor object on each call", () => {
    const a = ltree();
    const b = ltree();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("ltreeArray() creates descriptor with array codecId and nativeType", () => {
    const descriptor = ltreeArray();
    expect(descriptor).toMatchObject({
      codecId: "pg/ltree-array@1",
      nativeType: "ltree[]",
    });
  });
});
