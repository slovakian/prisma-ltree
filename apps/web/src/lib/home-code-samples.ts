export const homeCodeBlocks = [
  {
    id: "config",
    code: `// prisma-next.config.ts
import { defineConfig } from "@prisma-next/cli/config-types";
import postgresAdapter from "@prisma-next/adapter-postgres/control";
import sql from "@prisma-next/family-sql/control";
import postgres from "@prisma-next/target-postgres/control";
import ltree from "prisma-ltree/control";

export default defineConfig({
  family: sql,
  target: postgres,
  adapter: postgresAdapter,
  extensionPacks: [ltree],
});`,
    lang: "typescript",
  },
  {
    id: "contract",
    code: `// TypeScript lane — PSL uses ltree.Ltree() in contract.prisma
import { int4Column, textColumn } from "@prisma-next/adapter-postgres/column-types";
import { defineContract, field, model } from "@prisma-next/sql-contract-ts/contract-builder";
import { ltree } from "prisma-ltree/column-types";
import ltreePack from "prisma-ltree/pack";

export const contract = defineContract({
  family: sqlFamily,
  target: postgres,
  extensionPacks: { ltree: ltreePack },
  models: {
    Category: model("Category", {
      fields: {
        id: field.column(int4Column).id(),
        name: field.column(textColumn),
        path: field.column(ltree()),
      },
    }).sql({ table: "category" }),
  },
});`,
    lang: "typescript",
  },
  {
    id: "query",
    code: `// Find every category under "electronics"
import { param } from "@prisma-next/sql-query/param";
import { db } from "./prisma/db";

const category = db.schema.tables.category;

const plan = db.sql
  .from(category)
  .select({ id: category.columns.id, path: category.columns.path })
  .where(category.columns.path.isDescendantOf(param("prefix")))
  .build({ params: { prefix: "electronics" } });

const rows = await db.runtime().execute(plan);`,
    lang: "typescript",
  },
] as const;

export type HomeCodeBlockId = (typeof homeCodeBlocks)[number]["id"];
