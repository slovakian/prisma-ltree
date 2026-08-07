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
import { createLtreeContract, ltreeColumn, paramValues } from "../helpers/ltree-fixture";

/**
 * Tier 2 end-to-end coverage: concatenation (`concat`/`concatText`/`prependText`)
 * and conversion (`toText`/`toLtree`) built via their runtime impls, lowered
 * through the composed Postgres adapter, and executed against PGlite. Each op is
 * projected for a known row (or a literal `self` for the text-rooted `toLtree`)
 * and its value asserted.
 */

const contract = createLtreeContract();
const adapter = createComposedPostgresAdapter({ extensions: [ltreeRuntimeDescriptor] });
const ops = ltreeRuntimeDescriptor.queryOperations!();

/** A text-codec `self`/value expression (for `toLtree`, rooted on text — ADR-002). */
function textValue(value: string): AnyExpression {
  return {
    codec: { codecId: "pg/text@1" },
    returnType: { codecId: "pg/text@1", nullable: false },
    buildAst: () => ParamRef.of(value, { codec: { codecId: "pg/text@1" } }),
  } as unknown as AnyExpression;
}

function opExpr(method: string, self: AnyExpression, ...args: unknown[]): AnyExpression {
  const op = ops[method];
  if (!op) throw new Error(`unknown operation: ${method}`);
  const built = op.impl(self as never, ...(args as never[])) as unknown as {
    buildAst(): AnyExpression;
  };
  return built.buildAst();
}

describe("ltree Tier 2 operations — PGlite end-to-end", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({ extensions: { ltree: ltreeContrib } });
    await db.exec("CREATE EXTENSION IF NOT EXISTS ltree;");
    await db.exec(`
      CREATE TABLE node (id int4 NOT NULL, path ltree NOT NULL);
      INSERT INTO node (id, path) VALUES (1, 'Top.Science');
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  // Project an expression for the row with the given id; return its value.
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

  it("concat: path || 'Astronomy.Astrophysics'", async () => {
    expect(
      await projectFor(1, opExpr("concat", ltreeColumn("path"), "Astronomy.Astrophysics")),
    ).toBe("Top.Science.Astronomy.Astrophysics");
  });

  it("concatText: path || 'Astronomy'", async () => {
    expect(await projectFor(1, opExpr("concatText", ltreeColumn("path"), "Astronomy"))).toBe(
      "Top.Science.Astronomy",
    );
  });

  it("prependText: 'Root' || path", async () => {
    expect(await projectFor(1, opExpr("prependText", ltreeColumn("path"), "Root"))).toBe(
      "Root.Top.Science",
    );
  });

  it("toText: ltree2text(path) returns a text value", async () => {
    expect(await projectFor(1, opExpr("toText", ltreeColumn("path")))).toBe("Top.Science");
  });

  it("toLtree: text2ltree('a.b.c') rooted on a text self (ADR-002)", async () => {
    expect(await projectFor(1, opExpr("toLtree", textValue("a.b.c")))).toBe("a.b.c");
  });
});
