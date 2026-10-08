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
} from "@prisma/orm-family-sql/relational-core/ast";
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
const adapter = createComposedPostgresAdapter({ extensions: [ltreeRuntimeDescriptor] });
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

  it("lcaAll: lca(paths) returns the proper lowest common ancestor", async () => {
    await db.exec(`
      INSERT INTO node (id, path, paths) VALUES (
        2,
        'Top.Science.Astronomy',
        ARRAY['Top.Science.Biology','Top.Science.Physics']::ltree[]
      );
    `);
    expect(await projectFor(2, opExpr("lcaAll", ltreeArrayColumn("paths")))).toBe("Top.Science");
  });

  // `lca(ltree[])` yields SQL NULL for an empty array — reachable even on a
  // `ltree[] NOT NULL` column (`'{}'` is non-null but empty). The op declares
  // `nullable: false` for parity with the first-match ops (which likewise
  // return NULL on no match); this test pins the documented runtime behavior.
  it("lcaAll: an empty ltree[] yields SQL NULL", async () => {
    await db.exec(`
      INSERT INTO node (id, path, paths) VALUES (3, 'Top', ARRAY[]::ltree[]);
    `);
    expect(await projectFor(3, opExpr("lcaAll", ltreeArrayColumn("paths")))).toBeNull();
  });

  it("firstAncestorOf against a non-matching rhs returns null", async () => {
    expect(
      await projectFor(1, opExpr("firstAncestorOf", ltreeArrayColumn("paths"), "Other.Branch")),
    ).toBeNull();
  });

  it("containsAncestorOf: paths @> rhs is true when an entry is an ancestor", async () => {
    expect(
      await projectFor(1, opExpr("containsAncestorOf", ltreeArrayColumn("paths"), "Top.Science.Astronomy")),
    ).toBe(true);
  });

  it("containsAncestorOf: paths @> rhs is false when no entry is an ancestor", async () => {
    expect(
      await projectFor(1, opExpr("containsAncestorOf", ltreeArrayColumn("paths"), "Other.Branch")),
    ).toBe(false);
  });

  it("containsDescendantOf: paths <@ rhs is true when an entry is a descendant", async () => {
    expect(await projectFor(1, opExpr("containsDescendantOf", ltreeArrayColumn("paths"), "Top"))).toBe(
      true,
    );
  });

  it("matchesAnyLquery: paths ~ pattern is true when any entry matches", async () => {
    expect(await projectFor(1, opExpr("matchesAnyLquery", ltreeArrayColumn("paths"), "*.Hobbies"))).toBe(
      true,
    );
  });

  it("matchesAnyLqueryArray: paths ? patterns is true when any entry matches any pattern", async () => {
    expect(
      await projectFor(1, opExpr("matchesAnyLqueryArray", ltreeArrayColumn("paths"), ["*.Art", "Top.Hobbies"])),
    ).toBe(true);
  });

  it("matchesAnyLtxtquery: paths @ query is true when any entry matches", async () => {
    expect(
      await projectFor(1, opExpr("matchesAnyLtxtquery", ltreeArrayColumn("paths"), "Hobbies")),
    ).toBe(true);
  });

  it("isAncestorOfAny: path @> paths is true when the path is an ancestor of an entry", async () => {
    expect(
      await projectFor(1, opExpr("isAncestorOfAny", ltreeColumn("path"), ["Top.Science.Astronomy.Stars"])),
    ).toBe(true);
  });

  it("isDescendantOfAny: path <@ paths is true when an entry is an ancestor of the path", async () => {
    expect(
      await projectFor(1, opExpr("isDescendantOfAny", ltreeColumn("path"), ["Top.Science", "Top.Hobbies"])),
    ).toBe(true);
  });

  it("isDescendantOfAny: path <@ paths is false when no entry is an ancestor", async () => {
    expect(
      await projectFor(1, opExpr("isDescendantOfAny", ltreeColumn("path"), ["Top.Hobbies"])),
    ).toBe(false);
  });

  it("scalar ltree column ops remain independent of the array receiver", async () => {
    expect(await projectFor(1, opExpr("isDescendantOf", ltreeColumn("path"), "Top.Science"))).toBe(
      true,
    );
  });
});
