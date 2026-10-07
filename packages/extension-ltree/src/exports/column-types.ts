import type { ColumnTypeDescriptor } from "@prisma/orm-framework/components/codec";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "../core/constants";

export function ltree(): ColumnTypeDescriptor {
  return {
    codecId: LTREE_CODEC_ID,
  } as const;
}

export function ltreeArray(): ColumnTypeDescriptor {
  return {
    codecId: LTREE_ARRAY_CODEC_ID,
  } as const;
}
