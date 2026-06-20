import { describe, expect, it } from "vite-plus/test";
import ltreePack from "../src/exports/pack";

describe("prisma-ltree pack authoring contributions", () => {
  it("exposes a namespaced ltree.Ltree type constructor", () => {
    expect(ltreePack.authoring?.type).toMatchObject({
      ltree: {
        Ltree: {
          kind: "typeConstructor",
          output: {
            codecId: "pg/ltree@1",
            nativeType: "ltree",
          },
        },
      },
    });
  });

  it("exposes a namespaced ltree.LtreeArray type constructor", () => {
    expect(ltreePack.authoring?.type).toMatchObject({
      ltree: {
        LtreeArray: {
          kind: "typeConstructor",
          output: {
            codecId: "pg/ltree-array@1",
            nativeType: "ltree[]",
          },
        },
      },
    });
  });

  it("Ltree type constructor has no args (non-parameterized)", () => {
    const ltreeType = ltreePack.authoring?.type?.ltree?.Ltree as
      | { readonly args?: readonly unknown[] }
      | undefined;
    expect(ltreeType?.args).toBeUndefined();
  });
});
