/**
 * Reset the database to a clean slate: drop the app schema and the Prisma 8
 * contract bookkeeping schema. Run with `pnpm db:drop`, then re-run
 * `pnpm db:init && pnpm seed`.
 */
import "dotenv/config";
import pg from "pg";

async function dropDatabase() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is required (copy .env.example to .env)");
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("DROP SCHEMA IF EXISTS prisma_contract CASCADE");
    console.log("✔ Database reset (public + prisma_contract schemas dropped)");
  } finally {
    await client.end();
  }
}

dropDatabase().catch((error) => {
  console.error("Error resetting database:", error);
  process.exitCode = 1;
});
