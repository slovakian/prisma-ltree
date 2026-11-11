import type { Contract } from "@prisma/orm-framework/contract/types";
import type {
  CodecControlHooks,
  SqlControlExtensionDescriptor,
} from "@prisma/orm-family-sql/family/control";
import { contractSpaceFromJson } from "@prisma/orm-toolchain/migration-tools/spaces";
import type { SqlStorage } from "@prisma/orm-family-sql/contract/types";
import baselineMetadata from "../../migrations/20260619T2142_install_ltree/migration.json" with { type: "json" };
import baselineOps from "../../migrations/20260619T2142_install_ltree/ops.json" with { type: "json" };
import createMetadata from "../../migrations/20261111T1904_create_ltree_extension/migration.json" with { type: "json" };
import createOps from "../../migrations/20261111T1904_create_ltree_extension/ops.json" with { type: "json" };
import declareMetadata from "../../migrations/20261111T1905_declare_ltree_extension/migration.json" with { type: "json" };
import declareOps from "../../migrations/20261111T1905_declare_ltree_extension/ops.json" with { type: "json" };
import searchPathMetadata from "../../migrations/20261111T1908_find_ltree_on_search_path/migration.json" with { type: "json" };
import searchPathOps from "../../migrations/20261111T1908_find_ltree_on_search_path/ops.json" with { type: "json" };
import searchPathInstallMetadata from "../../migrations/20261111T1908_install_ltree_on_search_path/migration.json" with { type: "json" };
import searchPathInstallOps from "../../migrations/20261111T1908_install_ltree_on_search_path/ops.json" with { type: "json" };
import headRef from "../../migrations/refs/head.json" with { type: "json" };
import contractJson from "../contract.json" with { type: "json" };
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "../core/constants";
import {
  LTREE_BASELINE_MIGRATION_NAME,
  LTREE_CREATE_EXTENSION_MIGRATION_NAME,
  LTREE_DECLARE_EXTENSION_MIGRATION_NAME,
  LTREE_SEARCH_PATH_INSTALL_MIGRATION_NAME,
  LTREE_SEARCH_PATH_MIGRATION_NAME,
  LTREE_SPACE_ID,
} from "../core/contract-space-constants";
import { ltreePackMeta, ltreeQueryOperations } from "../core/descriptor-meta";

const ltreeControlPlaneHooks: CodecControlHooks = {
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
    {
      dirName: LTREE_DECLARE_EXTENSION_MIGRATION_NAME,
      metadata: declareMetadata,
      ops: declareOps,
    },
    {
      dirName: LTREE_CREATE_EXTENSION_MIGRATION_NAME,
      metadata: createMetadata,
      ops: createOps,
    },
    {
      dirName: LTREE_SEARCH_PATH_MIGRATION_NAME,
      metadata: searchPathMetadata,
      ops: searchPathOps,
    },
    {
      dirName: LTREE_SEARCH_PATH_INSTALL_MIGRATION_NAME,
      metadata: searchPathInstallMetadata,
      ops: searchPathInstallOps,
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
