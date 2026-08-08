import type { JsonValue } from "@prisma/orm-framework/contract/types";
import {
  type CodecCallContext,
  CodecImpl,
  type CodecInstanceContext,
  type ColumnHelperFor,
  type ColumnHelperForStrict,
  column,
  voidParamsSchema,
} from "@prisma/orm-framework/components/codec";
import type { ExtractCodecTypes, ProjectionExpr } from "@prisma/orm-family-sql/relational-core/ast";
import {
  definePostgresCodecs,
  PostgresCodecDescriptor,
} from "@prisma/orm-target-postgres/target/codec-descriptor";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  LTREE_ARRAY_CODEC_ID,
  LTREE_CODEC_ID,
  LTREE_MAX_LABEL_LENGTH,
  LTREE_MAX_LABELS,
} from "./constants";
import { LTREE_ARRAY_NATIVE_TYPE, LTREE_NATIVE_TYPE } from "./contract-space-constants";

const LABEL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function assertValidLtree(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("ltree value must be a string");
  }
  if (value.length === 0) {
    throw new Error("ltree value must not be empty");
  }
  const labels = value.split(".");
  if (labels.length > LTREE_MAX_LABELS) {
    throw new Error(`ltree path exceeds max labels: got ${labels.length}, max ${LTREE_MAX_LABELS}`);
  }
  for (const label of labels) {
    if (label.length === 0) {
      throw new Error(`ltree label must not be empty in path "${value}"`);
    }
    if (label.length > LTREE_MAX_LABEL_LENGTH) {
      throw new Error(
        `ltree label exceeds max length: got ${label.length}, max ${LTREE_MAX_LABEL_LENGTH}`,
      );
    }
    if (!LABEL_PATTERN.test(label)) {
      throw new Error(
        `ltree label "${label}" contains invalid characters; allowed: alphanumeric, underscore, hyphen`,
      );
    }
  }
}

export class LtreeCodec extends CodecImpl<
  typeof LTREE_CODEC_ID,
  readonly ["equality", "order"],
  string,
  string
> {
  async encode(value: string, _ctx: CodecCallContext): Promise<string> {
    assertValidLtree(value);
    return value;
  }

  async decode(wire: string, _ctx: CodecCallContext): Promise<string> {
    return wire;
  }

  encodeJson(value: string): JsonValue {
    assertValidLtree(value);
    return value;
  }

  decodeJson(json: JsonValue): string {
    assertValidLtree(json);
    return json;
  }
}

export class LtreeDescriptor extends PostgresCodecDescriptor<void> {
  protected override nativeType(): string {
    return LTREE_NATIVE_TYPE;
  }
  protected override jsonProjection(expression: ProjectionExpr): ProjectionExpr {
    // ltree's text form is already its canonical JSON string.
    return expression;
  }
  override readonly codecId = LTREE_CODEC_ID;
  override readonly traits = ["equality", "order"] as const;
  override readonly targetTypes = [LTREE_NATIVE_TYPE] as const;
  override readonly paramsSchema: StandardSchemaV1<void> = voidParamsSchema;
  override renderOutputType(): string {
    return "string";
  }
  override factory(): (ctx: CodecInstanceContext) => LtreeCodec {
    const shared = new LtreeCodec(this);
    return () => shared;
  }
}

export const ltreeDescriptor = new LtreeDescriptor();

export const ltree = () =>
  column(ltreeDescriptor.factory(), ltreeDescriptor.codecId, undefined, LTREE_NATIVE_TYPE);

ltree satisfies ColumnHelperFor<LtreeDescriptor>;
ltree satisfies ColumnHelperForStrict<LtreeDescriptor>;

export class LtreeArrayCodec extends CodecImpl<
  typeof LTREE_ARRAY_CODEC_ID,
  readonly ["equality"],
  readonly string[],
  readonly string[]
> {
  async encode(value: readonly string[], _ctx: CodecCallContext): Promise<readonly string[]> {
    for (const entry of value) {
      assertValidLtree(entry);
    }
    return value;
  }

  async decode(wire: readonly string[], _ctx: CodecCallContext): Promise<readonly string[]> {
    return wire;
  }

  encodeJson(value: readonly string[]): JsonValue {
    for (const entry of value) {
      assertValidLtree(entry);
    }
    return [...value];
  }

  decodeJson(json: JsonValue): readonly string[] {
    if (!Array.isArray(json)) {
      return [];
    }
    return json.map((entry) => {
      assertValidLtree(entry);
      return String(entry);
    });
  }
}

export class LtreeArrayDescriptor extends PostgresCodecDescriptor<void> {
  protected override nativeType(): string {
    return LTREE_ARRAY_NATIVE_TYPE;
  }
  protected override jsonProjection(expression: ProjectionExpr): ProjectionExpr {
    // ltree[] text form projects as a JSON string array already.
    return expression;
  }
  override readonly codecId = LTREE_ARRAY_CODEC_ID;
  override readonly traits = ["equality"] as const;
  override readonly targetTypes = [LTREE_ARRAY_NATIVE_TYPE] as const;
  override readonly paramsSchema: StandardSchemaV1<void> = voidParamsSchema;
  override renderOutputType(): string {
    return "readonly string[]";
  }
  override factory(): (ctx: CodecInstanceContext) => LtreeArrayCodec {
    const shared = new LtreeArrayCodec(this);
    return () => shared;
  }
}

export const ltreeArrayDescriptor = new LtreeArrayDescriptor();

export const ltreeArray = () =>
  column(
    ltreeArrayDescriptor.factory(),
    ltreeArrayDescriptor.codecId,
    undefined,
    LTREE_ARRAY_NATIVE_TYPE,
  );

ltreeArray satisfies ColumnHelperFor<LtreeArrayDescriptor>;
ltreeArray satisfies ColumnHelperForStrict<LtreeArrayDescriptor>;

const codecDescriptorMap = {
  ltree: ltreeDescriptor,
  ltreeArray: ltreeArrayDescriptor,
} as const;

export type CodecTypes = ExtractCodecTypes<typeof codecDescriptorMap>;

export const codecDescriptors = definePostgresCodecs(Object.values(codecDescriptorMap));
