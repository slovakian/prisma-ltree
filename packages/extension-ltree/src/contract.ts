import { defineContract } from "@prisma-next/postgres/contract-builder";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "./core/constants";
import {
  LTREE_ARRAY_STORAGE_TYPE,
  LTREE_ARRAY_NATIVE_TYPE,
  LTREE_NATIVE_TYPE,
} from "./core/contract-space-constants";

export const contract = defineContract({}, () => ({
  types: {
    [LTREE_NATIVE_TYPE]: {
      kind: "codec-instance",
      codecId: LTREE_CODEC_ID,
      nativeType: LTREE_NATIVE_TYPE,
      typeParams: {},
    },
    [LTREE_ARRAY_STORAGE_TYPE]: {
      kind: "codec-instance",
      codecId: LTREE_ARRAY_CODEC_ID,
      nativeType: LTREE_ARRAY_NATIVE_TYPE,
      typeParams: {},
    },
  },
  models: {},
}));

export default contract;
