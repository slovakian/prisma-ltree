import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";
import { ltreePackMeta } from "../src/core/descriptor-meta";
import { ltreeIndexTypes } from "../src/types/index-types";

describe("ltree gist index types", () => {
  describe("ltreePackMeta", () => {
    it("declares gist capability", () => {
      expect(ltreePackMeta.capabilities).toEqual({
        postgres: {
          "ltree.path": true,
          "ltree/gist": true,
        },
      });
    });

    it("exposes the gist entry in indexTypes", () => {
      expect(ltreePackMeta.indexTypes.entries).toHaveLength(1);
      expect(ltreePackMeta.indexTypes.entries[0]?.type).toBe("gist");
    });
  });

  describe("ltreeIndexTypes", () => {
    it("declares a single gist entry", () => {
      expect(ltreeIndexTypes.entries.map((entry) => entry.type)).toEqual(["gist"]);
    });

    it("accepts an empty options object for default GiST indexes", () => {
      const entry = ltreeIndexTypes.entries[0];
      if (!entry) throw new Error("expected gist entry");
      const result = entry.options({});
      expect(result instanceof type.errors).toBe(false);
    });

    it("rejects unknown gist options (siglen is not modeled yet)", () => {
      const entry = ltreeIndexTypes.entries[0];
      if (!entry) throw new Error("expected gist entry");
      const result = entry.options({ siglen: 100 });
      expect(result instanceof type.errors).toBe(true);
    });
  });
});
