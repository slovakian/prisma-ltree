import { defineContract } from "@prisma/orm-postgres/contract-builder";
import type { Temporal } from "temporal-spec";
import ltree from "prisma-ltree/pack";

export type { Temporal };

// TS-lane twin of contract.prisma. The `ltree` namespace on `type` is the same
// authoring surface the PSL lane exposes as `ltree.Ltree()` / `ltree.LtreeArray()`,
// so this contract must emit IR identical to the PSL fixture.
export const contract = defineContract(
  {
    extensions: { ltree },
  },
  ({ field, model, type, gen }) => {
    // Single ltree path. Resolves to codec `pg/ltree@1`, data type `ltree/ltree`.
    const Path = field.column(type.ltree.Ltree());
    // ltree[] array. Resolves to codec `pg/ltree-array@1`, data type `ltree/ltree-array`.
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
        Page: Page.sql({
          table: "page",
        }),
      },
    };
  },
);

export default contract;
