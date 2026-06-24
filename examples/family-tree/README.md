# prisma-ltree · Tree of Life

An interactive viewer for PostgreSQL's [`ltree`](https://www.postgresql.org/docs/current/ltree.html)
hierarchical type, driven through [prisma-next](https://github.com/prisma/prisma-next)
and the [`prisma-ltree`](https://www.npmjs.com/package/prisma-ltree) extension.

It models a **Catarrhini-rooted phylogenetic tree** — Old World monkeys and apes,
detailed through Hominoidea down to living and key extinct _Homo_ species — and
exposes every `prisma-ltree` operator as a real UI control. Lineage, subtree,
most-recent-common-ancestor (`lca`), `lquery` / `ltxtquery` searches, generation
depth, lineage slices, and graft-a-taxon are all dispatched to Postgres. No
tree math happens in the client.

This example is **standalone**: it installs everything from npm and is not part
of the prisma-ltree monorepo build. Copy the folder anywhere and it still runs.

---

## Features

The viewer is built around an **Operator Showcase Matrix** — each control in
the right-hand aside maps to a real `prisma-ltree` operator, with the operator
name and SQL template shown beside its result. An **Operator matrix** legend at
the bottom of the aside lights up the primitive(s) the latest action lowered to.

### Canvas

- **Horizontal dendrogram** of every taxon, laid out left-to-right by
  `d3-hierarchy` and rendered with React Flow (pan / zoom / fit).
- **Click a taxon** to open the per-node inspector (SidePanel) and paint its
  lineage + subtree on the canvas.
- **Wikipedia thumbnails** are resolved once at seed time and cached on the row
  (clade-glyph placeholder when none is available).

### Per-node inspector (SidePanel)

Each card carries the operator name and SQL lowering — the panel doubles as a
live operator showcase.

| Card          | Operator                | SQL                |
| ------------- | ----------------------- | ------------------ |
| Ancestry      | `isAncestorOf` (`@>`)   | `path @> $1`       |
| Subtree       | `isDescendantOf` (`<@`) | `path <@ $1`       |
| Lineage slice | `subpath`               | `subpath(path, 1)` |
| Branch point  | `lca`                   | `lca(path, $1)`    |

### Aside controls

| Control           | Operator(s)                                                                 | SQL                                                                              |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Selection + reset | `isAncestorOf` / `isDescendantOf` legend                                    | —                                                                                |
| Common ancestor   | `lca` (variadic)                                                            | `lca($a, $b)`                                                                    |
| Pattern search    | `matchesLquery` (`~`), `matchesLqueryArray` (`?`), `matchesLtxtquery` (`@`) | `path ~ $1` / `path ? $1` / `path @ $1`                                          |
| Depth & slices    | `nlevel`, `subpath`, `subltree`, `indexOf`                                  | `nlevel(path) = $1`, `subpath(path, $1, $2)`, `subltree(...)`, `index(path, $1)` |
| Graft a taxon     | `concatText` (`\|\|`)                                                       | `path \|\| $label::ltree`                                                        |

The **graft** control is the viewer's one mutator: pick a parent taxon, type a
new ltree label, see the dry-run path preview, then insert. **Prune grafted
taxa** restores the 46 seeded rows.

### Curated `lca()` demos the dataset makes possible

- `lca(Homo_sapiens, Pan_troglodytes)` → `Hominini`
- `lca(Homo_sapiens, Gorilla_gorilla)` → `Homininae`
- `lca(Homo_sapiens, Pongo_pygmaeus)` → `Hominidae`
- `lca(Homo_sapiens, Hylobates_lar)` → `Hominoidea`
- `lca(Homo_sapiens, Mandrillus_sphinx)` → `Catarrhini` (the headline demo)
- `lca(Homo_sapiens, Homo_neanderthalensis)` → `Homo_heidelbergensis` (extinct LCA)

Some `lquery` patterns to try in the search control: `*.Hominidae.*`,
`*.Pan.*, *.Homo.*` (lquery[]), and `Homo & !sapiens` (ltxtquery).

> **Tier-3 first-match operators** (`firstAncestorOf` `?@>`, `firstDescendantOf`
> `?<@`, `firstMatchLquery` `?~`, `firstMatchLtxtquery` `?@`) ship in the
> extension and are covered by its own test suite, but **are intentionally not
> surfaced in this viewer** to keep the showcase matrix readable. See
> [`docs/decisions/ADR-001-open-questions.md`](docs/decisions/ADR-001-open-questions.md).

---

## Data layer: `Taxon` on `ltree`

The data is a single Catarrhini-rooted tree (one ltree path per taxon). 46
nodes total — living and key extinct _Homo_, plus Cercopithecidae so
cross-clade `lca` queries settle at the root `Catarrhini` rather than an
opaque path. Each row carries `scientific_name`, `common_name`, `rank`,
`extinct`, `ma_origin` / `ma_extinct` (era badges), `wiki_url`, and
`thumbnail_url` (resolved at seed time via the Wikipedia `pageimages` REST
API). Column names are snake_case (camelCase field names mapped via `@map`)
so the typed ORM API stays ergonomically camelCase (`t.scientificName`) while
raw `psql` reads `scientific_name`.

The full dataset lives in [`src/seed-data.ts`](src/seed-data.ts); a build-time
assertion guards the 46-taxon count and rejects duplicate / malformed paths.

---

## Stack

| Piece    | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Database | Postgres 17 (Docker) — `ltree` ships in the stock image |
| ORM      | prisma-next (`@prisma-next/postgres`) + `prisma-ltree`  |
| App      | TanStack Start (React 19, server functions, Vite)       |
| Layout   | `d3-hierarchy` (dendrogram) + `@xyflow/react` (canvas)  |
| UI       | shadcn / radix-ui primitives, Tailwind v4               |
| Runtime  | Node ≥ 24, pnpm                                         |

---

## Quickstart

```bash
pnpm install
cp .env.example .env

# One shot: start Postgres, emit the contract, apply migrations, seed.
pnpm setup

pnpm dev          # http://localhost:3000
```

`pnpm setup` runs these five steps:

```bash
pnpm db:up        # docker compose up (Postgres on :5434)
pnpm emit         # prisma-next contract emit  (contract.prisma → contract.json/.d.ts)
pnpm db:plan      # prisma-next migration plan (materializes the ltree + app migrations)
pnpm db:init      # apply migrations: CREATE EXTENSION ltree + create the taxon table
pnpm seed         # insert the phylogeny (and resolve Wikipedia thumbnails)
```

### Gotchas (still real on a fresh machine)

1. **`pnpm db:plan` is mandatory before the first `pnpm db:init`.** It copies
   the extension's baseline `CREATE EXTENSION ltree` migration out of the
   `prisma-ltree` package into `migrations/ltree/` and plans the `taxon` table.
   Without it, `db:init` fails with `PN-MIG-5001 declaredButUnmigrated`.
2. **The Postgres Docker image pull may need a mirror.** On hosts where
   `docker pull postgres:17-alpine` is blocked or rate-limited (corporate
   networks, air-gapped CI), point Docker at an internal registry / ECR mirror
   before running `pnpm db:up`. The compose file uses the bare `postgres:17-alpine`
   tag; a registry mirror configured in Docker's daemon settings is the
   lowest-churn fix.

To start over: `pnpm db:drop && pnpm db:init && pnpm seed`. To tear down the DB
entirely: `pnpm db:down`.

---

## File structure

```
examples/family-tree/
├── docker-compose.yml            # Postgres 17 on port 5434 (tmpfs, disposable)
├── prisma-next.config.ts         # contract.prisma + the prisma-ltree extension
├── vite.config.ts                # TanStack Start + Tailwind + Nitro + vitest config
├── package.json                  # scripts: db:up / emit / db:plan / db:init / seed / setup / dev / build
│
├── migrations/
│   ├── ltree/                    # extension baseline: CREATE EXTENSION ltree (generated by db:plan)
│   └── app/                      # the taxon table migration (generated by db:plan)
│
├── scripts/
│   ├── seed.ts                   # inserts the 46 taxa + resolves Wikipedia thumbnails
│   └── drop-db.ts                # pnpm db:drop — drop public + prisma_contract schemas
│
├── public/                       # favicons + webmanifest
│
├── src/
│   ├── prisma/
│   │   ├── contract.prisma       # the schema: a Taxon model with an ltree `path`
│   │   ├── contract.json         # emitted contract (generated by `pnpm emit`)
│   │   ├── contract.d.ts         # emitted types     (generated by `pnpm emit`)
│   │   └── db.ts                 # the typed prisma-next client, wired with the ltree extension
│   ├── server/
│   │   ├── runtime.ts            # one pooled connection per server process
│   │   ├── taxonomy.server.ts    # server-only data layer — every ltree query (the *Query fns)
│   │   └── taxonomy.ts           # client-safe surface — createServerFn wrappers + TaxonRow type
│   ├── components/
│   │   ├── TreeCanvas.tsx        # React Flow wrapper, highlight folding, focusNode handle
│   │   ├── TaxonNode.tsx         # custom node (circular tip portraits, diamond clade markers, highlight ring)
│   │   ├── SidePanel.tsx         # per-node inspector (ancestry / subtree / slice / branch point)
│   │   ├── Controls/
│   │   │   ├── LineageControls.tsx   # selection legend + global reset
│   │   │   ├── MrcaControls.tsx      # two-taxa MRCA picker via `lca()`
│   │   │   ├── SearchControls.tsx    # lquery / lquery[] / ltxtquery pattern search
│   │   │   ├── SliceControls.tsx     # nlevel generation, subpath/subltree slice, indexOf locate
│   │   │   ├── GraftControls.tsx     # concatText graft + prune
│   │   │   └── OperatorLegend.tsx    # live showcase-matrix legend
│   │   ├── ui/                      # shadcn primitives (avatar, button, select)
│   │   ├── DefaultCatchBoundary.tsx
│   │   └── NotFound.tsx
│   ├── lib/
│   │   ├── highlight.ts          # pure highlight-state model (lineage / subtree / mrca / match)
│   │   ├── layout.ts             # d3-hierarchy stratify → horizontal dendrogram
│   │   ├── nodes.ts              # TaxonRow → React Flow node/edge mapping + node geometry
│   │   ├── taxon-label.ts        # shared ltree label validation (client + server)
│   │   └── utils.ts              # cn() classname merge
│   ├── routes/
│   │   ├── __root.tsx            # document shell + metadata
│   │   └── index.tsx             # the viewer route: loader + canvas + aside wiring
│   ├── seed-data.ts              # the 46-taxon Catarrhini-rooted phylogeny (authoritative)
│   ├── styles/app.css            # Tailwind v4 + theme tokens
│   └── utils/seo.ts
│
├── test/
│   ├── lib-highlight.test.ts     # pure: highlight-state membership / kind resolution
│   ├── lib-layout.test.ts        # pure: one node per path, one edge per child, horizontal layout
│   └── server/taxonomy.test.ts   # DB-backed: every server query against the seeded DB
│
├── docs/decisions/
│   └── ADR-001-open-questions.md # resolves the four spec Open Questions
│
├── KNOWN_LIMITATIONS.md          # why Playwright e2e is deferred
└── README.md                     # this file
```

Generated at dev/build time (gitignored): `src/routeTree.gen.ts`, `.output/`,
`.nitro/`, `.tanstack/`.

---

## Testing

Three test files cover the showcase matrix without a browser:

- `test/lib-highlight.test.ts` — pure highlight-state model.
- `test/lib-layout.test.ts` — pure layout invariants (one node per path,
  horizontal orientation).
- `test/server/taxonomy.test.ts` — every `*Query` server fn against the seeded
  Postgres DB, including graft + prune round-trips.

Run them with `vp test` (or `pnpm test` inside the example). The DB-backed
suite requires `pnpm setup` to have run at least once. See
[`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) for why a Playwright end-to-end
suite is intentionally not included.

---

## Notes

- `extinct` is set explicitly by `graftTaxon` rather than via a contract
  `@default(false)`: the pinned CLI emits a malformed boolean-literal default
  that `db:plan` rejects. See the comment in `src/server/taxonomy.server.ts`.
- Grafted taxa are sentinel-marked with an empty `wiki_url` (every seeded
  taxon carries a real Wikipedia URL); `pruneUserTaxa` deletes exactly those
  rows to restore the seeded state.
- The app title in the UI, `<title>`, and this README is **Tree of Life**.
  The directory stays `examples/family-tree` (see ADR-001).
