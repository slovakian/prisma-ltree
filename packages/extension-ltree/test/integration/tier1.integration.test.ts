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
} from "@prisma/orm-family-sql/relational-core/ast";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import ltreeRuntimeDescriptor from "../../src/exports/runtime";
import { createComposedPostgresAdapter } from "../helpers/composed-adapter";
import { createLtreeContract, ltreeColumn, paramValues } from "../helpers/ltree-fixture";

/**
 * Tier 1 end-to-end coverage: every hierarchy, pattern-match, and scalar-function
 * operation is built via its runtime impl, lowered through the composed Postgres
 * adapter, and executed against PGlite (with the `ltree` contrib extension).
 * Boolean operators are exercised in a WHERE clause; scalar functions in a
 * projection.
 */

const contract = createLtreeContract();
const adapter = createComposedPostgresAdapter({ extensions: [ltreeRuntimeDescriptor] });
const ops = ltreeRuntimeDescriptor.queryOperations!();

function opExpr(method: string, ...args: unknown[]): AnyExpression {
  const op = ops[method];
  if (!op) throw new Error(`unknown operation: ${method}`);
  const built = op.impl(ltreeColumn("path") as never, ...(args as never[])) as unknown as {
    buildAst(): AnyExpression;
  };
  return built.buildAst();
}

describe("ltree Tier 1 operations — PGlite end-to-end", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({ extensions: { ltree: ltreeContrib } });
    await db.exec("CREATE EXTENSION IF NOT EXISTS ltree;");
    await db.exec(`
      CREATE TABLE node (id int4 NOT NULL, path ltree NOT NULL);
      INSERT INTO node (id, path) VALUES
        (1, 'Top'),
        (2, 'Top.Science'),
        (3, 'Top.Science.Astronomy'),
        (4, 'Top.Science.Astronomy.Astrophysics'),
        (5, 'Top.Art'),
        (6, 'Top.Art.Painting');
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  // Run a boolean operation in WHERE; return matching ids ascending.
  async function whereIds(predicate: AnyExpression): Promise<number[]> {
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(predicate)
      .withOrderBy([OrderByItem.asc(ColumnRef.of("node", "id"))]);
    const stmt = adapter.lower(ast, { contract });
    const res = await db.query<{ id: number }>(stmt.sql, paramValues(stmt));
    return res.rows.map((r) => r.id);
  }

  // Project a scalar operation for the row with the given id; return its value.
  async function scalarFor(id: number, expr: AnyExpression): Promise<unknown> {
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

  it("isAncestorOf: lowers to @> $1::ltree and selects ancestor rows", async () => {
    const predicate = opExpr("isAncestorOf", "Top.Science.Astronomy");
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(predicate)
      .withOrderBy([OrderByItem.asc(ColumnRef.of("node", "id"))]);
    const stmt = adapter.lower(ast, { contract });

    expect(stmt.sql).toContain('"node"."path" @> $1::ltree');
    expect(paramValues(stmt)).toEqual(["Top.Science.Astronomy"]);
    expect(await whereIds(predicate)).toEqual([1, 2, 3]);
  });

  it("isDescendantOf: path <@ 'Top.Science'", async () => {
    expect(await whereIds(opExpr("isDescendantOf", "Top.Science"))).toEqual([2, 3, 4]);
  });

  it("matchesLquery: path ~ 'Top.Science.*'", async () => {
    expect(await whereIds(opExpr("matchesLquery", "Top.Science.*"))).toEqual([2, 3, 4]);
  });

  it("matchesLqueryArray: path ? ['*.Painting','Top.Science']", async () => {
    expect(await whereIds(opExpr("matchesLqueryArray", ["*.Painting", "Top.Science"]))).toEqual([
      2, 6,
    ]);
  });

  it("matchesLtxtquery: path @ 'Astronomy'", async () => {
    expect(await whereIds(opExpr("matchesLtxtquery", "Astronomy"))).toEqual([3, 4]);
  });

  it("nlevel: nlevel(path)", async () => {
    expect(await scalarFor(4, opExpr("nlevel"))).toBe(4);
  });

  it("subltree: subltree(path, 1, 2)", async () => {
    expect(await scalarFor(3, opExpr("subltree", 1, 2))).toBe("Science");
  });

  it("subpath (3-arg): subpath(path, 0, 2)", async () => {
    expect(await scalarFor(3, opExpr("subpath", 0, 2))).toBe("Top.Science");
  });

  it("subpath (2-arg): subpath(path, 1)", async () => {
    expect(await scalarFor(3, opExpr("subpath", 1))).toBe("Science.Astronomy");
  });

  it("indexOf (2-arg): index(path, 'Astronomy')", async () => {
    expect(await scalarFor(4, opExpr("indexOf", "Astronomy"))).toBe(2);
  });

  it("indexOf (3-arg): index(path, 'Science', 0)", async () => {
    expect(await scalarFor(4, opExpr("indexOf", "Science", 0))).toBe(1);
  });

  it("lca (2 paths): lca(path, 'Top.Art.Painting')", async () => {
    expect(await scalarFor(3, opExpr("lca", "Top.Art.Painting"))).toBe("Top");
  });

  it("lca (3 paths): common *proper* ancestor is Top.Science", async () => {
    // lca uses proper ancestors, so all three Top.Science.* paths share Top.Science.
    expect(await scalarFor(3, opExpr("lca", "Top.Science.Biology", "Top.Science.Physics"))).toBe(
      "Top.Science",
    );
  });
});
