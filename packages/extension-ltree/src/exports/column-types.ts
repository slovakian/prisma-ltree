import type { ColumnTypeDescriptor } from "@prisma-next/framework-components/codec";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "../core/constants";
import { LTREE_ARRAY_NATIVE_TYPE, LTREE_NATIVE_TYPE } from "../core/contract-space-constants";

export function ltree(): ColumnTypeDescriptor {
  return {
    codecId: LTREE_CODEC_ID,
    nativeType: LTREE_NATIVE_TYPE,
  } as const;
}

export function ltreeArray(): ColumnTypeDescriptor {
  return {
    codecId: LTREE_ARRAY_CODEC_ID,
    nativeType: LTREE_ARRAY_NATIVE_TYPE,
  } as const;
}
