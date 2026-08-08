import {
  BinaryExpr,
  ColumnRef,
  ParamRef,
  ProjectionItem,
  SelectAst,
  TableSource,
} from "@prisma/orm-family-sql/relational-core/ast";
import { describe, expect, it } from "vite-plus/test";
import ltreeRuntimeDescriptor from "../src/exports/runtime";
import { createComposedPostgresAdapter } from "./helpers/composed-adapter";
import { createLtreeContract } from "./helpers/ltree-fixture";

describe("ltree cast policy", () => {
  const contract = createLtreeContract();
  const adapter = createComposedPostgresAdapter({ extensions: [ltreeRuntimeDescriptor] });

  it("emits $1::ltree when ltree is installed via stack.extensions", () => {
    // Regression: the runtime descriptor must surface codecs via `types.codecTypes.codecDescriptors`
    // so the adapter resolves `pg/ltree@1` and the renderer emits `::ltree`. Without the stack
    // extension pack, lowered SQL silently regresses to bare `$1`.
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(
        BinaryExpr.eq(
          ColumnRef.of("node", "path"),
          ParamRef.of("Top.Science", { name: "path", codec: { codecId: "pg/ltree@1" } }),
        ),
      );
    const lowered = adapter.lower(ast, { contract });

    expect(lowered.sql).toBe(
      'SELECT "node"."id" AS "id" FROM "node" WHERE "node"."path" = $1::ltree',
    );
  });

  it("emits $1::ltree[] for pg/ltree-array@1 ParamRef casts", () => {
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(
        BinaryExpr.eq(
          ColumnRef.of("node", "paths"),
          ParamRef.of(["Top.Science", "Top.Art"], {
            name: "paths",
            codec: { codecId: "pg/ltree-array@1" },
          }),
        ),
      );
    const lowered = adapter.lower(ast, { contract });

    expect(lowered.sql).toBe(
      'SELECT "node"."id" AS "id" FROM "node" WHERE "node"."paths" = $1::ltree[]',
    );
  });
});
