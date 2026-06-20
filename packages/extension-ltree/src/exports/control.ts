import type { Contract } from "@prisma-next/contract/types";
import type {
  CodecControlHooks,
  SqlControlExtensionDescriptor,
} from "@prisma-next/family-sql/control";
import { contractSpaceFromJson } from "@prisma-next/migration-tools/spaces";
import type { SqlStorage } from "@prisma-next/sql-contract/types";
import baselineMetadata from "../../migrations/app/20260619T2142_install_ltree/migration.json" with { type: "json" };
import baselineOps from "../../migrations/app/20260619T2142_install_ltree/ops.json" with { type: "json" };
import headRef from "../../migrations/app/refs/head.json" with { type: "json" };
import contractJson from "../contract.json" with { type: "json" };
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "../core/constants";
import { LTREE_SPACE_ID, LTREE_BASELINE_MIGRATION_NAME } from "../core/contract-space-constants";
import { ltreePackMeta, ltreeQueryOperations } from "../core/descriptor-meta";

const ltreeControlPlaneHooks: CodecControlHooks = {
  expandNativeType: ({ nativeType }) => nativeType,
  resolveIdentityValue: () => null,
};

const ltreeContractSpace = contractSpaceFromJson<Contract<SqlStorage>>({
  contractJson,
  migrations: [
    {
      dirName: LTREE_BASELINE_MIGRATION_NAME,
      metadata: baselineMetadata,
      ops: baselineOps,
    },
  ],
  headRef,
});

const ltreeExtensionDescriptor: SqlControlExtensionDescriptor<"postgres"> = {
  ...ltreePackMeta,
  id: LTREE_SPACE_ID,
  contractSpace: ltreeContractSpace,
  types: {
    ...ltreePackMeta.types,
    codecTypes: {
      ...ltreePackMeta.types.codecTypes,
      controlPlaneHooks: {
        [LTREE_CODEC_ID]: ltreeControlPlaneHooks,
        [LTREE_ARRAY_CODEC_ID]: ltreeControlPlaneHooks,
      },
    },
  },
  queryOperations: () => ltreeQueryOperations(),
  create: () => ({
    familyId: "sql" as const,
    targetId: "postgres" as const,
  }),
};

export { ltreeExtensionDescriptor };
export default ltreeExtensionDescriptor;
