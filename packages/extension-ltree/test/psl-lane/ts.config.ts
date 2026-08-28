import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./contract.ts",
    extensions: [ltree],
  }),
});
