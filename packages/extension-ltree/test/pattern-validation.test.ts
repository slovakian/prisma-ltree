import { describe, expect, it } from "vite-plus/test";
import {
  assertPatternArg,
  assertValidLquery,
  assertValidLqueryArray,
  assertValidLtxtquery,
} from "../src/core/pattern-validation";
import ltreeRuntimeDescriptor from "../src/exports/runtime";
import { ltreeColumn } from "./helpers/ltree-fixture";

describe("assertValidLquery — accept", () => {
  it.each([
    "Top.*",
    "*.Science",
    "Top.*{1,2}",
    "Top.*{,2}",
    "Top.*{2,}",
    "Top.a|b",
    "Top.!b",
    "Top.Sci*",
    "Top.Sci@",
    "Top.foo%",
    "*",
    "a",
    "Top.*.Science",
    "!foo|bar",
    "*{1}",
    "*{0}",
    "foo@*%",
    "foo|bar|baz",
    "!foo",
    "*.!foo|bar",
    "Top.*{1,1}.Art",
    "foo@*",
    "foo*%",
    "foo@%",
    "*{1,}",
    "*{,3}",
    "*{0,0}",
    "*{,}",
    "a|b*{1}",
    "a@|b%",
    "!a*|b",
    "!a|b*",
    "a{1}",
    "a{1,2}",
    "a@*{1}",
    "a%{2,}",
    "*.*",
    "foo-bar",
    "123",
    "_x",
    "-x",
    "x-",
    "ä",
    "Top.Science*{1}",
  ])("accepts %j", (pattern) => {
    expect(() => assertValidLquery(pattern)).not.toThrow();
  });
});

describe("assertValidLquery — reject", () => {
  it("rejects non-strings and empty patterns", () => {
    expect(() => assertValidLquery(123 as unknown as string)).toThrow(
      "lquery pattern must be a string",
    );
    expect(() => assertValidLquery("")).toThrow("lquery pattern must not be empty");
  });

  it.each([
    "Top..Science",
    ".Top",
    "Top.",
    "Top.Science!",
    "Top Science",
    "Top/Science",
    "Top.*{a}",
    "Top.*{-1}",
    "Top.**",
    " ",
    "Top.{",
    "{1}",
    "*{}",
    "*{2,1}",
    "foo||bar",
    "|foo",
    "foo|",
    "!!foo",
    "@foo",
    "%foo",
    "*foo",
    "foo.",
    ".",
    "..",
    "!",
    "|",
    "*@",
    "*%",
    "a|*",
    "***",
    "a*{1}|b",
  ])("rejects %j", (pattern) => {
    expect(() => assertValidLquery(pattern)).toThrow(/lquery/);
  });
});

describe("assertValidLqueryArray", () => {
  it("accepts empty arrays and valid entries", () => {
    expect(() => assertValidLqueryArray([])).not.toThrow();
    expect(() => assertValidLqueryArray(["Top.*", "*.Art"])).not.toThrow();
  });

  it("rejects non-arrays and invalid entries with an index prefix", () => {
    expect(() => assertValidLqueryArray("Top.*" as unknown as string[])).toThrow(
      "lquery[] patterns must be a string array",
    );
    expect(() => assertValidLqueryArray(["Top.*", "Top..Bad"])).toThrow(
      /lquery\[\] patterns\[1\]:/,
    );
  });
});

describe("assertValidLtxtquery — accept", () => {
  it.each([
    "Astronomy",
    "Science & Astronomy",
    "Science | Art",
    "!Art",
    "(Science & Astronomy)",
    "Astr*",
    "astr@",
    "foo%",
    "Science & !Art",
    "(foo | bar) & baz",
    "foo@*%",
    "!!Art",
    "foo@*",
    "foo*%",
    "(((a)))",
    "Science & (Art | Music)",
    "Science&(Art|Music)",
    "Science&Art",
    "! (Art)",
    "!(Art)",
    "!!!Art",
    "Art@*%",
    "Art%@*",
    "a & (b | (c & d))",
    "a&b|c&d",
    "foo-bar",
    "ä",
  ])("accepts %j", (query) => {
    expect(() => assertValidLtxtquery(query)).not.toThrow();
  });
});

describe("assertValidLtxtquery — reject", () => {
  it("rejects non-strings and empty queries", () => {
    expect(() => assertValidLtxtquery(null as unknown as string)).toThrow(
      "ltxtquery query must be a string",
    );
    expect(() => assertValidLtxtquery("")).toThrow("ltxtquery query must not be empty");
  });

  it.each([
    "Science &",
    "(Science",
    "Science)",
    "Science && Astronomy",
    "Science Astronomy",
    "& Science",
    "| Art",
    " ",
    "Science |",
    "()",
    "Science & & Art",
    "Science||Art",
    ".",
    "a.b",
    "!",
    "|",
    "&",
    "a{1}",
  ])("rejects %j", (query) => {
    expect(() => assertValidLtxtquery(query)).toThrow(/ltxtquery/);
  });
});

describe("assertPatternArg", () => {
  it("skips Expression-like objects so ParamRefs are not over-validated", () => {
    const expr = { buildAst: () => null, codec: { codecId: "pg/text@1" } };
    expect(() => assertPatternArg("lquery", expr)).not.toThrow();
    expect(() => assertPatternArg("ltxtquery", expr)).not.toThrow();
    expect(() => assertPatternArg("lquery[]", expr)).not.toThrow();
  });
});

describe("pattern ops reject invalid literals at build time", () => {
  const ops = ltreeRuntimeDescriptor.queryOperations!() as Record<
    string,
    { impl: (...args: never[]) => unknown }
  >;

  it("matchesLquery / matchesLtxtquery / matchesLqueryArray throw clear errors", () => {
    expect(() => ops["matchesLquery"]!.impl(ltreeColumn("path") as never, "" as never)).toThrow(
      /lquery pattern must not be empty/,
    );
    expect(() =>
      ops["matchesLquery"]!.impl(ltreeColumn("path") as never, "Top..Science" as never),
    ).toThrow(/lquery/);
    expect(() =>
      ops["matchesLtxtquery"]!.impl(ltreeColumn("path") as never, "Science &" as never),
    ).toThrow(/ltxtquery/);
    expect(() =>
      ops["matchesLqueryArray"]!.impl(ltreeColumn("path") as never, ["Top.*", ""] as never),
    ).toThrow(/lquery\[\] patterns\[1\]/);
  });

  it("still builds valid pattern ops", () => {
    expect(() =>
      ops["matchesLquery"]!.impl(ltreeColumn("path") as never, "Top.*" as never),
    ).not.toThrow();
    expect(() =>
      ops["matchesLtxtquery"]!.impl(ltreeColumn("path") as never, "Science & Art" as never),
    ).not.toThrow();
  });
});
