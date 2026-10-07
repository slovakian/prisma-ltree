import type { AuthoringTypeNamespace } from "@prisma/orm-framework/components/authoring";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "./constants";

export const ltreeAuthoringTypes = {
  ltree: {
    Ltree: {
      kind: "typeConstructor",
      inferred: true,
      output: {
        codecId: LTREE_CODEC_ID,
      },
    },
    LtreeArray: {
      kind: "typeConstructor",
      inferred: true,
      output: {
        codecId: LTREE_ARRAY_CODEC_ID,
      },
    },
  },
} as const satisfies AuthoringTypeNamespace;
