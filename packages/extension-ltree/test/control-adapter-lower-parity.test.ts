import {
  type AnyQueryAst,
  BinaryExpr,
  ColumnRef,
  ParamRef,
  ProjectionItem,
  SelectAst,
  TableSource,
} from "@prisma/orm-family-sql/relational-core/ast";
import { describe, expect, it } from "vite-plus/test";
import ltreeControl from "../src/exports/control";
import ltreeRuntime from "../src/exports/runtime";
import {
  createComposedPostgresAdapter,
  createComposedPostgresControlAdapter,
} from "./helpers/composed-adapter";
import { createLtreeContract } from "./helpers/ltree-fixture";

const contract = createLtreeContract();

// Compose ltree on both planes so runtime and control codec lookups both contain
// `pg/ltree@1` / `pg/ltree-array@1`. Parity requires both sides to see the same set.
const runtimeAdapter = createComposedPostgresAdapter({ extensions: [ltreeRuntime] });
const controlAdapter = createComposedPostgresControlAdapter({ extensions: [ltreeControl] });

function expectParity(ast: AnyQueryAst): void {
  const runtime = runtimeAdapter.lower(ast, { contract });
  const control = controlAdapter.lower(ast, { contract });
  expect(control).toEqual(runtime);
}

describe("PostgresControlAdapter.lower / PostgresAdapterImpl.lower parity", () => {
  it("matches on ltree ParamRef casts", () => {
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(
        BinaryExpr.eq(
          ColumnRef.of("node", "path"),
          ParamRef.of("Top.Science", { name: "path", codec: { codecId: "pg/ltree@1" } }),
        ),
      );
    expectParity(ast);

    expect(runtimeAdapter.lower(ast, { contract }).sql).toContain("::ltree");
  });

  it("matches on ltree[] ParamRef casts", () => {
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(
        BinaryExpr.eq(
          ColumnRef.of("node", "paths"),
          ParamRef.of(["Top.Science"], {
            name: "paths",
            codec: { codecId: "pg/ltree-array@1" },
          }),
        ),
      );
    expectParity(ast);

    expect(runtimeAdapter.lower(ast, { contract }).sql).toContain("::ltree[]");
  });
});
