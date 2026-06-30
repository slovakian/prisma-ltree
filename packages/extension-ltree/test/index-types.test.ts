import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";
import ltreePackMeta from "../src/exports/pack";
import { ltreeIndexTypes } from "../src/types/index-types";

describe("prisma-ltree index types", () => {
  describe("ltreePackMeta wiring", () => {
    it("declares the ltree.gist capability alongside ltree.path", () => {
      expect(ltreePackMeta.capabilities).toEqual({
        postgres: {
          "ltree.path": true,
          "ltree.gist": true,
        },
      });
    });

    it("publishes the ltreeIndexTypes registration on the pack descriptor", () => {
      expect(ltreePackMeta.indexTypes).toBe(ltreeIndexTypes);
    });

    it("exposes exactly one gist entry through the pack descriptor", () => {
      expect(ltreePackMeta.indexTypes.entries).toHaveLength(1);
      expect(ltreePackMeta.indexTypes.entries[0]?.type).toBe("gist");
    });
  });

  describe("ltreeIndexTypes", () => {
    it("declares a single gist entry", () => {
      expect(ltreeIndexTypes.entries.map((e) => e.type)).toEqual(["gist"]);
    });

    it("accepts an empty options object (default GiST has no storage params)", () => {
      const entry = ltreeIndexTypes.entries[0];
      if (!entry) throw new Error("expected gist entry");
      const result = entry.options({});
      expect(result instanceof type.errors).toBe(false);
    });

    it("rejects any unknown option key (closed shape)", () => {
      const entry = ltreeIndexTypes.entries[0];
      if (!entry) throw new Error("expected gist entry");
      const result = entry.options({ siglen: 100 });
      expect(result instanceof type.errors).toBe(true);
    });

    it("rejects a non-object options value", () => {
      const entry = ltreeIndexTypes.entries[0];
      if (!entry) throw new Error("expected gist entry");
      const result = entry.options("nope");
      expect(result instanceof type.errors).toBe(true);
    });
  });
});
