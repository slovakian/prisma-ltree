import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { closeDb, connectDb, db } from "../../src/prisma/db";
import {
  getGenerationHandler as getGenerationQuery,
  getLineageHandler as getLineageQuery,
  getMrcaViaLcaHandler as getMrcaViaLcaQuery,
  getMrcaViaOpsHandler as getMrcaViaOpsQuery,
  getSubtreeHandler as getSubtreeQuery,
  getTaxaHandler as getTaxaQuery,
  graftTaxonHandler as graftTaxonQuery,
  indexOfBranchHandler as indexOfBranchQuery,
  lineageSliceHandler as lineageSliceQuery,
  lineageSubtreeHandler as lineageSubtreeQuery,
  pruneUserTaxaHandler as pruneUserTaxaQuery,
  searchLqueryHandler as searchLqueryQuery,
  searchLqueryArrayHandler as searchLqueryArrayQuery,
  searchLtxtqueryHandler as searchLtxtqueryQuery,
} from "../../src/server/taxonomy";

// H. sapiens and H. neanderthalensis nest under H. heidelbergensis, modeled as
// their last common ancestor (mainstream paleoanthropology). So both sit at
// depth 8, and lca(sapiens, neanderthalensis) is the extinct heidelbergensis.
const HOMO_HEIDELBERGENSIS =
  "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo.Homo_heidelbergensis";
const HOMO_SAPIENS = `${HOMO_HEIDELBERGENSIS}.Homo_sapiens`;
const HOMO_NEANDERTHALENSIS = `${HOMO_HEIDELBERGENSIS}.Homo_neanderthalensis`;
const MANDRILLUS_SPHINX =
  "Catarrhini.Cercopithecoidea.Cercopithecidae.Cercopithecinae.Mandrillus.Mandrillus_sphinx";
const PAN_TROGLODYTES = "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Pan.Pan_troglodytes";
const HOMINIDAE = "Catarrhini.Hominoidea.Hominidae";
const HOMO = "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo";

const graftedIds: string[] = [];

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  for (const id of graftedIds) {
    const plan = db.sql.public.taxon
      .delete()
      .where((f, fns) => fns.eq(f.id, id))
      .build();
    await db.runtime().execute(plan);
  }
  await closeDb();
});

describe("getTaxa — baseline", () => {
  it("returns all 46 seeded taxa ordered by path ascending", async () => {
    const taxa = await getTaxaQuery();
    expect(taxa).toHaveLength(46);
    expect(taxa[0]!.path).toBe("Catarrhini");
    // ltree path ordering compares label-by-label: Hylobatidae > Hominidae
    // (y > i), so the last path is in the Hylobatidae branch.
    expect(taxa.at(-1)!.path).toBe(
      "Catarrhini.Hominoidea.Hylobatidae.Symphalangus.Symphalangus_syndactylus",
    );
  });
});

describe("getLineage — isAncestorOf (@>)", () => {
  it("returns the ancestors of Homo sapiens ending in Catarrhini", async () => {
    const lineage = await getLineageQuery(HOMO_SAPIENS);
    expect(lineage.length).toBe(8);
    expect(lineage[0]!.path).toBe("Catarrhini");
    expect(lineage.at(-1)!.path).toBe(HOMO_SAPIENS);
    expect(lineage.map((t) => t.path)).toEqual([
      "Catarrhini",
      "Catarrhini.Hominoidea",
      "Catarrhini.Hominoidea.Hominidae",
      "Catarrhini.Hominoidea.Hominidae.Homininae",
      "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini",
      "Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo",
      HOMO_HEIDELBERGENSIS,
      HOMO_SAPIENS,
    ]);
  });
});

describe("getSubtree — isDescendantOf (<@)", () => {
  it("returns all descendants of Hominidae including itself (reflexive <@)", async () => {
    const subtree = await getSubtreeQuery(HOMINIDAE);
    expect(subtree.length).toBeGreaterThanOrEqual(10);
    const self = subtree.find((t) => t.path === HOMINIDAE);
    expect(self).toBeDefined();
    const strictDescendants = subtree.filter((t) => t.path !== HOMINIDAE);
    expect(strictDescendants.every((t) => t.path.startsWith(`${HOMINIDAE}.`))).toBe(true);
    expect(strictDescendants.some((t) => t.scientificName === "Homo sapiens")).toBe(true);
    expect(strictDescendants.some((t) => t.scientificName === "Gorilla gorilla")).toBe(true);
    expect(strictDescendants.some((t) => t.scientificName === "Pongo pygmaeus")).toBe(true);
  });
});

describe("searchLquery — matchesLquery (~)", () => {
  it("returns all paths containing Hominidae for *.Hominidae.*", async () => {
    const results = await searchLqueryQuery("*.Hominidae.*");
    expect(results.length).toBeGreaterThanOrEqual(10);
    expect(results.every((t) => t.path.split(".").includes("Hominidae"))).toBe(true);
    expect(results.some((t) => t.scientificName === "Homo sapiens")).toBe(true);
    expect(results.some((t) => t.scientificName === "Gorilla gorilla")).toBe(true);
    expect(results.some((t) => t.scientificName === "Pongo pygmaeus")).toBe(true);
  });

  it("returns Hominidae itself for *.Hominidae pattern", async () => {
    const results = await searchLqueryQuery("*.Hominidae");
    const hominidae = results.find((t) => t.path === HOMINIDAE);
    expect(hominidae).toBeDefined();
  });
});

describe("searchLqueryArray — matchesLqueryArray (?)", () => {
  it("matches taxa in either Pan or Homo subtrees", async () => {
    const results = await searchLqueryArrayQuery(["*.Pan.*", "*.Homo.*"]);
    expect(results.length).toBeGreaterThanOrEqual(8);
    const panTaxa = results.filter((t) => t.path.split(".").includes("Pan"));
    const homoTaxa = results.filter((t) => t.path.split(".").includes("Homo"));
    expect(panTaxa.length).toBeGreaterThanOrEqual(2);
    expect(homoTaxa.length).toBeGreaterThanOrEqual(2);
    expect(results.some((t) => t.scientificName === "Homo sapiens")).toBe(true);
    expect(results.some((t) => t.scientificName === "Pan troglodytes")).toBe(true);
  });
});

describe("searchLtxtquery — matchesLtxtquery (@)", () => {
  it("returns Homo taxa for Homo & !sapiens (ltxtquery matches whole labels)", async () => {
    const results = await searchLtxtqueryQuery("Homo & !sapiens");
    const homoSpecies = results.filter((t) =>
      t.path.startsWith("Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo."),
    );
    expect(homoSpecies.length).toBe(7);
    expect(homoSpecies.some((t) => t.scientificName === "Homo neanderthalensis")).toBe(true);
    expect(homoSpecies.some((t) => t.scientificName === "Homo erectus")).toBe(true);
    expect(homoSpecies.some((t) => t.scientificName === "Homo habilis")).toBe(true);
    // Homo sapiens is included because ltxtquery `!sapiens` excludes the exact
    // label `sapiens`, not `Homo_sapiens` — the species label is a single ltree
    // label, not two words.
    expect(homoSpecies.some((t) => t.scientificName === "Homo sapiens")).toBe(true);
  });

  it("excludes Homo_sapiens when using the exact label !Homo_sapiens", async () => {
    const results = await searchLtxtqueryQuery("Homo & !Homo_sapiens");
    const homoSpecies = results.filter((t) =>
      t.path.startsWith("Catarrhini.Hominoidea.Hominidae.Homininae.Hominini.Homo."),
    );
    expect(homoSpecies.some((t) => t.scientificName === "Homo sapiens")).toBe(false);
    expect(homoSpecies.some((t) => t.scientificName === "Homo neanderthalensis")).toBe(true);
  });
});

describe("getGeneration — nlevel()", () => {
  it("returns genera Homo, Pan, Gorilla at depth 6 (deeper Hominoidea branch)", async () => {
    const gen6 = await getGenerationQuery(6);
    const scientificNames = gen6.map((t) => t.scientificName);
    // Depth 6 has genera from the deep Hominoidea branch + species from the
    // shallower Cercopithecoidea and Ponginae branches.
    expect(scientificNames).toContain("Homo");
    expect(scientificNames).toContain("Pan");
    expect(scientificNames).toContain("Gorilla");
    // Pongo is at depth 5 (Catarrhini.Hominoidea.Hominidae.Ponginae.Pongo).
    expect(scientificNames).not.toContain("Pongo");
    // Cercopithecoidea species reach depth 6 (their genera are at depth 5).
    expect(scientificNames).toContain("Macaca mulatta");
    expect(scientificNames).toContain("Mandrillus sphinx");
  });

  it("returns species-level nodes at depth 7", async () => {
    const gen7 = await getGenerationQuery(7);
    const scientificNames = gen7.map((t) => t.scientificName);
    // H. heidelbergensis is at depth 7; its children sapiens + neanderthalensis
    // are at depth 8 (see the depth-8 test below).
    expect(scientificNames).toContain("Homo heidelbergensis");
    expect(scientificNames).toContain("Homo erectus");
    expect(scientificNames).toContain("Pan troglodytes");
    expect(scientificNames).toContain("Gorilla gorilla");
    expect(scientificNames).not.toContain("Homo sapiens");
    expect(gen7.every((t) => t.rank === "species")).toBe(true);
  });

  it("returns sapiens + neanderthalensis at depth 8 (nested under heidelbergensis)", async () => {
    const gen8 = await getGenerationQuery(8);
    const scientificNames = gen8.map((t) => t.scientificName);
    expect(scientificNames).toContain("Homo sapiens");
    expect(scientificNames).toContain("Homo neanderthalensis");
    expect(gen8.every((t) => t.rank === "species")).toBe(true);
  });
});

describe("lineageSlice — subpath(self, off, len?)", () => {
  it("returns a subpath of Homo sapiens starting at offset 1 with length 5", async () => {
    const slice = await lineageSliceQuery(HOMO_SAPIENS, 1, 5);
    expect(slice).toBe("Hominoidea.Hominidae.Homininae.Hominini.Homo");
  });

  it("returns from offset to end when len is omitted", async () => {
    const slice = await lineageSliceQuery(HOMO_SAPIENS, 5);
    expect(slice).toBe("Homo.Homo_heidelbergensis.Homo_sapiens");
  });
});

describe("lineageSubtree — subltree(self, start, end)", () => {
  it("returns subltree of Homo sapiens from index 1 to 6 (exclusive)", async () => {
    const slice = await lineageSubtreeQuery(HOMO_SAPIENS, 1, 6);
    expect(slice).toBe("Hominoidea.Hominidae.Homininae.Hominini.Homo");
  });
});

describe("indexOfBranch — indexOf(self, other, offset?)", () => {
  it("returns the starting position of a matching sub-path within Homo sapiens", async () => {
    // index(a, b) returns the 0-indexed position where b's first label appears
    // in a, when b is a sub-path of a. 'Homo.Homo_heidelbergensis' starts at
    // position 5 within the sapiens lineage.
    const idx = await indexOfBranchQuery(HOMO_SAPIENS, "Homo.Homo_heidelbergensis");
    expect(idx).toBe(5);
  });

  it("returns -1 when b is not a sub-path of a (divergent branches)", async () => {
    // Pan_troglodytes diverges from Homo_sapiens at Hominini — not a sub-path.
    const idx = await indexOfBranchQuery(HOMO_SAPIENS, PAN_TROGLODYTES);
    expect(idx).toBe(-1);
  });

  it("returns -1 when there is no match", async () => {
    const idx = await indexOfBranchQuery(HOMO_SAPIENS, "Nonexistent.Taxon");
    expect(idx).toBe(-1);
  });
});

describe("getMrcaViaLca — lca(a, b)", () => {
  it("resolves Catarrhini for (Homo_sapiens, Mandrillus_sphinx)", async () => {
    const mrca = await getMrcaViaLcaQuery(HOMO_SAPIENS, MANDRILLUS_SPHINX);
    expect(mrca).not.toBeNull();
    expect(mrca!.scientificName).toBe("Catarrhini");
    expect(mrca!.path).toBe("Catarrhini");
  });

  it("resolves Hominoidea for (Homo_sapiens, Hylobates_lar)", async () => {
    const mrca = await getMrcaViaLcaQuery(
      HOMO_SAPIENS,
      "Catarrhini.Hominoidea.Hylobatidae.Hylobates.Hylobates_lar",
    );
    expect(mrca).not.toBeNull();
    expect(mrca!.scientificName).toBe("Hominoidea");
  });

  it("resolves Hominini for (Homo_sapiens, Pan_troglodytes)", async () => {
    const mrca = await getMrcaViaLcaQuery(HOMO_SAPIENS, PAN_TROGLODYTES);
    expect(mrca).not.toBeNull();
    expect(mrca!.scientificName).toBe("Hominini");
  });

  it("resolves the extinct Homo_heidelbergensis for (Homo_sapiens, Homo_neanderthalensis)", async () => {
    // sapiens and neanderthalensis both descend from H. heidelbergensis, so
    // their longest common ancestor is that (extinct) species — the showcase
    // case where lca lands on an extinct intermediate ancestor rather than a
    // living genus node.
    const mrca = await getMrcaViaLcaQuery(HOMO_SAPIENS, HOMO_NEANDERTHALENSIS);
    expect(mrca).not.toBeNull();
    expect(mrca!.scientificName).toBe("Homo heidelbergensis");
    expect(mrca!.path).toBe(HOMO_HEIDELBERGENSIS);
    expect(mrca!.extinct).toBe(true);
  });
});

describe("getMrcaViaOps — isAncestorOf + nlevel().desc()", () => {
  it("resolves Catarrhini for (Homo_sapiens, Mandrillus_sphinx)", async () => {
    const mrca = await getMrcaViaOpsQuery(HOMO_SAPIENS, MANDRILLUS_SPHINX);
    expect(mrca).not.toBeNull();
    expect(mrca!.scientificName).toBe("Catarrhini");
  });

  it("resolves Hominini for (Homo_sapiens, Pan_troglodytes)", async () => {
    const mrca = await getMrcaViaOpsQuery(HOMO_SAPIENS, PAN_TROGLODYTES);
    expect(mrca).not.toBeNull();
    expect(mrca!.scientificName).toBe("Hominini");
  });

  it("agrees with getMrcaViaLca on the headline cross-branch demo", async () => {
    const viaLca = await getMrcaViaLcaQuery(HOMO_SAPIENS, MANDRILLUS_SPHINX);
    const viaOps = await getMrcaViaOpsQuery(HOMO_SAPIENS, MANDRILLUS_SPHINX);
    expect(viaOps!.path).toBe(viaLca!.path);
  });
});

describe("graftTaxon — concatText (||) insert", () => {
  it("inserts a new taxon under Homo with the concatenated path", async () => {
    const inserted = await graftTaxonQuery({ parentPath: HOMO, label: "Homo_long_lived" });
    graftedIds.push(inserted.id);
    expect(inserted.path).toBe(`${HOMO}.Homo_long_lived`);
    expect(inserted.scientificName).toBe("Homo long lived");
    expect(inserted.extinct).toBe(false);
    expect(inserted.rank).toBe("species");

    const verify = await getLineageQuery(`${HOMO}.Homo_long_lived`);
    expect(verify.some((t) => t.path === `${HOMO}.Homo_long_lived`)).toBe(true);
  });

  it("carries the optional common name, rank, and extinct flag", async () => {
    const inserted = await graftTaxonQuery({
      parentPath: HOMO,
      label: "Homo_mythicus",
      commonName: "Mythical human",
      rank: "subspecies",
      extinct: true,
    });
    graftedIds.push(inserted.id);
    expect(inserted.commonName).toBe("Mythical human");
    expect(inserted.rank).toBe("subspecies");
    expect(inserted.extinct).toBe(true);
    // Grafted rows carry an empty wiki_url — the prune sentinel.
    expect(inserted.wikiUrl).toBe("");
  });

  it("rejects an invalid ltree label before inserting", async () => {
    await expect(graftTaxonQuery({ parentPath: HOMO, label: "1nvalid label" })).rejects.toThrow();
    const verify = await getSubtreeQuery(HOMO);
    expect(verify.some((t) => t.scientificName === "1nvalid label")).toBe(false);
  });
});

describe("pruneUserTaxa — restore seeded state", () => {
  it("removes only grafted rows and leaves the 46 seeded taxa intact", async () => {
    const grafted = await graftTaxonQuery({ parentPath: HOMO, label: "Homo_ephemerus" });
    // Pruned below, so it never needs the afterAll id-cleanup.
    const before = await getTaxaQuery();
    expect(before.some((t) => t.path === grafted.path)).toBe(true);

    const removed = await pruneUserTaxaQuery();
    expect(removed).toBeGreaterThanOrEqual(1);

    const after = await getTaxaQuery();
    expect(after).toHaveLength(46);
    expect(after.every((t) => t.wikiUrl !== "")).toBe(true);
    // The id-tracked grafts from earlier tests are gone too; clear the list so
    // afterAll does not try to re-delete them.
    graftedIds.length = 0;
  });
});
