/**
 * Lightweight structural checks for PostgreSQL `lquery` / `ltxtquery` pattern
 * arguments. These catch empty values, empty path segments, unbalanced
 * operators/parentheses, and obviously illegal syntax before the value is cast
 * in SQL — without inventing framework PN-* error codes.
 *
 * Label bodies intentionally allow Unicode letters/numbers (`\p{L}` / `\p{N}`)
 * plus `_` / `-` so locale-dependent labels that Postgres accepts are not
 * rejected here. Full Postgres parsing still happens at the database.
 */

/** Word body chars: locale letters/digits, underscore, hyphen. */
const WORD_CHAR = /[\p{L}\p{N}_-]/u;

function isWordChar(ch: string): boolean {
  return WORD_CHAR.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function fail(kind: "lquery" | "ltxtquery", message: string, value: string): never {
  throw new Error(`${kind} ${message}: "${value}"`);
}

/**
 * Parse an optional `{n}`, `{n,}`, `{,m}`, `{n,m}`, or `{,}` quantifier starting
 * at `i`. Returns the index after the closing `}`, or `i` when no quantifier
 * begins here. Throws on a malformed `{...}`.
 */
function consumeQuantifier(
  kind: "lquery" | "ltxtquery",
  value: string,
  i: number,
  allow: boolean,
): number {
  if (value[i] !== "{") return i;
  if (!allow) {
    fail(kind, `syntax error at character ${i + 1}`, value);
  }
  let j = i + 1;
  let low: number | undefined;
  let high: number | undefined;
  let sawComma = false;

  const readNumber = (): number | undefined => {
    if (j >= value.length || !isDigit(value[j]!)) return undefined;
    const start = j;
    while (j < value.length && isDigit(value[j]!)) j += 1;
    return Number(value.slice(start, j));
  };

  low = readNumber();
  if (j < value.length && value[j] === ",") {
    sawComma = true;
    j += 1;
    high = readNumber();
  }
  if (j >= value.length || value[j] !== "}") {
    fail(kind, `syntax error at character ${i + 1}`, value);
  }
  j += 1;

  // `{}` is invalid; `{,}` (both ends open) is valid in Postgres.
  if (low === undefined && high === undefined && !sawComma) {
    fail(kind, `syntax error at character ${i + 1}`, value);
  }
  if (low !== undefined && high !== undefined && low > high) {
    fail(kind, "syntax error (quantifier low > high)", value);
  }
  return j;
}

/** Consume `@` / `*` / `%` modifiers that follow a non-star word. */
function consumeModifiers(value: string, i: number): number {
  while (i < value.length) {
    const ch = value[i]!;
    if (ch === "@" || ch === "*" || ch === "%") {
      i += 1;
      continue;
    }
    break;
  }
  return i;
}

function consumeWord(kind: "lquery" | "ltxtquery", value: string, i: number): number {
  if (i >= value.length || !isWordChar(value[i]!)) {
    fail(kind, `syntax error at character ${i + 1}`, value);
  }
  let j = i;
  while (j < value.length && isWordChar(value[j]!)) j += 1;
  return j;
}

/**
 * One lquery level: either `*` + optional quantifier, or an optional `!`
 * followed by `word mods? (| word mods?)*` and an optional trailing quantifier.
 */
function consumeLqueryLevel(value: string, i: number): number {
  if (value[i] === "*") {
    // Star wildcards cannot take `@`/`%` modifiers; only an optional quantifier.
    return consumeQuantifier("lquery", value, i + 1, true);
  }

  let j = i;
  if (value[j] === "!") {
    j += 1;
  }

  j = consumeWord("lquery", value, j);
  j = consumeModifiers(value, j);

  while (j < value.length && value[j] === "|") {
    j += 1;
    j = consumeWord("lquery", value, j);
    j = consumeModifiers(value, j);
  }

  return consumeQuantifier("lquery", value, j, true);
}

export function assertValidLquery(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("lquery pattern must be a string");
  }
  if (value.length === 0) {
    throw new Error('lquery pattern must not be empty: ""');
  }

  let i = 0;
  i = consumeLqueryLevel(value, i);
  while (i < value.length) {
    if (value[i] !== ".") {
      fail("lquery", `syntax error at character ${i + 1}`, value);
    }
    i += 1;
    if (i >= value.length) {
      fail("lquery", "syntax error (trailing '.' / empty label)", value);
    }
    i = consumeLqueryLevel(value, i);
  }
}

export function assertValidLqueryArray(value: unknown): asserts value is readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error("lquery[] patterns must be a string array");
  }
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    try {
      assertValidLquery(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`lquery[] patterns[${index}]: ${message}`);
    }
  }
}

type LtxtToken =
  | { readonly kind: "word"; readonly text: string }
  | { readonly kind: "and" }
  | { readonly kind: "or" }
  | { readonly kind: "not" }
  | { readonly kind: "lparen" }
  | { readonly kind: "rparen" };

function tokenizeLtxtquery(value: string): LtxtToken[] {
  const tokens: LtxtToken[] = [];
  let i = 0;
  while (i < value.length) {
    const ch = value[i]!;
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "&") {
      tokens.push({ kind: "and" });
      i += 1;
      continue;
    }
    if (ch === "|") {
      tokens.push({ kind: "or" });
      i += 1;
      continue;
    }
    if (ch === "!") {
      tokens.push({ kind: "not" });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i += 1;
      continue;
    }
    if (isWordChar(ch)) {
      const start = i;
      i = consumeWord("ltxtquery", value, i);
      i = consumeModifiers(value, i);
      tokens.push({ kind: "word", text: value.slice(start, i) });
      continue;
    }
    fail("ltxtquery", `syntax error at character ${i + 1}`, value);
  }
  return tokens;
}

/**
 * Recursive-descent check mirroring Postgres ltxtquery operator precedence:
 * OR < AND < NOT < primary (word / parenthesized expr).
 */
function parseLtxtExpr(tokens: readonly LtxtToken[], value: string): void {
  let pos = 0;

  const peek = (): LtxtToken | undefined => tokens[pos];
  const take = (): LtxtToken => {
    const tok = tokens[pos];
    if (!tok) fail("ltxtquery", "syntax error (unexpected end)", value);
    pos += 1;
    return tok;
  };

  const parsePrimary = (): void => {
    const tok = peek();
    if (!tok) fail("ltxtquery", "syntax error (missing operand)", value);
    if (tok.kind === "word") {
      take();
      return;
    }
    if (tok.kind === "lparen") {
      take();
      parseOr();
      const close = take();
      if (close.kind !== "rparen") {
        fail("ltxtquery", "syntax error (expected ')')", value);
      }
      return;
    }
    fail("ltxtquery", "syntax error (missing operand)", value);
  };

  const parseFactor = (): void => {
    while (peek()?.kind === "not") take();
    parsePrimary();
  };

  const parseAnd = (): void => {
    parseFactor();
    while (peek()?.kind === "and") {
      take();
      parseFactor();
    }
  };

  const parseOr = (): void => {
    parseAnd();
    while (peek()?.kind === "or") {
      take();
      parseAnd();
    }
  };

  parseOr();
  if (pos !== tokens.length) {
    fail("ltxtquery", "syntax error (unexpected token)", value);
  }
}

export function assertValidLtxtquery(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("ltxtquery query must be a string");
  }
  if (value.length === 0) {
    throw new Error('ltxtquery query must not be empty: ""');
  }
  const tokens = tokenizeLtxtquery(value);
  if (tokens.length === 0) {
    fail("ltxtquery", "syntax error (missing operand)", value);
  }
  parseLtxtExpr(tokens, value);
}

/**
 * Validate a pattern argument when the caller passed a raw JS value. Expression
 * / ParamRef objects are left alone so dynamic binds still round-trip to
 * Postgres (which remains the authority for those).
 */
export function assertPatternArg(
  castType: "lquery" | "ltxtquery" | "lquery[]",
  arg: unknown,
): void {
  if (arg !== null && typeof arg === "object" && !Array.isArray(arg)) {
    return;
  }
  switch (castType) {
    case "lquery":
      assertValidLquery(arg);
      return;
    case "ltxtquery":
      assertValidLtxtquery(arg);
      return;
    case "lquery[]":
      assertValidLqueryArray(arg);
      return;
  }
}
