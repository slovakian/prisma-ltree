import { PGlite } from "@electric-sql/pglite";
import { ltree as ltreeContrib } from "@electric-sql/pglite/contrib/ltree";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

/**
 * GiST indexes on `ltree` / `ltree[]` columns: the DDL shape prisma-next emits
 * for `type: "gist"` is `CREATE INDEX … USING gist (…)`.
 */
describe("ltree GiST indexes — PGlite DDL", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({ extensions: { ltree: ltreeContrib } });
    await db.exec("CREATE EXTENSION IF NOT EXISTS ltree;");
    await db.exec(`
      CREATE TABLE page (
        id text PRIMARY KEY,
        path ltree NOT NULL,
        breadcrumbs ltree[] NOT NULL
      );
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it("creates a GiST index on an ltree column", async () => {
    await db.exec('CREATE INDEX "page_path_gist_idx" ON "public"."page" USING "gist" ("path")');

    await db.exec(`
      INSERT INTO page (id, path, breadcrumbs) VALUES
        ('1', 'Top.Science.Astronomy', ARRAY['Top.Engineering']::ltree[]);
    `);

    const explain = await db.query<{ "QUERY PLAN": string }>(
      "EXPLAIN SELECT id FROM page WHERE path <@ 'Top.Science'",
    );
    const plan = explain.rows.map((row) => row["QUERY PLAN"]).join("\n");
    expect(plan).toMatch(/page_path_gist_idx|Bitmap Index Scan|Index Scan/i);
  });

  it("creates a GiST index on an ltree[] column", async () => {
    await db.exec(
      'CREATE INDEX "page_breadcrumbs_gist_idx" ON "public"."page" USING "gist" ("breadcrumbs")',
    );

    const indexes = await db.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'page' AND indexname = 'page_breadcrumbs_gist_idx'",
    );
    expect(indexes.rows).toHaveLength(1);

    await db.exec(`
      INSERT INTO page (id, path, breadcrumbs) VALUES
        ('2', 'Top.Science', ARRAY['Top', 'Top.Science']::ltree[]);
    `);

    const result = await db.query<{ id: string }>(
      "SELECT id FROM page WHERE 'Top.Science' <@ breadcrumbs",
    );
    expect(result.rows).toEqual([{ id: "2" }]);
  });
});
