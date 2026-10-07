/// <reference types="node" />
import { rm } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { emitFixture } from "./emit-fixture";

// Directory holding the PSL/TS fixtures and their configs.
const fixtureDir = new URL(".", import.meta.url).pathname;

const tmpDirs: string[] = [];

/** Emit a fixture config to a temp dir and return the parsed contract.json. */
async function emit(configFile: string): Promise<Record<string, unknown>> {
  return emitFixture(fixtureDir, configFile, "ltree-psl-parity-", tmpDirs);
}

type Diagnostic = { readonly code: string; readonly message: string };

/** Pull the framework diagnostics out of a failed-emit structured error. */
function diagnosticsOf(error: unknown): readonly Diagnostic[] {
  const meta = (error as { meta?: { diagnostics?: readonly Diagnostic[] } }).meta;
  return meta?.diagnostics ?? [];
}

afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("PSL lane parity", () => {
  it("emits IR identical to the TS lane (byte-for-byte, including hashes)", async () => {
    const fromPsl = await emit("prisma.config.ts");
    const fromTs = await emit("ts.config.ts");

    // The two authoring surfaces lower to the same Contract IR. No source-path
    // normalization is needed: emit threads no per-lane metadata
    // into contract.json, so even profileHash/storageHash match.
    expect(fromPsl).toEqual(fromTs);
  });

  it("resolves ltree.Ltree / ltree.LtreeArray to the right codec and data type", async () => {
    const contract = await emit("prisma.config.ts");
    const storage = contract["storage"] as {
      types: Record<string, { codecId: string; dataType: string; kind: string }>;
    };

    expect(storage.types["Path"]).toEqual({
      kind: "codec-instance",
      codecId: "pg/ltree@1",
      dataType: "ltree/ltree",
    });
    expect(storage.types["Paths"]).toEqual({
      kind: "codec-instance",
      codecId: "pg/ltree-array@1",
      dataType: "ltree/ltree-array",
    });
  });

  it("binds the model columns to the ltree codecs", async () => {
    const contract = await emit("prisma.config.ts");
    const storage = contract["storage"] as {
      namespaces: {
        public: {
          entries: {
            table: {
              page: {
                columns: Record<string, { codecId: string; dataType: string; typeRef?: string }>;
              };
            };
          };
        };
      };
    };
    const page = storage.namespaces.public.entries.table.page;

    expect(page.columns["path"]).toMatchObject({
      codecId: "pg/ltree@1",
      dataType: "ltree/ltree",
      typeRef: "Path",
    });
    expect(page.columns["breadcrumbs"]).toMatchObject({
      codecId: "pg/ltree-array@1",
      dataType: "ltree/ltree-array",
      typeRef: "Paths",
    });
  });

  it("reports PSL_UNSUPPORTED_NAMED_TYPE_CONSTRUCTOR naming ltree when the extension is not composed", async () => {
    await expect(emit("no-ext.config.ts")).rejects.toMatchObject({
      code: "CONTRACT.SOURCE_LOAD_FAILED",
    });

    let caught: unknown;
    try {
      await emit("no-ext.config.ts");
    } catch (error) {
      caught = error;
    }

    const unsupported = diagnosticsOf(caught).filter(
      (d) => d.code === "PSL_UNSUPPORTED_NAMED_TYPE_CONSTRUCTOR",
    );
    expect(unsupported.length).toBeGreaterThan(0);
    for (const diagnostic of unsupported) {
      expect(diagnostic.message).toContain("ltree");
    }
  });
});
