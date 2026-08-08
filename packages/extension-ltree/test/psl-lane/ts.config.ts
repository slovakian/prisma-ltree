import { defineConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  contract: "./contract.ts",
  extensions: [ltree],
});
