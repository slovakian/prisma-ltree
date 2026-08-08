import postgresAdapterControlDescriptor from "@prisma/orm-target-postgres/adapter/control";
import postgresRuntimeAdapterDescriptor from "@prisma/orm-target-postgres/adapter/runtime";
import sqlFamilyDescriptor from "@prisma/orm-family-sql/family/control";
import type { SqlControlAdapter } from "@prisma/orm-family-sql/family/control-adapter";
import type { ControlExtensionDescriptor } from "@prisma/orm-framework/components/control";
import { createControlStack } from "@prisma/orm-framework/components/control";
import type {
  RuntimeExtensionDescriptor,
  RuntimeTargetDescriptor,
} from "@prisma/orm-framework/components/execution";
import postgresTargetControlDescriptor from "@prisma/orm-target-postgres/target/control";

const stubRuntimeTarget: RuntimeTargetDescriptor<"sql", "postgres"> = {
  kind: "target",
  id: "postgres",
  version: "0.0.1",
  familyId: "sql",
  targetId: "postgres",
  create() {
    return { familyId: "sql", targetId: "postgres" };
  },
};

/**
 * Build a stack-composed Postgres runtime adapter for tests that exercise
 * extension codecs (e.g. `pg/ltree@1`). The bare `createPostgresAdapter()`
 * factory cannot see extension codecs by design (ADR 205), so any test that
 * lowers a `ParamRef` carrying an extension-codec id must compose a stack
 * with the relevant extension pack(s). Mirrors the pgvector reference helper.
 */
export function createComposedPostgresAdapter(options: {
  readonly extensions: readonly RuntimeExtensionDescriptor<"sql", "postgres">[];
}) {
  return postgresRuntimeAdapterDescriptor.create({
    target: stubRuntimeTarget,
    adapter: postgresRuntimeAdapterDescriptor,
    driver: undefined,
    extensions: options.extensions,
  });
}

/**
 * Build a stack-composed Postgres control adapter for tests that exercise
 * extension codecs on the control plane. Mirrors the pgvector reference helper.
 */
export function createComposedPostgresControlAdapter(options: {
  readonly extensions: readonly ControlExtensionDescriptor<"sql", "postgres">[];
}): SqlControlAdapter<"postgres"> {
  const stack = createControlStack({
    family: sqlFamilyDescriptor,
    target: postgresTargetControlDescriptor,
    adapter: postgresAdapterControlDescriptor,
    extensions: options.extensions,
  });
  return postgresAdapterControlDescriptor.create(stack) as SqlControlAdapter<"postgres">;
}
