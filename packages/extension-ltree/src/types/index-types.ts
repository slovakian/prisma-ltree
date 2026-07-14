import { defineIndexTypes } from "@prisma-next/sql-contract/index-types";
import { type } from "arktype";

/**
 * GiST index type for `ltree` / `ltree[]` columns.
 *
 * Lowers to `CREATE INDEX … USING gist (…)` — PostgreSQL selects
 * `gist_ltree_ops` / `gist__ltree_ops` from the column type. Custom
 * operator-class parameters such as `siglen` are not modeled yet; see
 * ADR-006.
 */
export const ltreeIndexTypes = defineIndexTypes().add("gist", {
  options: type({
    "+": "reject",
  }),
});

export type IndexTypes = typeof ltreeIndexTypes.IndexTypes;
