import type { CodecRef } from "@prisma-next/framework-components/codec";
import { createSqlOperationRegistry } from "@prisma-next/sql-operations";
import { OperationExpr, ParamRef } from "@prisma-next/sql-relational-core/ast";
import { describe, expect, it } from "vite-plus/test";
import ltreeRuntimeDescriptor from "../src/exports/runtime";

function ltreeExpr(value: string, codec: CodecRef) {
  const ref = ParamRef.of(value, { codec });
  return {
    returnType: { codecId: codec.codecId, nullable: false },
    buildAst: () => ref,
    codec,
  };
}

describe("prisma-ltree operations", () => {
  it("descriptor has correct metadata", () => {
    expect(ltreeRuntimeDescriptor.kind).toBe("extension");
    expect(ltreeRuntimeDescriptor.id).toBe("ltree");
    expect(ltreeRuntimeDescriptor.familyId).toBe("sql");
    expect(ltreeRuntimeDescriptor.targetId).toBe("postgres");
    expect(ltreeRuntimeDescriptor.version).toBe("0.1.0");
  });

  it("descriptor contributes the pg/ltree@1 codec descriptor", () => {
    const descriptors = ltreeRuntimeDescriptor.codecs();
    expect(descriptors).toBeDefined();
    expect(descriptors.length).toBe(2);
    const ltreeCodecDescriptor = descriptors.find((d) => d.codecId === "pg/ltree@1");
    expect(ltreeCodecDescriptor).toBeDefined();
    expect(ltreeCodecDescriptor?.codecId).toBe("pg/ltree@1");
    const ltreeArrayCodecDescriptor = descriptors.find((d) => d.codecId === "pg/ltree-array@1");
    expect(ltreeArrayCodecDescriptor).toBeDefined();
  });

  it("exposes the full Tier 1 + Tier 2 + Tier 3 operation set", () => {
    const operations = ltreeRuntimeDescriptor.queryOperations!();
    expect(Object.keys(operations).sort()).toEqual(
      [
        "isAncestorOf",
        "isDescendantOf",
        "matchesLquery",
        "matchesLqueryArray",
        "matchesLtxtquery",
        "nlevel",
        "subltree",
        "subpath",
        "indexOf",
        "lca",
        "concat",
        "concatText",
        "prependText",
        "toText",
        "toLtree",
        "firstAncestorOf",
        "firstDescendantOf",
        "firstMatchLquery",
        "firstMatchLtxtquery",
        "commonAncestor",
      ].sort(),
    );
  });

  // method -> [lowering template, the value passed as arg0]
  const operatorCases: ReadonlyArray<readonly [string, string, unknown]> = [
    ["isAncestorOf", "{{self}} @> {{arg0}}", "Top.Child"],
    ["isDescendantOf", "{{self}} <@ {{arg0}}", "Top"],
    ["matchesLquery", "{{self}} ~ ({{arg0}})::lquery", "Top.*"],
    ["matchesLqueryArray", "{{self}} ? ({{arg0}})::lquery[]", ["Top.*", "*.Art"]],
    ["matchesLtxtquery", "{{self}} @ ({{arg0}})::ltxtquery", "Science"],
  ];

  it.each(operatorCases)(
    "%s builds an OperationExpr with the correct lowering template and bool return",
    (method, template, arg) => {
      const operations = ltreeRuntimeDescriptor.queryOperations!();
      const ltreeCodec: CodecRef = { codecId: "pg/ltree@1" };
      const op = operations[method];
      expect(op).toBeDefined();
      const expr = op?.impl(ltreeExpr("Top", ltreeCodec) as never, arg as never) as unknown as {
        buildAst(): OperationExpr;
      };
      const ast = expr.buildAst();
      expect(ast).toBeInstanceOf(OperationExpr);
      expect(ast.method).toBe(method);
      expect(ast.lowering).toEqual({
        targetFamily: "sql",
        strategy: "function",
        template,
      });
      expect(ast.returns).toEqual({ codecId: "pg/bool@1", nullable: false });
    },
  );

  // Scalar functions lower to `fn(self, arg0, ...)` and return ltree/int4.
  // method -> [fn template, [args after self], return codecId]
  const scalarCases: ReadonlyArray<readonly [string, string, readonly unknown[], string]> = [
    ["nlevel", "nlevel({{self}})", [], "pg/int4@1"],
    ["subltree", "subltree({{self}}, {{arg0}}, {{arg1}})", [1, 2], "pg/ltree@1"],
    ["subpath", "subpath({{self}}, {{arg0}}, {{arg1}})", [0, 2], "pg/ltree@1"],
    ["subpath", "subpath({{self}}, {{arg0}})", [1], "pg/ltree@1"],
    ["indexOf", "index({{self}}, {{arg0}}, {{arg1}})", ["5.4", -2], "pg/int4@1"],
    ["indexOf", "index({{self}}, {{arg0}})", ["5.4"], "pg/int4@1"],
    ["lca", "lca({{self}}, {{arg0}})", ["1.2.4"], "pg/ltree@1"],
    ["lca", "lca({{self}}, {{arg0}}, {{arg1}})", ["1.2.4", "1.2.5.6"], "pg/ltree@1"],
  ];

  it.each(scalarCases)(
    "%s lowers to `%s` with the expected return codec",
    (method, template, args, returnCodecId) => {
      const operations = ltreeRuntimeDescriptor.queryOperations!();
      const ltreeCodec: CodecRef = { codecId: "pg/ltree@1" };
      const op = operations[method];
      expect(op).toBeDefined();
      const expr = op?.impl(
        ltreeExpr("Top.Child1.Child2", ltreeCodec) as never,
        ...(args as never[]),
      ) as unknown as { buildAst(): OperationExpr };
      const ast = expr.buildAst();
      expect(ast).toBeInstanceOf(OperationExpr);
      expect(ast.method).toBe(method);
      expect(ast.lowering).toEqual({ targetFamily: "sql", strategy: "function", template });
      expect(ast.returns).toEqual({ codecId: returnCodecId, nullable: false });
    },
  );

  // Tier 2 — concatenation + conversion. method -> [template, args after self,
  // return codecId, self codecId]. `toLtree` is rooted on text (ADR-002).
  const tier2Cases: ReadonlyArray<readonly [string, string, readonly unknown[], string, string]> = [
    ["concat", "{{self}} || {{arg0}}", ["a.b"], "pg/ltree@1", "pg/ltree@1"],
    ["concatText", "{{self}} || ({{arg0}})::text", ["leaf"], "pg/ltree@1", "pg/ltree@1"],
    ["prependText", "({{arg0}})::text || {{self}}", ["root"], "pg/ltree@1", "pg/ltree@1"],
    ["toText", "ltree2text({{self}})", [], "pg/text@1", "pg/ltree@1"],
    ["toLtree", "text2ltree({{self}})", [], "pg/ltree@1", "pg/text@1"],
  ];

  it.each(tier2Cases)(
    "%s lowers to `%s` with the expected return codec",
    (method, template, args, returnCodecId, selfCodecId) => {
      const operations = ltreeRuntimeDescriptor.queryOperations!();
      const selfCodec: CodecRef = { codecId: selfCodecId };
      const op = operations[method];
      expect(op).toBeDefined();
      const expr = op?.impl(
        ltreeExpr("a", selfCodec) as never,
        ...(args as never[]),
      ) as unknown as { buildAst(): OperationExpr };
      const ast = expr.buildAst();
      expect(ast).toBeInstanceOf(OperationExpr);
      expect(ast.method).toBe(method);
      expect(ast.lowering).toEqual({ targetFamily: "sql", strategy: "function", template });
      expect(ast.returns).toEqual({ codecId: returnCodecId, nullable: false });
    },
  );

  // Tier 3 — first-match operators on `ltree[]` receiver (ADR-003).
  const tier3Cases: ReadonlyArray<readonly [string, string, unknown]> = [
    ["firstAncestorOf", "{{self}} ?@> {{arg0}}", "Top.Science.Astronomy"],
    ["firstDescendantOf", "{{self}} ?<@ {{arg0}}", "Top"],
    ["firstMatchLquery", "{{self}} ?~ ({{arg0}})::lquery", "Top.*"],
    ["firstMatchLtxtquery", "{{self}} ?@ ({{arg0}})::ltxtquery", "Science"],
    ["commonAncestor", "lca({{self}})", undefined],
  ];

  it.each(tier3Cases)(
    "%s builds an OperationExpr with the correct lowering template and ltree return",
    (method, template, arg) => {
      const operations = ltreeRuntimeDescriptor.queryOperations!();
      const ltreeArrayCodec: CodecRef = { codecId: "pg/ltree-array@1" };
      const op = operations[method];
      expect(op).toBeDefined();
      const expr = op?.impl(
        ltreeExpr("Top.Science,Top.Hobbies", ltreeArrayCodec) as never,
        ...(arg === undefined ? [] : [arg as never]),
      ) as unknown as { buildAst(): OperationExpr };
      const ast = expr.buildAst();
      expect(ast).toBeInstanceOf(OperationExpr);
      expect(ast.method).toBe(method);
      expect(ast.lowering).toEqual({ targetFamily: "sql", strategy: "function", template });
      expect(ast.returns).toEqual({ codecId: "pg/ltree@1", nullable: false });
    },
  );

  it("operations can be registered in registry", () => {
    const operations = ltreeRuntimeDescriptor.queryOperations!();
    const registry = createSqlOperationRegistry();
    for (const [name, op] of Object.entries(operations)) {
      registry.register(name, op);
    }
    const entries = registry.entries();
    expect(entries["isAncestorOf"]).toBeDefined();
  });

  it("descriptor materializes a runtime codec when its factory is called", () => {
    const descriptors = ltreeRuntimeDescriptor.codecs();
    const ltreeCodecDescriptor = descriptors.find((d) => d.codecId === "pg/ltree@1");
    expect(ltreeCodecDescriptor).toBeDefined();
    const codec = ltreeCodecDescriptor!.factory(undefined as never)({ name: "<test>" });
    expect(codec.id).toBe("pg/ltree@1");
  });

  it("instance is minimal (identity only)", () => {
    const instance = ltreeRuntimeDescriptor.create();
    expect(instance.familyId).toBe("sql");
    expect(instance.targetId).toBe("postgres");
  });
});
