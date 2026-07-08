import postgresAdapter from "@prisma-next/adapter-postgres/control";
import { defineConfig as coreDefineConfig } from "@prisma-next/config/config-types";
import postgresDriver from "@prisma-next/driver-postgres/control";
import sql from "@prisma-next/family-sql/control";
import { prismaContract } from "@prisma-next/sql-contract-psl/provider";
import postgres from "@prisma-next/target-postgres/control";
import postgresPackRef from "@prisma-next/target-postgres/pack";
import { postgresCreateNamespace } from "@prisma-next/target-postgres/types";
import ltree from "prisma-ltree/control";

// PSL emit needs `composedExtensionPackRefs` so pack `indexTypes` (gist) register
// during validation. Postgres `defineConfig({ contract: "./contract.prisma" })`
// does not wire this yet — see docs/decisions/ADR-006-gist-index-parity.md.
export default coreDefineConfig({
  family: sql,
  target: postgres,
  adapter: postgresAdapter,
  driver: postgresDriver,
  extensionPacks: [ltree],
  contract: prismaContract("./contract.prisma", {
    output: "./contract.json",
    target: postgresPackRef,
    createNamespace: postgresCreateNamespace,
    composedExtensionPackRefs: [ltree],
  }),
});
