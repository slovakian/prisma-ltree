import postgresAdapter from "@prisma/orm-target-postgres/adapter/control";
import { defineConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-toolchain/cli/config-types";
import sql from "@prisma/orm-family-sql/family/control";
import { typescriptContract } from "@prisma/orm-family-sql/contract-ts/config-types";
import postgres from "@prisma/orm-target-postgres/target/control";
import { contract } from "./src/contract";

export default defineConfig({
  orm: ormConfig({
    family: sql,
    target: postgres,
    adapter: postgresAdapter,
    contract: typescriptContract(contract, "src/contract.json"),
    migrations: {
      dir: "migrations",
    },
  }),
});
