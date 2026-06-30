import { defineContract } from "@prisma-next/postgres/contract-builder";
import ltree from "prisma-ltree/pack";

// TS-lane contract exercising GiST index authoring through the registered
// `gist` index type. `constraints.index([...], { type: "gist", options: {} })`
// lowers to a `CREATE INDEX … USING gist (…)` once the contract is applied.
export const contract = defineContract(
  {
    extensionPacks: { ltree },
  },
  ({ field, model, type }) => {
    const types = {
      Path: type.ltree.Ltree(),
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
            constraints.index([cols.path], {
              name: "page_path_gist_idx",
              type: "gist",
              options: {},
            }),
            constraints.index([cols.breadcrumbs], {
              name: "page_breadcrumbs_gist_idx",
              type: "gist",
              options: {},
            }),
          ],
        })),
      },
    };
  },
);

export default contract;
