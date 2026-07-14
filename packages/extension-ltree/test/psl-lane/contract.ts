import { defineContract } from "@prisma-next/postgres/contract-builder";
import ltree from "prisma-ltree/pack";

// TS-lane twin of contract.prisma. The `ltree` namespace on `type` is the same
// authoring surface the PSL lane exposes as `ltree.Ltree()` / `ltree.LtreeArray()`,
// so this contract must emit IR identical to the PSL fixture.
export const contract = defineContract(
  {
    extensionPacks: { ltree },
  },
  ({ field, model, type }) => {
    const types = {
      // Single ltree path. Resolves to codec `pg/ltree@1`, native type `ltree`.
      Path: type.ltree.Ltree(),
      // ltree[] array. Resolves to codec `pg/ltree-array@1`, native type `ltree[]`.
      Paths: type.ltree.LtreeArray(),
    } as const;

    const Page = model("Page", {
      fields: {
        id: field.id.uuidv4String(),
        path: field.namedType(types.Path),
        breadcrumbs: field.namedType(types.Paths),
      },
    });

    return {
      types,
      models: {
        Page: Page.sql(({ cols, constraints }) => ({
          table: "page",
          indexes: [
            constraints.index([cols.breadcrumbs], {
              type: "gist",
              options: {},
              name: "page_breadcrumbs_gist_idx",
            }),
            constraints.index([cols.path], {
              type: "gist",
              options: {},
              name: "page_path_gist_idx",
            }),
          ],
        })),
      },
    };
  },
);

export default contract;
