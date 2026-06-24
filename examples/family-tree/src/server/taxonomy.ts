import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import type { Char } from "@prisma-next/target-postgres/codec-types";
import { db } from "../prisma/db.server";
import { validateTaxonLabel } from "../lib/taxon-label";

/**
 * Client-facing taxonomy server functions.
 *
 * `createServerFn` handlers run only on the server; when this module is imported
 * by client components the TanStack Start compiler replaces the handler bodies
 * with RPC stubs, so the Postgres runtime imports above never reach the browser.
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

export async function getTaxaHandler(): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.orderBy((t) => t.path.asc()).all();
}

export const getTaxa = createServerFn({ method: "GET" }).handler(getTaxaHandler);

export async function getLineageHandler(path: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.isAncestorOf(path))
    .orderBy((t) => t.path.asc())
    .all();
}

export const getLineage = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data }) => getLineageHandler(data));

export async function getSubtreeHandler(path: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.isDescendantOf(path))
    .orderBy((t) => t.path.asc())
    .all();
}

export const getSubtree = createServerFn({ method: "POST" })
  .validator((path: string) => path)
  .handler(async ({ data }) => getSubtreeHandler(data));

export async function searchLqueryHandler(pattern: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.matchesLquery(pattern))
    .orderBy((t) => t.path.asc())
    .all();
}

export const searchLquery = createServerFn({ method: "POST" })
  .validator((pattern: string) => pattern)
  .handler(async ({ data }) => searchLqueryHandler(data));

export async function searchLqueryArrayHandler(patterns: string[]): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.matchesLqueryArray(patterns as never))
    .orderBy((t) => t.path.asc())
    .all();
}

export const searchLqueryArray = createServerFn({ method: "POST" })
  .validator((patterns: string[]) => patterns)
  .handler(async ({ data }) => searchLqueryArrayHandler(data));

export async function searchLtxtqueryHandler(query: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.matchesLtxtquery(query))
    .orderBy((t) => t.path.asc())
    .all();
}

export const searchLtxtquery = createServerFn({ method: "POST" })
  .validator((query: string) => query)
  .handler(async ({ data }) => searchLtxtqueryHandler(data));

export async function getGenerationHandler(depth: number): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.nlevel().eq(depth))
    .orderBy((t) => t.path.asc())
    .all();
}

export const getGeneration = createServerFn({ method: "POST" })
  .validator((depth: number) => depth)
  .handler(async ({ data }) => getGenerationHandler(data));

export async function lineageSliceHandler(
  path: string,
  from: number,
  to?: number,
): Promise<string | null> {
  const plan = db.sql.public.taxon
    .select("slice", (f, fns) =>
      to === undefined ? fns.subpath(f.path, from) : fns.subpath(f.path, from, to),
    )
    .where((f, fns) => fns.eq(f.path, path))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  return (rows[0] as { slice: string | null } | undefined)?.slice ?? null;
}

export const lineageSlice = createServerFn({ method: "POST" })
  .validator((input: { path: string; from: number; to?: number }) => input)
  .handler(async ({ data }) => lineageSliceHandler(data.path, data.from, data.to));

export async function lineageSubtreeHandler(
  path: string,
  start: number,
  end: number,
): Promise<string | null> {
  const plan = db.sql.public.taxon
    .select("slice", (f, fns) => fns.subltree(f.path, start, end))
    .where((f, fns) => fns.eq(f.path, path))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  return (rows[0] as { slice: string | null } | undefined)?.slice ?? null;
}

export const lineageSubtree = createServerFn({ method: "POST" })
  .validator((input: { path: string; start: number; end: number }) => input)
  .handler(async ({ data }) => lineageSubtreeHandler(data.path, data.start, data.end));

export async function indexOfBranchHandler(a: string, b: string, offset?: number): Promise<number> {
  const plan = db.sql.public.taxon
    .select("idx", (f, fns) =>
      offset === undefined ? fns.indexOf(f.path, b) : fns.indexOf(f.path, b, offset),
    )
    .where((f, fns) => fns.eq(f.path, a))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  return (rows[0] as { idx: number } | undefined)?.idx ?? -1;
}

export const indexOfBranch = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string; offset?: number }) => input)
  .handler(async ({ data }) => indexOfBranchHandler(data.a, data.b, data.offset));

export async function getMrcaViaLcaHandler(a: string, b: string): Promise<TaxonRow | null> {
  const plan = db.sql.public.taxon
    .select("mrca", (f, fns) => fns.lca(f.path, b))
    .where((f, fns) => fns.eq(f.path, a))
    .limit(1)
    .build();
  const rows = await db.runtime().execute(plan);
  const mrcaPath = (rows[0] as { mrca: string | null } | undefined)?.mrca;
  if (!mrcaPath) return null;
  return db.orm.public.Taxon.first({ path: mrcaPath });
}

export const getMrcaViaLca = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(async ({ data }) => getMrcaViaLcaHandler(data.a, data.b));

export async function getMrcaViaOpsHandler(a: string, b: string): Promise<TaxonRow | null> {
  const rows = await db.orm.public.Taxon.where((t) => t.path.isAncestorOf(a))
    .where((t) => t.path.isAncestorOf(b))
    .orderBy((t) => t.path.nlevel().desc())
    .take(1)
    .all();
  return rows[0] ?? null;
}

export const getMrcaViaOps = createServerFn({ method: "POST" })
  .validator((input: { a: string; b: string }) => input)
  .handler(async ({ data }) => getMrcaViaOpsHandler(data.a, data.b));

export type GraftInput = {
  parentPath: string;
  label: string;
  commonName?: string | null;
  rank?: string;
  extinct?: boolean;
};

export async function graftTaxonHandler(input: GraftInput): Promise<TaxonRow> {
  // Re-validate server-side: the client form blocks invalid labels, but the
  // server is the trust boundary — never insert a label the rule rejects.
  const labelError = validateTaxonLabel(input.label);
  if (labelError) {
    throw new Error(labelError);
  }
  const pathPlan = db.sql.public.taxon
    .select("newPath", (f, fns) => fns.concatText(f.path, input.label))
    .where((f, fns) => fns.eq(f.path, input.parentPath))
    .limit(1)
    .build();
  const pathRows = await db.runtime().execute(pathPlan);
  const newPath = (pathRows[0] as { newPath: string | null } | undefined)?.newPath;
  if (!newPath) {
    throw new Error(`Parent taxon not found: ${input.parentPath}`);
  }
  return db.orm.public.Taxon.create({
    id: randomUUID() as Char<36>,
    path: newPath,
    scientificName: input.label.replace(/_/g, " "),
    commonName: input.commonName?.trim() || null,
    rank: input.rank?.trim() || "species",
    // `extinct` is set explicitly here — never via a contract `@default`, which
    // the pinned CLI emits as a malformed boolean literal that `db:plan` rejects.
    extinct: input.extinct ?? false,
    maOrigin: null,
    maExtinct: null,
    // Empty `wiki_url` is the sentinel that marks a row as visitor-grafted (every
    // seeded taxon carries a real Wikipedia URL); `pruneUserTaxa` deletes
    // exactly these rows to restore the seeded state.
    wikiUrl: "",
    thumbnailUrl: null,
  });
}

export const graftTaxon = createServerFn({ method: "POST" })
  .validator((input: GraftInput) => input)
  .handler(async ({ data }) => graftTaxonHandler(data));

export async function pruneUserTaxaHandler(): Promise<number> {
  const all = await db.orm.public.Taxon.orderBy((t) => t.path.asc()).all();
  const grafted = all.filter((t) => t.wikiUrl === "");
  if (grafted.length === 0) return 0;
  const plan = db.sql.public.taxon
    .delete()
    .where((f, fns) => fns.eq(f.wiki_url, ""))
    .build();
  await db.runtime().execute(plan);
  return grafted.length;
}

export const pruneUserTaxa = createServerFn({ method: "POST" }).handler(pruneUserTaxaHandler);
