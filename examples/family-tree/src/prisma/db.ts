import "dotenv/config";
import postgres from "@prisma-next/postgres/runtime";
import type { Runtime } from "@prisma-next/sql-runtime";
import ltree from "prisma-ltree/runtime";
import contractJson from "./contract.json" with { type: "json" };
import type { Contract } from "./contract.d";

/**
 * The typed prisma-next client for this app.
 *
 * `extensions: [ltree]` registers the prisma-ltree runtime: the ltree codec and
 * the query operators (isAncestorOf, isDescendantOf, matchesLquery, nlevel, …)
 * that surface as methods on the `path` column in `db.orm`.
 *
 * This example runs only in local development, so we use the Node Postgres
 * runtime directly and keep one connection open for the process lifetime.
 */
export const db = postgres<Contract>({ contractJson, extensions: [ltree] });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env");
}

let connectPromise: Promise<Runtime> | undefined;

/** Open the Postgres connection once; subsequent calls are no-ops. */
export async function connectDb(): Promise<void> {
  if (!connectPromise) {
    connectPromise = db.connect({ url: databaseUrl as string }).catch((error) => {
      connectPromise = undefined;
      throw error;
    });
  }
  await connectPromise;
}

/** Close the Postgres connection. Intended for test teardown. */
export async function closeDb(): Promise<void> {
  if (connectPromise) {
    const runtime = await connectPromise;
    await runtime.close();
    connectPromise = undefined;
  }
}
