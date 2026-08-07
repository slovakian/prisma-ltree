import "dotenv/config";
import { defineConfig } from "@prisma/orm-postgres/config";
import ltree from "prisma-ltree/control";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required (copy .env.example to .env)");
}

export default defineConfig({
  contract: "./src/prisma/contract.prisma",
  // The ltree extension contributes its baseline `CREATE EXTENSION ltree`
  // migration and the ltree.* authoring namespace used in contract.prisma.
  extensions: [ltree],
  db: { connection: databaseUrl },
});
