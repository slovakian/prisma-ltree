export const homeCodeBlocks = [
  {
    id: "config",
    code: `// prisma.config.ts
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.ts",
    extensions: [ltree],
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});`,
    lang: "typescript",
  },
  {
    id: "contract",
    code: `// TypeScript lane. PSL uses ltree.Ltree() in contract.prisma
import { defineContract } from "@prisma/orm-postgres/contract-builder";
import { ltree } from "prisma-ltree/column-types";
import ltreePack from "prisma-ltree/pack";

export const contract = defineContract(
  {
    extensions: { ltree: ltreePack },
  },
  ({ field, model }) => ({
    models: {
      Category: model("Category", {
        fields: {
          id: field.id.int(),
          name: field.string(),
          path: field.column(ltree()),
        },
      }).sql({ table: "category" }),
    },
  }),
);`,
    lang: "typescript",
  },
  {
    id: "query",
    code: `// Find every category under "electronics"
import { db } from "./prisma/db";

const rows = await db.orm.Category.where((c) =>
  c.path.isDescendantOf("electronics"),
)
  .select("id", "path")
  .all();`,
    lang: "typescript",
  },
] as const;

export type HomeCodeBlockId = (typeof homeCodeBlocks)[number]["id"];
