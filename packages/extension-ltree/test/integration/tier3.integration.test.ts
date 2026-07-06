import { PGlite } from "@electric-sql/pglite";
import { ltree as ltreeContrib } from "@electric-sql/pglite/contrib/ltree";
import {
  type AnyExpression,
  BinaryExpr,
  ColumnRef,
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
 * Tier 3 end-to-end coverage: first-match operators on an `ltree[]` receiver
 * (`firstAncestorOf`/`firstDescendantOf`/`firstMatchLquery`/`firstMatchLtxtquery`)
 * built via their runtime impls, lowered through the composed Postgres adapter,
 * and executed against PGlite.
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

describe("ltree Tier 3 operations — PGlite end-to-end", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({ extensions: { ltree: ltreeContrib } });
    await db.exec("CREATE EXTENSION IF NOT EXISTS ltree;");
    await db.exec(`
      CREATE TABLE node (
        id int4 NOT NULL,
        path ltree NOT NULL,
        paths ltree[] NOT NULL
      );
      INSERT INTO node (id, path, paths) VALUES (
        1,
        'Top.Science.Astronomy',
        ARRAY['Top.Science','Top.Hobbies']::ltree[]
      );
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  async function projectFor(id: number, expr: AnyExpression): Promise<unknown> {
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("v", expr)])
      .withWhere(
        BinaryExpr.eq(
          ColumnRef.of("node", "id"),
          ParamRef.of(id, { codec: { codecId: "pg/int4@1" } }),
        ),
      );
    const stmt = adapter.lower(ast, { contract });
    const res = await db.query<{ v: unknown }>(stmt.sql, paramValues(stmt));
    return res.rows[0]?.v;
  }

  it("firstAncestorOf: paths ?@> rhs returns the first matching ancestor path", async () => {
    expect(
      await projectFor(
        1,
        opExpr("firstAncestorOf", ltreeArrayColumn("paths"), "Top.Science.Astronomy"),
      ),
    ).toBe("Top.Science");
  });

  it("firstDescendantOf: paths ?<@ rhs returns the first matching descendant path", async () => {
    expect(await projectFor(1, opExpr("firstDescendantOf", ltreeArrayColumn("paths"), "Top"))).toBe(
      "Top.Science",
    );
  });

  it("firstMatchLquery: paths ?~ pattern returns the first matching path", async () => {
    expect(
      await projectFor(1, opExpr("firstMatchLquery", ltreeArrayColumn("paths"), "Top.*")),
    ).toBe("Top.Science");
  });

  it("firstMatchLtxtquery: paths ?@ query returns the first matching path", async () => {
    expect(
      await projectFor(1, opExpr("firstMatchLtxtquery", ltreeArrayColumn("paths"), "Science")),
    ).toBe("Top.Science");
  });

  it("commonAncestor: lca(paths) returns the proper lowest common ancestor", async () => {
    await db.exec(`
      INSERT INTO node (id, path, paths) VALUES (
        2,
        'Top.Science.Astronomy',
        ARRAY['Top.Science.Biology','Top.Science.Physics']::ltree[]
      );
    `);
    expect(await projectFor(2, opExpr("commonAncestor", ltreeArrayColumn("paths")))).toBe(
      "Top.Science",
    );
  });

  it("firstAncestorOf against a non-matching rhs returns null", async () => {
    expect(
      await projectFor(1, opExpr("firstAncestorOf", ltreeArrayColumn("paths"), "Other.Branch")),
    ).toBeNull();
  });

  it("scalar ltree column ops remain independent of the array receiver", async () => {
    expect(await projectFor(1, opExpr("isDescendantOf", ltreeColumn("path"), "Top.Science"))).toBe(
      true,
    );
  });
});
