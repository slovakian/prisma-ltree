/// <reference types="node" />
import { rm } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { emitFixture } from "./emit-fixture";
import tsContract from "./gist-index/contract";

const fixtureDir = new URL("./gist-index/", import.meta.url).pathname;
const tmpDirs: string[] = [];

type IndexNode = {
  readonly name?: string;
  readonly columns?: readonly string[];
  readonly type?: string;
};

type PageTable = {
  readonly indexes: readonly IndexNode[];
};

async function emitPsl(): Promise<Record<string, unknown>> {
  return emitFixture(fixtureDir, "prisma.config.ts", "ltree-gist-index-", tmpDirs);
}

function pageIndexes(contract: unknown): readonly IndexNode[] {
  const storage = (contract as Record<string, unknown>)["storage"] as {
    namespaces: { public: { entries: { table: { page: PageTable } } } };
  };
  return storage.namespaces.public.entries.table.page.indexes;
}

afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("GiST indexes on ltree columns", () => {
  it("PSL @@index type gist emits GiST IR for ltree and ltree[] columns", async () => {
    const indexes = pageIndexes(await emitPsl());
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "page_path_gist_idx",
          columns: ["path"],
          type: "gist",
        }),
        expect.objectContaining({
          name: "page_breadcrumbs_gist_idx",
          columns: ["breadcrumbs"],
          type: "gist",
        }),
      ]),
    );
  });

  it("TS constraints.index type gist emits GiST IR for ltree and ltree[] columns", () => {
    const indexes = pageIndexes(tsContract);
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "page_path_gist_idx",
          columns: ["path"],
          type: "gist",
        }),
        expect.objectContaining({
          name: "page_breadcrumbs_gist_idx",
          columns: ["breadcrumbs"],
          type: "gist",
        }),
      ]),
    );
  });
});
