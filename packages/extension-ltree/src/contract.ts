import { defineContract } from "@prisma/orm-postgres/contract-builder";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "./core/constants";
import { LTREE_ARRAY_STORAGE_TYPE, LTREE_NATIVE_TYPE } from "./core/contract-space-constants";

export const contract = defineContract({}, () => ({
  types: {
    [LTREE_NATIVE_TYPE]: {
      kind: "codec-instance",
      codecId: LTREE_CODEC_ID,
      typeParams: {},
    },
    [LTREE_ARRAY_STORAGE_TYPE]: {
      kind: "codec-instance",
      codecId: LTREE_ARRAY_CODEC_ID,
      typeParams: {},
    },
  },
  models: {},
}));

export default contract;
