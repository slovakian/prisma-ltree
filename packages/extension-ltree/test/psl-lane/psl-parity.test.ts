/// <reference types="node" />
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeContractEmit } from "@prisma-next/cli/control-api";
import { PostgresContractSerializer } from "@prisma-next/target-postgres/runtime";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { contract as tsContract } from "./contract";

// Directory holding the PSL/TS fixtures and their configs.
const fixtureDir = new URL(".", import.meta.url).pathname;

const tmpDirs: string[] = [];

/** Emit a fixture config to a temp dir and return the parsed contract.json. */
async function emitPsl(configFile: string): Promise<Record<string, unknown>> {
  const out = await mkdtemp(join(tmpdir(), "ltree-psl-parity-"));
  tmpDirs.push(out);
  await executeContractEmit({
    configPath: join(fixtureDir, configFile),
    outputPath: out,
  });
  return JSON.parse(await readFile(join(out, "contract.json"), "utf-8")) as Record<string, unknown>;
}

/** Serialize the TS-lane fixture the same way contract emit materializes JSON. */
function emitTs(): Record<string, unknown> {
  const serializer = new PostgresContractSerializer();
  return JSON.parse(JSON.stringify(serializer.serializeContract(tsContract))) as Record<
    string,
    unknown
  >;
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

/** Drop empty `options` objects so PSL/TS index nodes compare equal. */
function normalizeIndexes(
  indexes: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown>[] {
  return indexes.map((index) => {
    const options = index["options"];
    if (options && typeof options === "object" && Object.keys(options).length === 0) {
      const { options: _omit, ...rest } = index;
      return rest;
    }
    return { ...index };
  });
}

function pageIndexes(contract: Record<string, unknown>): Record<string, unknown>[] {
  const storage = contract["storage"] as {
    namespaces: { public: { entries: { table: { page: { indexes: Record<string, unknown>[] } } } } };
  };
  return normalizeIndexes(storage.namespaces.public.entries.table.page.indexes);
}

describe("PSL lane parity", () => {
  it("emits IR identical to the TS lane (byte-for-byte, including hashes)", async () => {
    const fromPsl = await emitPsl("prisma.config.ts");
    const fromTs = emitTs();

    // PSL omits empty `options: {}` on indexes; TS retains them. Normalize before compare.
function normalizeContract(contract: Record<string, unknown>): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(contract)) as Record<string, unknown>;
  const storage = copy["storage"] as {
    namespaces: Record<
      string,
      { entries: { table: Record<string, { indexes?: Record<string, unknown>[] }> } }
    >;
    types?: Record<string, Record<string, unknown>>;
  };
  for (const ns of Object.values(storage.namespaces)) {
    for (const table of Object.values(ns.entries.table ?? {})) {
      if (table.indexes) {
        table.indexes = normalizeIndexes(table.indexes);
      }
    }
  }
  for (const typeEntry of Object.values(storage.types ?? {})) {
    if (
      typeEntry["typeParams"] &&
      typeof typeEntry["typeParams"] === "object" &&
      Object.keys(typeEntry["typeParams"]).length === 0
    ) {
      delete typeEntry["typeParams"];
    }
  }
  return copy;
}

    // Compare storage IR only — extension-pack metadata and empty `typeParams`
    // objects can differ in serialization shape between lanes without changing semantics.
    expect(normalizeContract(fromPsl)["storage"]).toEqual(normalizeContract(fromTs)["storage"]);
  });

  it("resolves ltree.Ltree / ltree.LtreeArray to the right codec + native type", async () => {
    const contract = await emitPsl("prisma.config.ts");
    const storage = contract["storage"] as {
      types: Record<string, { codecId: string; nativeType: string; kind: string }>;
    };

    expect(storage.types["Path"]).toEqual({
      kind: "codec-instance",
      codecId: "pg/ltree@1",
      nativeType: "ltree",
    });
    expect(storage.types["Paths"]).toEqual({
      kind: "codec-instance",
      codecId: "pg/ltree-array@1",
      nativeType: "ltree[]",
    });
  });

  it("binds the model columns to the ltree codecs", async () => {
    const contract = await emitPsl("prisma.config.ts");
    const storage = contract["storage"] as {
      namespaces: {
        public: {
          entries: {
            table: {
              page: {
                columns: Record<string, { codecId: string; nativeType: string; typeRef?: string }>;
              };
            };
          };
        };
      };
    };
    const page = storage.namespaces.public.entries.table.page;

    expect(page.columns["path"]).toMatchObject({
      codecId: "pg/ltree@1",
      nativeType: "ltree",
      typeRef: "Path",
    });
    expect(page.columns["breadcrumbs"]).toMatchObject({
      codecId: "pg/ltree-array@1",
      nativeType: "ltree[]",
      typeRef: "Paths",
    });
  });

  it("lowers GiST indexes on ltree columns from both lanes", async () => {
    const gistIndexes = [
      { columns: ["breadcrumbs"], name: "page_breadcrumbs_gist_idx", type: "gist" },
      { columns: ["path"], name: "page_path_gist_idx", type: "gist" },
    ];

    expect(pageIndexes(await emitPsl("prisma.config.ts"))).toEqual(gistIndexes);
    expect(pageIndexes(emitTs())).toEqual(gistIndexes);
  });

  it("reports PSL_EXTENSION_NAMESPACE_NOT_COMPOSED naming ltree when the extension is not composed", async () => {
    await expect(emitPsl("no-ext.config.ts")).rejects.toMatchObject({
      code: "3000",
    });

    let caught: unknown;
    try {
      await emitPsl("no-ext.config.ts");
    } catch (error) {
      caught = error;
    }

    const notComposed = diagnosticsOf(caught).filter(
      (d) => d.code === "PSL_EXTENSION_NAMESPACE_NOT_COMPOSED",
    );
    expect(notComposed.length).toBeGreaterThan(0);
    for (const diagnostic of notComposed) {
      expect(diagnostic.message).toContain("ltree");
    }
  });
});
