/**
 * Data types this extension owns.
 *
 * `ltree` and `ltree[]` are PostgreSQL types the target does not register.
 * A path's canonical form is its label text. An array's canonical form is a
 * JSON array of those texts. Both accept text the contract can already write.
 */

import { type DataType, dataType } from "@prisma/orm-framework/components/codec";
import { pgText } from "@prisma/orm-target-postgres/target/data-types";

export const ltreeDataType: DataType = dataType("ltree/ltree", {
  casts: {
    [pgText.id]: (value) => value,
  },
});

export const ltreeArrayDataType: DataType = dataType("ltree/ltree-array", {
  listCast: {
    of: [pgText.id],
    cast: (elements) => [...elements],
  },
});

export const ltreeDataTypes: readonly DataType[] = [ltreeDataType, ltreeArrayDataType];
