import type { SqlRuntimeExtensionDescriptor } from "@prisma/orm-family-sql/runtime";
import { ltreePackMeta, ltreeQueryOperations } from "../core/descriptor-meta";
import { ltreeCodecRegistry } from "../core/registry";

const ltreeRuntimeDescriptor: SqlRuntimeExtensionDescriptor<"postgres"> = {
  kind: "extension" as const,
  id: ltreePackMeta.id,
  version: ltreePackMeta.version,
  familyId: "sql" as const,
  targetId: "postgres" as const,
  types: {
    codecTypes: {
      codecDescriptors: Array.from(ltreeCodecRegistry.values()),
    },
  },
  codecs: () => Array.from(ltreeCodecRegistry.values()),
  queryOperations: () => ltreeQueryOperations(),
  create() {
    return {
      familyId: "sql" as const,
      targetId: "postgres" as const,
    };
  },
};

export { ltreeCodecRegistry };
export default ltreeRuntimeDescriptor;
