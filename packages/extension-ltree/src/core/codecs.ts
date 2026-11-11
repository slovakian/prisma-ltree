import {
  type AnyCodecDescriptor,
  type CodecCallContext,
  CodecImpl,
  type CodecInstanceContext,
  type ColumnHelperFor,
  type ColumnHelperForStrict,
  column,
  type DataTypeValue,
} from "@prisma/orm-framework/components/codec";
import type { ExtractCodecTypes, ProjectionExpr } from "@prisma/orm-family-sql/relational-core/ast";
import { CastExpr } from "@prisma/orm-family-sql/relational-core/ast";
import {
  definePostgresCodecs,
  PostgresCodecDescriptor,
} from "@prisma/orm-target-postgres/target/codec-descriptor";
import { assertValidLtree } from "./codecs-validation";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "./constants";
import { ltreeArrayDataType, ltreeDataType } from "./data-types";

export { assertValidLtree } from "./codecs-validation";

export class LtreeCodec extends CodecImpl<
  typeof LTREE_CODEC_ID,
  readonly ["equality", "order"],
  string,
  string
> {
  constructor(descriptor: AnyCodecDescriptor) {
    super(descriptor, ltreeDataType);
  }

  async toWire(value: string, _ctx: CodecCallContext): Promise<string> {
    assertValidLtree(value);
    return value;
  }

  async fromWire(wire: string, _ctx: CodecCallContext): Promise<string> {
    return wire;
  }

  toDataTypeValue(value: string): DataTypeValue {
    assertValidLtree(value);
    return this.dataTypeValueOf(value);
  }

  fromDataTypeValue(value: DataTypeValue): string {
    return value.value as string;
  }
}

export class LtreeDescriptor extends PostgresCodecDescriptor<void> {
  protected override jsonProjection(expression: ProjectionExpr): ProjectionExpr {
    // JSON projections read through fromWire; cast so the wire value is text.
    return CastExpr.as(expression, "text");
  }
  override readonly dataType = ltreeDataType.id;
  override readonly codecId = LTREE_CODEC_ID;
  override readonly traits = ["equality", "order"] as const;
  override readonly paramsSchema = undefined;
  override renderOutputType(): string {
    return "string";
  }
  override factory(): (ctx: CodecInstanceContext) => LtreeCodec {
    const shared = new LtreeCodec(this);
    return () => shared;
  }
}

export const ltreeDescriptor = new LtreeDescriptor();

export const ltree = () => column(ltreeDescriptor.factory(), ltreeDescriptor.codecId, undefined);

ltree satisfies ColumnHelperFor<LtreeDescriptor>;
ltree satisfies ColumnHelperForStrict<LtreeDescriptor>;

export class LtreeArrayCodec extends CodecImpl<
  typeof LTREE_ARRAY_CODEC_ID,
  readonly ["equality"],
  readonly string[],
  readonly string[]
> {
  constructor(descriptor: AnyCodecDescriptor) {
    super(descriptor, ltreeArrayDataType);
  }

  async toWire(value: readonly string[], _ctx: CodecCallContext): Promise<readonly string[]> {
    for (const entry of value) {
      assertValidLtree(entry);
    }
    return value;
  }

  async fromWire(wire: readonly string[], _ctx: CodecCallContext): Promise<readonly string[]> {
    return wire;
  }

  toDataTypeValue(value: readonly string[]): DataTypeValue {
    for (const entry of value) {
      assertValidLtree(entry);
    }
    return this.dataTypeValueOf([...value]);
  }

  fromDataTypeValue(value: DataTypeValue): readonly string[] {
    const json = value.value;
    if (!Array.isArray(json)) {
      return [];
    }
    return json.map((entry) => String(entry));
  }
}

export class LtreeArrayDescriptor extends PostgresCodecDescriptor<void> {
  protected override jsonProjection(expression: ProjectionExpr): ProjectionExpr {
    // ltree[] already projects as a JSON string array for fromWire.
    return expression;
  }
  override readonly dataType = ltreeArrayDataType.id;
  override readonly codecId = LTREE_ARRAY_CODEC_ID;
  override readonly traits = ["equality"] as const;
  override readonly paramsSchema = undefined;
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
  column(ltreeArrayDescriptor.factory(), ltreeArrayDescriptor.codecId, undefined);

ltreeArray satisfies ColumnHelperFor<LtreeArrayDescriptor>;
ltreeArray satisfies ColumnHelperForStrict<LtreeArrayDescriptor>;

const codecDescriptorMap = {
  ltree: ltreeDescriptor,
  ltreeArray: ltreeArrayDescriptor,
} as const;

export type CodecTypes = ExtractCodecTypes<typeof codecDescriptorMap>;

export const codecDescriptors = definePostgresCodecs(Object.values(codecDescriptorMap));
