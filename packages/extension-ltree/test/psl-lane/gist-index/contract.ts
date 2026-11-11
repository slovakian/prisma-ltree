import { defineContract } from "@prisma/orm-postgres/contract-builder";
import type { Temporal } from "temporal-spec";
import ltree from "prisma-ltree/pack";

export type { Temporal };

export const contract = defineContract(
  {
    extensions: { ltree },
  },
  ({ field, model, type, gen }) => {
    const Path = field.column(type.ltree.Ltree());
    const Paths = field.column(type.ltree.LtreeArray());

    const Page = model("Page", {
      fields: {
        id: field.column(type.Char(36)).id().onCreate(gen.uuid()),
        path: Path,
        breadcrumbs: Paths,
      },
    });

    return {
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
