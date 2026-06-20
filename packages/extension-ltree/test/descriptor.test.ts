import { UNBOUND_NAMESPACE_ID } from "@prisma-next/framework-components/ir";
import { assertDescriptorSelfConsistency } from "@prisma-next/migration-tools/spaces";
import { sqlContractCanonicalizationHooks } from "@prisma-next/sql-contract/canonicalization-hooks";
import { describe, expect, it } from "vite-plus/test";
import { LTREE_ARRAY_CODEC_ID, LTREE_CODEC_ID } from "../src/core/constants";
import {
  LTREE_ARRAY_NATIVE_TYPE,
  LTREE_ARRAY_STORAGE_TYPE,
  LTREE_BASELINE_MIGRATION_NAME,
  LTREE_INVARIANTS,
  LTREE_NATIVE_TYPE,
  LTREE_SPACE_ID,
} from "../src/core/contract-space-constants";
import ltreeExtensionDescriptor from "../src/exports/control";

describe("prisma-ltree extension descriptor (contract-space package layout)", () => {
  it("identifies as a SQL extension targeted at postgres", () => {
    expect(ltreeExtensionDescriptor).toMatchObject({
      kind: "extension",
      id: LTREE_SPACE_ID,
      familyId: "sql",
      targetId: "postgres",
    });
  });

  it("exposes a contractSpace declaring the ltree native type", () => {
    const space = ltreeExtensionDescriptor.contractSpace;
    expect(space).toBeDefined();
    const namespaces = space!.contractJson.storage.namespaces as Record<
      string,
      { readonly entries: Record<string, Record<string, unknown>> }
    >;
    expect(Object.keys(namespaces[UNBOUND_NAMESPACE_ID]?.entries["table"] ?? {})).toEqual([]);
    expect(space!.contractJson.storage.types).toBeDefined();
    expect(space!.contractJson.storage.types?.[LTREE_NATIVE_TYPE]).toMatchObject({
      codecId: LTREE_CODEC_ID,
      nativeType: LTREE_NATIVE_TYPE,
    });
    expect(space!.contractJson.storage.types?.[LTREE_ARRAY_STORAGE_TYPE]).toMatchObject({
      codecId: LTREE_ARRAY_CODEC_ID,
      nativeType: LTREE_ARRAY_NATIVE_TYPE,
    });
  });

  it("publishes one baseline migration sourced from the on-disk emit pipeline", () => {
    const space = ltreeExtensionDescriptor.contractSpace!;
    expect(space.migrations).toHaveLength(1);
    const baseline = space.migrations[0]!;
    expect(baseline.dirName).toBe(LTREE_BASELINE_MIGRATION_NAME);
    expect(baseline.metadata.from).toBeNull();
    expect(baseline.metadata.to).toBe(space.contractJson.storage.storageHash);
  });

  it("baseline ops carry the installLtree op with the stable invariantId", () => {
    const baseline = ltreeExtensionDescriptor.contractSpace!.migrations[0]!;
    const opIds = baseline.ops.map((op) => op.invariantId).filter(Boolean);
    expect(opIds).toEqual([LTREE_INVARIANTS.installLtree]);
  });

  it("namespaces every baseline op invariantId under ltree:*", () => {
    const baseline = ltreeExtensionDescriptor.contractSpace!.migrations[0]!;
    const ids = baseline.ops.map((op) => op.invariantId).filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(id).toMatch(/^ltree:/);
    }
  });

  it("the install-ltree op carries the CREATE EXTENSION DDL + postcondition", () => {
    const baseline = ltreeExtensionDescriptor.contractSpace!.migrations[0]!;
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

  it("points the head ref at the latest migration's destination hash", () => {
    const space = ltreeExtensionDescriptor.contractSpace!;
    expect(space.headRef.hash).toBe(space.migrations[0]!.metadata.to);
    expect([...space.headRef.invariants].sort()).toEqual(
      [...space.migrations[0]!.metadata.providedInvariants].sort(),
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
        readonly expandNativeType: (arg: { readonly nativeType: string }) => string;
        readonly resolveIdentityValue: () => unknown;
      }
    >;
    for (const codecId of [LTREE_CODEC_ID, LTREE_ARRAY_CODEC_ID]) {
      const hook = hooks[codecId]!;
      expect(hook.expandNativeType({ nativeType: LTREE_NATIVE_TYPE })).toBe(LTREE_NATIVE_TYPE);
      expect(hook.resolveIdentityValue()).toBeNull();
    }
  });

  it("self-consistency check passes — headRef.hash matches re-derived storage hash", () => {
    const space = ltreeExtensionDescriptor.contractSpace!;
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
