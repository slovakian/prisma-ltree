import type { Char } from "@prisma/orm-target-postgres/target/codec-types";

/**
 * Shared taxonomy types.
 *
 * This module is client-safe: it exports only types (which erase at runtime)
 * and carries no server-only imports. Client components and server functions
 * alike can import `TaxonRow` without dragging in the Postgres runtime.
 *
 * Server-only handler implementations live in `taxonomy.server.ts`; the
 * `createServerFn` RPC wrappers live in `taxonomy.functions.ts`.
 */

export type TaxonRow = {
  id: Char<36>;
  path: string;
  scientificName: string;
  commonName: string | null;
  rank: string;
  extinct: boolean;
  maOrigin: number | null;
  maExtinct: number | null;
  wikiUrl: string;
  thumbnailUrl: string | null;
};
