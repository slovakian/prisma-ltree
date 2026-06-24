/**
 * Seed the Catarrhini-rooted phylogenetic tree.
 *
 * Prerequisites: `pnpm db:up && pnpm emit && pnpm db:init`, with DATABASE_URL
 * set (copy `.env.example` to `.env`). Run with `pnpm seed`.
 *
 * Beyond inserting the curated datasheet from `src/seed-data`, this script
 * resolves a Wikipedia thumbnail URL for each taxon's `wiki_url` article via
 * the Wikipedia REST `page/summary` endpoint (which surfaces `thumbnail.source`)
 * and caches it on the row. Wikipedia network failures are logged and result in
 * a `NULL` `thumbnail_url` so seeding remains idempotent and offline-tolerant;
 * the UI renders a clade-glyph placeholder for null thumbnails.
 *
 * The fetch uses a short retry/backoff so transient 429s do not abort the whole
 * seed. Re-running `pnpm seed` after a `db:drop && db:init` re-resolves every
 * thumbnail from scratch (we never trust cached values across runs).
 */
import "dotenv/config";
import { closeDb, connectDb, db } from "../src/prisma/db";
import { taxa } from "../src/seed-data";

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is required (copy .env.example to .env)");
  }

  await connectDb();

  // Taxon authoring-style fields (camelCase) are mapped to snake_case
  // columns via `@map` in contract.prisma. `db.sql.*.insert()` consumes the
  // raw column names, so translate one to the other here.
  const rows = await Promise.all(
    taxa.map(async (t) => ({
      id: t.id,
      path: t.path,
      scientific_name: t.scientificName,
      common_name: t.commonName,
      rank: t.rank,
      extinct: t.extinct,
      ma_origin: t.maOrigin,
      ma_extinct: t.maExtinct,
      wiki_url: t.wikiUrl,
      thumbnail_url: await resolveThumbnail(t.wikiUrl),
    })),
  );

  try {
    await db.runtime().execute(db.sql.public.taxon.insert(rows).build());
    const withThumb = rows.filter((r) => r.thumbnail_url !== null).length;
    console.log(`Seeded ${rows.length} taxa (${withThumb} with thumbnails)`);
  } finally {
    await closeDb();
  }
}

/**
 * Resolve a thumbnail URL for a Wikipedia article via the REST summary endpoint.
 * Returns `null` when the article has no page image, when the network call fails
 * after retries, or when the response is unexpected. Never throws.
 */
async function resolveThumbnail(wikiUrl: string): Promise<string | null> {
  const title = extractWikiTitle(wikiUrl);
  if (!title) return null;

  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent": "prisma-ltree-example/1.0 (https://github.com/slovakian/prisma-ltree)",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await backoff(attempt);
        continue;
      }
      if (!res.ok) {
        console.warn(`Wikipedia REST ${res.status} for ${title} — thumbnail left null`);
        return null;
      }
      const body = (await res.json()) as { thumbnail?: { source?: string } } | null;
      return body?.thumbnail?.source ?? null;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.warn(`Thumbnail fetch failed for ${title}: ${(err as Error).message}`);
        return null;
      }
      await backoff(attempt);
    }
  }
  return null;
}

function extractWikiTitle(wikiUrl: string): string | null {
  try {
    const u = new URL(wikiUrl);
    if (!u.hostname.endsWith("wikipedia.org")) return null;
    const title = u.pathname.split("/wiki/")[1];
    if (!title) return null;
    return decodeURIComponent(title).replace(/_/g, " ");
  } catch {
    return null;
  }
}

function backoff(attempt: number): Promise<void> {
  const ms = 250 * 2 ** (attempt - 1);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("Error seeding database:", error);
  process.exitCode = 1;
});
