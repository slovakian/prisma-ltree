/**
 * Data types this extension owns.
 *
 * `ltree` and `ltree[]` are PostgreSQL types the target does not register.
 * A path's canonical form is its label text. An array's canonical form is a
 * JSON array of those texts. Both accept text the contract can already write.
 * The texts are what a migration writes and what the catalog reports.
 */

import type { DataType } from "@prisma/orm-framework/components/codec";
import { sqlDataType } from "@prisma/orm-family-sql/contract/data-type";
import { pgText } from "@prisma/orm-target-postgres/target/data-types";

export const ltreeDataType = sqlDataType("ltree/ltree", {
  texts: [{ text: "ltree", written: true, catalog: true }],
  casts: {
    [pgText.id]: (value) => value,
  },
});

/**
 * `sqlDataType` accepts parentheses in a type name and refuses square brackets.
 * PostgreSQL writes this type as `ltree[]`, and `format_type` reports `ltree[]`.
 * Declare the type first, then set that text so a migration and a catalog check use it.
 */
const ltreeArrayDeclared = sqlDataType("ltree/ltree-array", {
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
