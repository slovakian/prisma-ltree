import { EMPTY_CONTRACT_HASH } from "@prisma/orm-toolchain/migration-tools/constants";
import { computeMigrationHash } from "@prisma/orm-toolchain/migration-tools/hash";
import {
  findPathWithDecision,
  reconstructGraph,
} from "@prisma/orm-toolchain/migration-tools/migration-graph";
import { assertDescriptorSelfConsistency } from "@prisma/orm-toolchain/migration-tools/spaces";
import { sqlContractCanonicalizationHooks } from "@prisma/orm-family-sql/contract/canonicalization-hooks";
import { describe, expect, it } from "vite-plus/test";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "../src/core/constants";
import {
  LTREE_ARRAY_STORAGE_TYPE,
  LTREE_BASELINE_MIGRATION_NAME,
  LTREE_CREATE_EXTENSION_MIGRATION_NAME,
  LTREE_DECLARE_EXTENSION_MIGRATION_NAME,
  LTREE_INVARIANTS,
  LTREE_NATIVE_TYPE,
  LTREE_SPACE_ID,
} from "../src/core/contract-space-constants";
import { ltreeArrayDataType, ltreeDataType } from "../src/core/data-types";
import ltreeExtensionDescriptor from "../src/exports/control";

const space = ltreeExtensionDescriptor.contractSpace!;
const headHash = space.contractJson.storage.storageHash;

function migration(dirName: string) {
  const found = space.migrations.find((m) => m.dirName === dirName);
  if (found === undefined) throw new Error(`no migration ${dirName}`);
  return found;
}

describe("prisma-ltree extension descriptor (contract-space package layout)", () => {
  it("identifies as a SQL extension targeted at postgres", () => {
    expect(ltreeExtensionDescriptor).toMatchObject({
      kind: "extension",
      id: LTREE_SPACE_ID,
      familyId: "sql",
      targetId: "postgres",
    });
  });

  it("exposes a contractSpace declaring the ltree data types", () => {
    expect(space).toBeDefined();
    const namespaces = space.contractJson.storage.namespaces as Record<
      string,
      { readonly entries: Record<string, Record<string, unknown>> }
    >;
    expect(namespaces["public"]?.entries["extension"]).toEqual({
      ltree: { kind: "extension", name: "ltree" },
    });
    expect(space.contractJson.storage.types).toBeDefined();
    expect(space.contractJson.storage.types?.[LTREE_NATIVE_TYPE]).toMatchObject({
      codecId: LTREE_CODEC_ID,
      dataType: ltreeDataType.id,
    });
    expect(space.contractJson.storage.types?.[LTREE_ARRAY_STORAGE_TYPE]).toMatchObject({
      codecId: LTREE_ARRAY_CODEC_ID,
      dataType: ltreeArrayDataType.id,
    });
  });

  it("keeps the old install migration, which records the install invariant", () => {
    const baseline = migration(LTREE_BASELINE_MIGRATION_NAME);
    expect(baseline.metadata.from).toBeNull();
    expect(baseline.metadata.to).not.toBe(headHash);
    expect(baseline.metadata.providedInvariants).toEqual([LTREE_INVARIANTS.installLtree]);
  });

  it("baseline ops carry the installLtree op with the stable invariantId", () => {
    const baseline = migration(LTREE_BASELINE_MIGRATION_NAME);
    const opIds = baseline.ops.map((op) => op.invariantId).filter(Boolean);
    expect(opIds).toEqual([LTREE_INVARIANTS.installLtree]);
  });

  it("namespaces every baseline op invariantId under ltree:*", () => {
    const baseline = migration(LTREE_BASELINE_MIGRATION_NAME);
    const ids = baseline.ops.map((op) => op.invariantId).filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(id).toMatch(/^ltree:/);
    }
  });

  it("the install-ltree op carries the CREATE EXTENSION DDL + postcondition", () => {
    const baseline = migration(LTREE_BASELINE_MIGRATION_NAME);
    const installOp = baseline.ops.find(
      (op) => op.invariantId === LTREE_INVARIANTS.installLtree,
    ) as
      | {
          readonly precheck?: ReadonlyArray<{
            readonly sql: string;
            readonly params?: ReadonlyArray<unknown>;
          }>;
          readonly execute?: ReadonlyArray<{ readonly sql: string }>;
          readonly postcheck?: ReadonlyArray<{
            readonly sql: string;
            readonly params?: ReadonlyArray<unknown>;
          }>;
        }
      | undefined;
    expect(installOp).toBeDefined();
    expect(installOp!.execute?.[0]?.sql).toBe("CREATE EXTENSION IF NOT EXISTS ltree");
    expect(installOp!.postcheck?.[0]?.sql).toContain('"extname" = $1');
    expect(installOp!.postcheck?.[0]?.params).toEqual(["ltree"]);
    expect(installOp!.precheck?.[0]?.sql).toContain('"extname" = $1');
    expect(installOp!.precheck?.[0]?.params).toEqual(["ltree"]);
  });

  it("moves the first head to the current head by creating the extension if missing", () => {
    const upgrade = migration(LTREE_DECLARE_EXTENSION_MIGRATION_NAME);
    expect(upgrade.metadata).toMatchObject({
      from: migration(LTREE_BASELINE_MIGRATION_NAME).metadata.to,
      to: headHash,
      providedInvariants: [],
    });
    expect(upgrade.ops.map((op) => [op.id, op.invariantId])).toEqual([
      ["extension.ltree", undefined],
    ]);
  });

  it("builds a new database in one migration that records no invariant", () => {
    const install = migration(LTREE_CREATE_EXTENSION_MIGRATION_NAME);
    expect(install.metadata).toMatchObject({
      from: null,
      to: headHash,
      providedInvariants: [],
    });
    expect(install.ops.map((op) => op.id)).toEqual(["schema.public", "extension.ltree"]);
  });

  it("takes an empty database to the head through the one-step migration", () => {
    const graph = reconstructGraph(space.migrations.map((m) => ({ ...m, dirPath: m.dirName })));
    const outcome = findPathWithDecision(graph, EMPTY_CONTRACT_HASH, headHash, {
      required: new Set(space.headRef.invariants),
    });
    expect(
      outcome.kind === "ok" ? outcome.decision.selectedPath.map((edge) => edge.dirName) : outcome,
    ).toEqual([LTREE_CREATE_EXTENSION_MIGRATION_NAME]);
  });

  it("points the head ref at the contract and requires no invariant", () => {
    expect(space.headRef).toEqual({ hash: headHash, invariants: [] });
  });

  it("records each migration's hash of its contents", () => {
    const hashes = (hash: (m: (typeof space.migrations)[number]) => string) =>
      Object.fromEntries(space.migrations.map((m) => [m.dirName, hash(m)]));
    expect(space.migrations).toHaveLength(3);
    expect(hashes((m) => computeMigrationHash(m.metadata, m.ops))).toEqual(
      hashes((m) => m.metadata.migrationHash),
    );
  });

  it("exposes query operations through the control descriptor", () => {
    const ops = ltreeExtensionDescriptor.queryOperations!();
    expect(Object.keys(ops)).toContain("isAncestorOf");
  });

  it("create() reports the sql/postgres family + target", () => {
    expect(ltreeExtensionDescriptor.create()).toEqual({
      familyId: "sql",
      targetId: "postgres",
    });
  });

  it("registers identical control-plane hooks for both ltree codecs", () => {
    const hooks = ltreeExtensionDescriptor.types!.codecTypes!.controlPlaneHooks as Record<
      string,
      {
        readonly resolveIdentityValue: () => unknown;
      }
    >;
    for (const codecId of [LTREE_CODEC_ID, LTREE_ARRAY_CODEC_ID]) {
      const hook = hooks[codecId]!;
      expect(hook.resolveIdentityValue()).toBeNull();
    }
  });

  it("self-consistency check passes — headRef.hash matches re-derived storage hash", () => {
    expect(() =>
      assertDescriptorSelfConsistency({
        extensionId: LTREE_SPACE_ID,
        target: space.contractJson.target,
        targetFamily: space.contractJson.targetFamily,
        storage: space.contractJson.storage as unknown as Record<string, unknown>,
        headRefHash: space.headRef.hash,
        ...sqlContractCanonicalizationHooks,
      }),
    ).not.toThrow();
  });
});
