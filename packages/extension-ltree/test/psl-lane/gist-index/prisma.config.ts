import { defineConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  orm: ormConfig({
    contract: "./contract.prisma",
    extensions: [ltree],
  }),
});
