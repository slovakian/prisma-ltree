import { randomUUID } from "node:crypto";
import type { Char } from "@prisma/orm-target-postgres/target/codec-types";
import { db } from "../prisma/db.server";
import { validateTaxonLabel } from "../lib/taxon-label";
import type { TaxonRow } from "./taxonomy";

/**
 * Server-only taxonomy handler implementations.
 *
 * The `.server.ts` suffix opts this module into TanStack Start's import
 * protection — it can never be bundled into the client. It owns the Postgres
 * runtime (`db`) and every query handler. `taxonomy.functions.ts` imports these
 * handlers inside `createServerFn().handler()` callbacks, which the Start
 * compiler extracts to a server-side provider module — so the `db` import and
 * these handlers never reach the client bundle.
 */

export type GraftInput = {
  parentPath: string;
  label: string;
  commonName?: string | null;
  rank?: string;
  extinct?: boolean;
};

export async function getTaxaHandler(): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.orderBy((t) => t.path.asc()).all();
}

export async function getLineageHandler(path: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.isAncestorOf(path))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function getSubtreeHandler(path: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.isDescendantOf(path))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function searchLqueryHandler(pattern: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.matchesLquery(pattern))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function searchLqueryArrayHandler(patterns: string[]): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.matchesLqueryArray(patterns as never))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function searchLtxtqueryHandler(query: string): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.matchesLtxtquery(query))
    .orderBy((t) => t.path.asc())
    .all();
}

export async function getGenerationHandler(depth: number): Promise<TaxonRow[]> {
  return db.orm.public.Taxon.where((t) => t.path.nlevel().eq(depth))
    .orderBy((t) => t.path.asc())
    .all();
}

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

export async function getMrcaViaOpsHandler(a: string, b: string): Promise<TaxonRow | null> {
  const rows = await db.orm.public.Taxon.where((t) => t.path.isAncestorOf(a))
    .where((t) => t.path.isAncestorOf(b))
    .orderBy((t) => t.path.nlevel().desc())
    .take(1)
    .all();
  return rows[0] ?? null;
}

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
