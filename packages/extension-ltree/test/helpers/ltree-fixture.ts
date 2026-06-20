import type { PostgresContract } from "@prisma-next/adapter-postgres/types";
import { UNBOUND_DOMAIN_NAMESPACE_ID } from "@prisma-next/contract/types";
import { SqlContractSerializer } from "@prisma-next/family-sql/ir";
import { UNBOUND_NAMESPACE_ID } from "@prisma-next/framework-components/ir";
import type { AnyExpression, LoweredStatement } from "@prisma-next/sql-relational-core/ast";
import { ColumnRef } from "@prisma-next/sql-relational-core/ast";

/**
 * A minimal Postgres contract declaring a `node(id int4, path ltree)` table so
 * the renderer's codec lookup resolves `pg/ltree@1` -> native `ltree`. Shared by
 * the ltree PGlite integration tests.
 */
export function createLtreeContract(): PostgresContract {
  return new SqlContractSerializer().deserializeContract({
    target: "postgres",
    targetFamily: "sql",
    profileHash: "sha256:test-profile",
    roots: {},
    capabilities: {},
    extensionPacks: {},
    meta: {},
    storage: {
      storageHash: "sha256:test-core",
      namespaces: {
        [UNBOUND_NAMESPACE_ID]: {
          id: UNBOUND_NAMESPACE_ID,
          entries: {
            table: {
              node: {
                columns: {
                  id: { codecId: "pg/int4@1", nativeType: "int4", nullable: false },
                  path: { codecId: "pg/ltree@1", nativeType: "ltree", nullable: false },
                  paths: { codecId: "pg/ltree-array@1", nativeType: "ltree[]", nullable: false },
                },
                uniques: [],
                indexes: [],
                foreignKeys: [],
              },
            },
          },
        },
      },
    },
    domain: { namespaces: { [UNBOUND_DOMAIN_NAMESPACE_ID]: { models: {} } } },
  }) as PostgresContract;
}

/** Wrap a `node.<col>` column as a codec-bound `self` expression for op impls. */
export function ltreeColumn(col: string): AnyExpression {
  return {
    codec: { codecId: "pg/ltree@1" },
    returnType: { codecId: "pg/ltree@1", nullable: false },
    buildAst: () => ColumnRef.of("node", col),
  } as unknown as AnyExpression;
}

/** Wrap a `node.<col>` `ltree[]` column as the array-receiver `self` (ADR-003). */
export function ltreeArrayColumn(col: string): AnyExpression {
  return {
    codec: { codecId: "pg/ltree-array@1" },
    returnType: { codecId: "pg/ltree-array@1", nullable: false },
    buildAst: () => ColumnRef.of("node", col),
  } as unknown as AnyExpression;
}

/** Resolve a lowered statement's params (all literals in these tests) to wire values. */
export function paramValues(stmt: LoweredStatement): unknown[] {
  return stmt.params.map((p) => {
    if (p.kind === "literal") return p.value;
    throw new Error(`unexpected bind param: ${p.name}`);
  });
}
