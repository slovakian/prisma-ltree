import { describe, expect, it } from "vite-plus/test";
import {
  LtreeArrayCodec,
  LtreeCodec,
  ltree,
  ltreeArray,
  ltreeArrayDescriptor,
  ltreeDescriptor,
  assertValidLtree,
} from "../src/core/codecs";
import {
  LTREE_ARRAY_CODEC_ID,
  LTREE_CODEC_ID,
  LTREE_MAX_LABEL_LENGTH,
  LTREE_MAX_LABELS,
} from "../src/core/constants";
import { renderSqlCatalogText, renderSqlTypeName } from "@prisma/orm-family-sql/contract/data-type";
import { ltreeArrayDataType, ltreeDataType } from "../src/core/data-types";

type AsyncLtreeCodec = {
  readonly toWire: (value: string) => Promise<string>;
  readonly fromWire: (wire: string) => Promise<string>;
};

function asAsyncCodec(): AsyncLtreeCodec {
  return ltreeDescriptor.factory()({ name: "test" }) as unknown as AsyncLtreeCodec;
}

type AsyncLtreeArrayCodec = {
  readonly toWire: (value: readonly string[]) => Promise<readonly string[]>;
  readonly fromWire: (wire: readonly string[]) => Promise<readonly string[]>;
};

function asAsyncArrayCodec(): AsyncLtreeArrayCodec {
  return ltreeArrayDescriptor.factory()({ name: "test" }) as unknown as AsyncLtreeArrayCodec;
}

describe("prisma-ltree codecs", () => {
  it("has ltree codec registered with correct metadata", () => {
    expect(ltreeDescriptor.codecId).toBe(LTREE_CODEC_ID);
    expect(ltreeDescriptor.dataType).toBe(ltreeDataType.id);
    expect(ltreeDescriptor.traits).toEqual(["equality", "order"]);
  });

  it("writes a valid label path unchanged", async () => {
    const codec = asAsyncCodec();
    const value = "Top.Science.Astronomy";
    const encoded = await codec.toWire(value);
    expect(encoded).toBe(value);
  });

  it("reads a wire string unchanged", async () => {
    const codec = asAsyncCodec();
    const wire = "Top.Countries.Europe.Russia";
    const decoded = await codec.fromWire(wire);
    expect(decoded).toBe(wire);
  });

  it("round-trips toWire/fromWire preserving the value", async () => {
    const codec = asAsyncCodec();
    const original = "Top.Science.Astronomy.Cosmology";
    const encoded = await codec.toWire(original);
    expect(encoded).toBe(original);
    const decoded = await codec.fromWire(encoded);
    expect(decoded).toEqual(original);
  });

  it("writes a single-label path", async () => {
    const codec = asAsyncCodec();
    const encoded = await codec.toWire("Top");
    expect(encoded).toBe("Top");
  });

  it("writes labels with underscores and hyphens", async () => {
    const codec = asAsyncCodec();
    const encoded = await codec.toWire("my_label.hyphen-label.123");
    expect(encoded).toBe("my_label.hyphen-label.123");
  });

  it("has ltree-array codec registered with correct metadata", () => {
    expect(ltreeArrayDescriptor.codecId).toBe(LTREE_ARRAY_CODEC_ID);
    expect(ltreeArrayDescriptor.dataType).toBe(ltreeArrayDataType.id);
    expect(renderSqlTypeName(ltreeArrayDataType, {})).toBe("ltree[]");
    expect(renderSqlCatalogText(ltreeArrayDataType, {})).toBe("ltree[]");
    expect(ltreeArrayDescriptor.traits).toEqual(["equality"]);
  });

  it("writes a valid ltree[] unchanged with per-element validation", async () => {
    const codec = asAsyncArrayCodec();
    const value = ["Top.Science", "Top.Hobbies"] as const;
    const encoded = await codec.toWire(value);
    expect(encoded).toEqual(value);
  });

  it("rejects invalid paths inside an ltree[] on toWire", async () => {
    const codec = asAsyncArrayCodec();
    await expect(codec.toWire(["Top.Science", "bad path"])).rejects.toThrow("invalid characters");
  });

  it("reads an ltree[] wire array unchanged", async () => {
    const codec = asAsyncArrayCodec();
    const wire = ["Top.Science", "Top.Hobbies.Amateurs_Astronomy"] as const;
    expect(await codec.fromWire(wire)).toEqual(wire);
  });
});

describe("prisma-ltree codec data-type values", () => {
  it("round-trips a single path through toDataTypeValue/fromDataTypeValue", () => {
    const value = "Top.Science.Astronomy";
    const codec = new LtreeCodec(ltreeDescriptor);
    const stored = codec.toDataTypeValue(value);
    expect(stored.value).toBe(value);
    expect(codec.fromDataTypeValue(stored)).toBe(value);
  });

  it("rejects invalid paths in toDataTypeValue and data-type read", () => {
    const codec = new LtreeCodec(ltreeDescriptor);
    expect(() => codec.toDataTypeValue("bad path")).toThrow("invalid characters");
    expect(() => ltreeDataType.valueFrom("bad path", {})).toThrow();
  });

  it("round-trips an ltree[] through toDataTypeValue/fromDataTypeValue", () => {
    const codec = new LtreeArrayCodec(ltreeArrayDescriptor);
    const value = ["Top.Science", "Top.Hobbies"] as const;
    const stored = codec.toDataTypeValue(value);
    expect(stored.value).toEqual([...value]);
    expect(codec.fromDataTypeValue(stored)).toEqual([...value]);
  });

  it("rejects invalid entries in array toDataTypeValue and data-type read", () => {
    const codec = new LtreeArrayCodec(ltreeArrayDescriptor);
    expect(() => codec.toDataTypeValue(["ok", "bad path"])).toThrow("invalid characters");
    expect(() => ltreeArrayDataType.valueFrom(["bad path"], {})).toThrow();
  });
});

describe("prisma-ltree codec descriptors render output types", () => {
  it("renders the scalar ltree output type as string", () => {
    expect(ltreeDescriptor.renderOutputType()).toBe("string");
  });

  it("renders the ltree[] output type as readonly string[]", () => {
    expect(ltreeArrayDescriptor.renderOutputType()).toBe("readonly string[]");
  });
});

describe("prisma-ltree codec validation", () => {
  it("rejects non-string values", async () => {
    const codec = asAsyncCodec();
    await expect(codec.toWire(123 as unknown as string)).rejects.toThrow(
      "ltree value must be a string",
    );
  });

  it("rejects empty strings", async () => {
    const codec = asAsyncCodec();
    await expect(codec.toWire("")).rejects.toThrow("ltree value must not be empty");
  });

  it("rejects labels with dots resulting in empty segments", async () => {
    const codec = asAsyncCodec();
    await expect(codec.toWire("Top..Science")).rejects.toThrow("ltree label must not be empty");
    await expect(codec.toWire(".Top")).rejects.toThrow("ltree label must not be empty");
    await expect(codec.toWire("Top.")).rejects.toThrow("ltree label must not be empty");
  });

  it("rejects labels with invalid characters", async () => {
    const codec = asAsyncCodec();
    await expect(codec.toWire("Top.Sc ience")).rejects.toThrow("invalid characters");
    await expect(codec.toWire("Top.Science!")).rejects.toThrow("invalid characters");
    await expect(codec.toWire("Top.Sc/ience")).rejects.toThrow("invalid characters");
  });

  it("rejects labels exceeding the max length", async () => {
    const codec = asAsyncCodec();
    const longLabel = "a".repeat(LTREE_MAX_LABEL_LENGTH + 1);
    await expect(codec.toWire(longLabel)).rejects.toThrow("exceeds max length");
  });

  it("rejects a path exceeding the max number of labels", () => {
    const tooManyLabels = Array.from({ length: LTREE_MAX_LABELS + 1 }, () => "a").join(".");
    expect(() => assertValidLtree(tooManyLabels)).toThrow("exceeds max labels");
  });

  it("accepts a label at exactly the max length", async () => {
    const codec = asAsyncCodec();
    const maxLabel = "a".repeat(LTREE_MAX_LABEL_LENGTH);
    const encoded = await codec.toWire(maxLabel);
    expect(encoded).toBe(maxLabel);
  });

  it("assertValidLtree throws for invalid input", () => {
    expect(() => assertValidLtree(undefined as unknown as string)).toThrow(
      "ltree value must be a string",
    );
    expect(() => assertValidLtree("good.path")).not.toThrow();
  });
});

describe("ltree column helper", () => {
  it("produces a ColumnSpec with the ltree codec id", () => {
    const spec = ltree();
    expect(spec.codecId).toBe(LTREE_CODEC_ID);
    expect(spec.typeParams).toBeUndefined();
  });

  it("produces a codec factory that materializes a working LtreeCodec", async () => {
    const spec = ltree();
    const codec = spec.codecFactory({ name: "path" }) as unknown as AsyncLtreeCodec;
    expect(await codec.toWire("Top.Child")).toBe("Top.Child");
  });
});

describe("ltreeArray column helper", () => {
  it("produces a ColumnSpec with the array codec id", () => {
    const spec = ltreeArray();
    expect(spec.codecId).toBe(LTREE_ARRAY_CODEC_ID);
  });
});
