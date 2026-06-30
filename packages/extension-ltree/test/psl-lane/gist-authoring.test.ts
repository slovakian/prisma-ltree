/// <reference types="node" />
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeContractEmit } from "@prisma-next/cli/control-api";
import { afterAll, describe, expect, it } from "vite-plus/test";

const fixtureDir = new URL(".", import.meta.url).pathname;
const tmpDirs: string[] = [];

async function emit(configFile: string): Promise<Record<string, unknown>> {
  const out = await mkdtemp(join(tmpdir(), "ltree-gist-"));
  tmpDirs.push(out);
  await executeContractEmit({ configPath: join(fixtureDir, configFile), outputPath: out });
  return JSON.parse(await readFile(join(out, "contract.json"), "utf-8")) as Record<string, unknown>;
}

type IndexIr = {
  readonly columns: readonly string[];
  readonly name?: string;
  readonly type?: string;
  readonly options?: Record<string, unknown>;
};

function pageIndexes(contract: Record<string, unknown>): readonly IndexIr[] {
  const storage = contract["storage"] as {
    namespaces: {
      public: { entries: { table: { page: { indexes: readonly IndexIr[] } } } };
    };
  };
  return storage.namespaces.public.entries.table.page.indexes;
}

afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("GiST index authoring", () => {
  it('TS lane: lowers constraints.index({ type: "gist" }) to GiST index IR', async () => {
    const contract = await emit("gist-ts.config.ts");
    const indexes = pageIndexes(contract);

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columns: ["path"], name: "page_path_gist_idx", type: "gist" }),
        expect.objectContaining({
          columns: ["breadcrumbs"],
          name: "page_breadcrumbs_gist_idx",
          type: "gist",
        }),
      ]),
    );
    // Default GiST carries no storage parameters; empty options are dropped.
    for (const idx of indexes) {
      expect(idx.options).toBeUndefined();
    }
  });

  // The `gist` index type is registered on the pack/control descriptor, so the
  // TS lane (which threads the pack ref through `defineContract`) validates it.
  //
  // The PSL lane via `@prisma-next/postgres/config` does NOT yet validate it:
  // that `defineConfig` does not forward extension descriptors to the PSL
  // provider's `composedExtensionPackRefs`, so the index-type registry is built
  // without the extension's `indexTypes`. This test pins that known upstream
  // limitation; when prisma-next threads the refs, the emit will succeed and
  // this expectation should be flipped to assert the same GiST IR as the TS lane.
  it("PSL lane: currently blocked upstream — emit rejects the unregistered gist type", async () => {
    let caught: unknown;
    try {
      await emit("gist-psl.config.ts");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    // The detailed reason lives on the structured error (message + `why`).
    const serialized = JSON.stringify(caught, Object.getOwnPropertyNames(caught as object));
    expect(serialized).toMatch(/unregistered index type.*gist/);
  });
});
