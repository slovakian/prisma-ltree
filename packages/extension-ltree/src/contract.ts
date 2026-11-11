import { assembleDataTypes } from "@prisma/orm-framework/components/codec";
import { defineContract } from "@prisma/orm-postgres/contract-builder";
import { assemblePostgresCodecRegistryWithBuiltins } from "@prisma/orm-target-postgres/target/codecs";
import { postgresDataTypes } from "@prisma/orm-target-postgres/target/data-types";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "./core/constants";
import { LTREE_ARRAY_STORAGE_TYPE, LTREE_NATIVE_TYPE } from "./core/contract-space-constants";
import { codecDescriptors } from "./core/codecs";
import { ltreeDataTypes } from "./core/data-types";

const dataTypeLookup = assembleDataTypes([
  { id: "postgres", dataTypes: postgresDataTypes },
  { id: "ltree", dataTypes: ltreeDataTypes },
]).lookup;
const codecLookup = assemblePostgresCodecRegistryWithBuiltins(
  [{ types: { codecTypes: { codecDescriptors: [...codecDescriptors] } } }],
  dataTypeLookup,
);

export const contract = defineContract({ codecLookup, dataTypeLookup }, () => ({
  databaseTypes: {
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
