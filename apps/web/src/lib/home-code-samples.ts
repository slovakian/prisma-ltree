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
    code: `// Add an ltree column to a model
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
    id: "feature.hierarchy",
    code: `// Every category under "Top.Science"
const plan = sql
  .from(tables.category)
  .select({ id: tables.category.columns.id })
  .where(
    tables.category.columns.path.isDescendantOf(param("prefix")),
  )
  .build({ params: { prefix: "Top.Science" } });`,
    lang: "typescript",
  },
  {
    id: "feature.pattern-matching",
    code: `// Paths like "Top.*.Astronomy" at any depth
sql
  .from(tables.category)
  .where(
    tables.category.columns.path.matchesLquery(
      param("pattern"),
    ),
  )
  .build({ params: { pattern: "Top.*.Astronomy" } });`,
    lang: "typescript",
  },
  {
    id: "feature.scalar-functions",
    code: `// Project the depth of each path
sql
  .from(tables.category)
  .select({
    id: tables.category.columns.id,
    depth: tables.category.columns.path.nlevel(),
  })
  .build({ params: {} });`,
    lang: "typescript",
  },
  {
    id: "feature.concat-convert",
    code: `// Append a child label to an existing path
sql
  .from(tables.category)
  .select({
    child: tables.category.columns.path.concatText(
      param("label"),
    ),
  })
  .build({ params: { label: "Astronomy" } });`,
    lang: "typescript",
  },
  {
    id: "feature.array-first-match",
    code: `// First stored path that is a descendant of the arg
sql
  .from(tables.category)
  .select({
    match: tables.node.columns.paths.firstDescendantOf(
      param("prefix"),
    ),
  })
  .build({ params: { prefix: "Top.Science" } });`,
    lang: "typescript",
  },
] as const;

export type HomeCodeBlockId = (typeof homeCodeBlocks)[number]["id"];
