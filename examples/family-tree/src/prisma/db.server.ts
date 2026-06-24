import "dotenv/config";
import postgres from "@prisma-next/postgres/runtime";
import ltree from "prisma-ltree/runtime";
import contractJson from "./contract.json" with { type: "json" };
import type { Contract } from "./contract.d";

/**
 * The typed prisma-next client for this app.
 *
 * The `.server.ts` suffix is a TanStack Start convention: this module — and the
 * Postgres runtime it pulls in — is guaranteed to stay on the server and is
 * never bundled into the client.
 *
 * `extensions: [ltree]` registers the prisma-ltree runtime: the ltree codec and
 * the query operators (isAncestorOf, isDescendantOf, matchesLquery, nlevel, …)
 * that surface as methods on the `path` column in `db.orm`.
 *
 * Passing `url` at construction makes the client self-connecting: the pool is
 * created lazily and the connection opens on the first query, so callers just
 * use `db.orm.*` / `db.sql.*` directly — no explicit connect step. The client
 * owns the pool for the process lifetime; `closeDb()` ends it (test teardown).
 */
const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env");
}

export const db = postgres<Contract>({
  contractJson,
  extensions: [ltree],
  url: databaseUrl,
});

/** Close the Postgres connection. Intended for test/script teardown. */
export async function closeDb(): Promise<void> {
  await db.close();
}
