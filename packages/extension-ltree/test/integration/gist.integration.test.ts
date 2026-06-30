import { PGlite } from "@electric-sql/pglite";
import { ltree as ltreeContrib } from "@electric-sql/pglite/contrib/ltree";
import {
  type AnyExpression,
  BinaryExpr,
  ColumnRef,
  OrderByItem,
  ParamRef,
  ProjectionItem,
  SelectAst,
  TableSource,
} from "@prisma-next/sql-relational-core/ast";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import ltreeRuntimeDescriptor from "../../src/exports/runtime";
import { createComposedPostgresAdapter } from "../helpers/composed-adapter";
import {
  createLtreeContract,
  ltreeArrayColumn,
  ltreeColumn,
  paramValues,
} from "../helpers/ltree-fixture";

/**
 * GiST index end-to-end coverage. Registering the `gist` index type lets
 * consumers author `constraints.index([cols.path], { type: "gist" })` /
 * `@@index([path], type: "gist")`, which the Postgres adapter lowers to
 * `CREATE INDEX … USING gist (…)`. This test runs that exact DDL against PGlite
 * (with the `ltree` contrib) on both an `ltree` and an `ltree[]` column to prove
 * it is valid PostgreSQL — PG selects the default opclass (`gist_ltree_ops` /
 * `gist__ltree_ops`) from the column type — and confirms the indexed columns
 * still answer ancestor / pattern queries correctly.
 */

const contract = createLtreeContract();
const adapter = createComposedPostgresAdapter({ extensionPacks: [ltreeRuntimeDescriptor] });
const ops = ltreeRuntimeDescriptor.queryOperations!();

function opExpr(method: string, self: AnyExpression, ...args: unknown[]): AnyExpression {
  const op = ops[method];
  if (!op) throw new Error(`unknown operation: ${method}`);
  const built = op.impl(self as never, ...(args as never[])) as unknown as {
    buildAst(): AnyExpression;
  };
  return built.buildAst();
}

async function idsWhere(predicate: AnyExpression): Promise<number[]> {
  const ast = SelectAst.from(TableSource.named("node"))
    .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
    .withWhere(predicate)
    .withOrderBy([OrderByItem.asc(ColumnRef.of("node", "id"))]);
  const stmt = adapter.lower(ast, { contract });
  const res = await db.query<{ id: number }>(stmt.sql, paramValues(stmt));
  return res.rows.map((r) => r.id);
}

let db: PGlite;

describe("ltree GiST indexes — PGlite end-to-end", () => {
  beforeAll(async () => {
    db = new PGlite({ extensions: { ltree: ltreeContrib } });
    await db.exec("CREATE EXTENSION IF NOT EXISTS ltree;");
    await db.exec(`
      CREATE TABLE node (
        id    int4  NOT NULL,
        path  ltree NOT NULL,
        paths ltree[] NOT NULL
      );
      INSERT INTO node (id, path, paths) VALUES
        (1, 'Top',                   ARRAY['Top']::ltree[]),
        (2, 'Top.Science',           ARRAY['Top','Top.Science']::ltree[]),
        (3, 'Top.Science.Astronomy', ARRAY['Top.Science','Top.Hobbies']::ltree[]),
        (4, 'Top.Art.Painting',      ARRAY['Top.Art']::ltree[]);
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it("creates a GiST index on an ltree column (USING gist, default gist_ltree_ops)", async () => {
    // The exact DDL the Postgres adapter renders for { type: "gist" }.
    await db.exec(`CREATE INDEX "node_path_gist_idx" ON "node" USING "gist" ("path")`);

    const res = await db.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'node' AND indexname = $1`,
      ["node_path_gist_idx"],
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]?.indexdef.toLowerCase()).toContain("using gist");
  });

  it("creates a GiST index on an ltree[] column (USING gist, default gist__ltree_ops)", async () => {
    await db.exec(`CREATE INDEX "node_paths_gist_idx" ON "node" USING "gist" ("paths")`);

    const res = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'node' AND indexname = $1`,
      ["node_paths_gist_idx"],
    );
    expect(res.rows).toHaveLength(1);
  });

  it("answers isDescendantOf correctly with the GiST index present", async () => {
    expect(await idsWhere(opExpr("isDescendantOf", ltreeColumn("path"), "Top.Science"))).toEqual([
      2, 3,
    ]);
  });

  it("answers matchesLquery correctly with the GiST index present", async () => {
    expect(await idsWhere(opExpr("matchesLquery", ltreeColumn("path"), "Top.Science.*"))).toEqual([
      2, 3,
    ]);
  });

  it("answers firstAncestorOf on the ltree[] column with the GiST index present", async () => {
    const expr = opExpr("firstAncestorOf", ltreeArrayColumn("paths"), "Top.Science.Astronomy");
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("v", expr)])
      .withWhere(
        BinaryExpr.eq(
          ColumnRef.of("node", "id"),
          ParamRef.of(3, { codec: { codecId: "pg/int4@1" } }),
        ),
      );
    const stmt = adapter.lower(ast, { contract });
    const res = await db.query<{ v: string }>(stmt.sql, paramValues(stmt));
    expect(res.rows[0]?.v).toBe("Top.Science");
  });
});
