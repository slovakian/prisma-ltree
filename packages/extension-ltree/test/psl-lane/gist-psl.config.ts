import { defineConfig } from "@prisma-next/postgres/config";
import ltree from "prisma-ltree/control";

export default defineConfig({
  contract: "./gist.contract.prisma",
  extensions: [ltree],
});
