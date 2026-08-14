import { defineContract } from "@prisma/orm-postgres/contract-builder";
import ltree from "prisma-ltree/pack";

export const contract = defineContract(
  {
    extensions: { ltree },
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
              type: "gist",
              options: {},
              map: "page_path_gist_idx",
            }),
            constraints.index([cols.breadcrumbs], {
              type: "gist",
              options: {},
              map: "page_breadcrumbs_gist_idx",
            }),
          ],
        })),
      },
    };
  },
);

export default contract;
