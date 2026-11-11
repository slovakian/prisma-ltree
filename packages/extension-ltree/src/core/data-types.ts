/**
 * Data types this extension owns.
 *
 * `ltree` and `ltree[]` are PostgreSQL types the target does not register.
 * A path's stored form is its label text. An array's stored form is a
 * JSON array of those texts. Both accept text the contract can already write.
 * The texts are what a migration writes and what the catalog reports.
 */

import type { DataType, DataTypeReader } from "@prisma/orm-framework/components/codec";
import { refuseJsonValue } from "@prisma/orm-framework/components/codec";
import { sqlDataType } from "@prisma/orm-family-sql/contract/data-type";
import { pgText } from "@prisma/orm-target-postgres/target/data-types";
import { assertValidLtree } from "./codecs-validation";

const readLtree: DataTypeReader = (json) => {
  if (typeof json !== "string") {
    return refuseJsonValue("ltree/ltree", "an ltree path string", json);
  }
  try {
    assertValidLtree(json);
  } catch {
    return refuseJsonValue("ltree/ltree", "a valid ltree path string", json);
  }
  return json;
};

export const ltreeDataType = sqlDataType("ltree/ltree", {
  read: readLtree,
  texts: [{ text: "ltree", written: true, catalog: true }],
  casts: {
    [pgText.id]: (value) => value,
  },
});

const readLtreeArray: DataTypeReader = (json) => {
  const expected = "an array of ltree path strings";
  if (!Array.isArray(json)) {
    return refuseJsonValue("ltree/ltree-array", expected, json);
  }
  for (const entry of json) {
    if (typeof entry !== "string") {
      return refuseJsonValue("ltree/ltree-array", expected, entry);
    }
    try {
      assertValidLtree(entry);
    } catch {
      return refuseJsonValue("ltree/ltree-array", expected, entry);
    }
  }
  return json;
};

/**
 * `sqlDataType` accepts parentheses in a type name and refuses square brackets.
 * PostgreSQL writes this type as `ltree[]`, and `format_type` reports `ltree[]`.
 * Declare the type first, then set that text so a migration and a catalog check use it.
 */
const ltreeArrayDeclared = sqlDataType("ltree/ltree-array", {
  read: readLtreeArray,
  listCast: {
    of: [pgText.id],
    cast: (elements) => [...elements],
  },
});

export const ltreeArrayDataType = {
  ...ltreeArrayDeclared,
  sql: {
    ...ltreeArrayDeclared.sql,
    texts: [{ text: "ltree[]", written: true as const, catalog: true as const }],
  },
} as typeof ltreeArrayDeclared;

export const ltreeDataTypes: readonly DataType[] = [ltreeDataType, ltreeArrayDataType];
