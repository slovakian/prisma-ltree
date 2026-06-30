# Handoff: GiST index support for `prisma-ltree`

**Date:** 2026-06-30
**Branch:** `cursor/add-gist-index-support-00ce`
**PR:** [#9 — feat(ltree): GiST index support (prisma-ltree@0.3.0)](https://github.com/slovakian/prisma-ltree/pull/9)
**Author:** agent session (handoff for the next agent)
**Status:** Feature complete for the **TypeScript lane**; **PSL lane blocked upstream** (details below). Not published.

> This is a holistic, conversational summary. It deliberately does **not** duplicate the
> detailed design — read those artifacts first:
>
> - Plan (phases + findings): [`docs/spec/gist-index-support-plan.md`](./gist-index-support-plan.md)
> - Decision record (root cause, alternatives, forward-compat): [`docs/decisions/ADR-005-gist-index-support.md`](../decisions/ADR-005-gist-index-support.md)
> - Feature matrix (Indexes section): [`docs/feature-support.md`](../feature-support.md)
> - Commits on this branch: `feat(ltree)` → `test(ltree)` → `docs(ltree)` → `docs(web)` → `chore(release)`

## What the task was

Let `prisma-ltree` consumers declare **GiST indexes** on `ltree` / `ltree[]` columns
through the normal Prisma Next index surface — `constraints.index([...], { type: "gist" })`
(TS lane) and `@@index([...], type: "gist")` (PSL lane) — **without writing raw SQL**.
Only the extension was in scope; Prisma Next itself could not be modified.

## What I implemented successfully

All of the following is committed on this branch and validated (137 tests pass, `vp check`
+ `check-pins` clean) under **Node 24**.

1. **`gist` index-type registration.** `src/types/index-types.ts` exports `ltreeIndexTypes =
   defineIndexTypes().add("gist", { options: type({ "+": "reject" }) })` — a closed, empty
   options shape. This is the documented ADR 210 SPI, identical in shape to ParadeDB's `bm25`.
2. **Pack + control wiring.** `src/core/descriptor-meta.ts` adds `indexTypes: ltreeIndexTypes`
   and a `postgres["ltree.gist"]` capability to `ltreePackMetaBase`; it flows to the
   `/control` descriptor via the existing spread.
3. **New public export `prisma-ltree/index-types`.** `src/exports/index-types.ts` +
   `vite.config.ts` `pack.entry` + `package.json#exports` + `docs/reference/export-map.md`.
4. **TypeScript-lane authoring works end-to-end.** Verified by emit: a `defineContract` with
   `constraints.index([cols.path], { type: "gist", options: {} })` lowers to `type: "gist"`
   index IR (empty `options` is dropped, so it would be byte-identical to PSL). The Postgres
   adapter renders `CREATE INDEX … USING gist (…)`.
5. **Real DDL proven in PGlite.** `test/integration/gist.integration.test.ts` creates
   `CREATE INDEX … USING gist` on both an `ltree` and an `ltree[]` column (PG picks
   `gist_ltree_ops` / `gist__ltree_ops` from the column type) and confirms `isDescendantOf`,
   `matchesLquery`, and `firstAncestorOf` still return correct rows with the index present.
6. **Tests.** `test/index-types.test.ts` (registration + option accept/reject + pack wiring),
   the integration test above, and `test/psl-lane/gist-authoring.test.ts` (TS emit asserts
   gist IR; PSL emit is pinned as a guard — see below).
7. **Docs + release.** ADR-005, the multi-phase plan, feature matrix, README GiST section,
   `apps/web` docs site (authoring "Indexing with GiST" + home-page mention), and the
   `prisma-ltree-adoption` / `prisma-ltree-queries` skills. Minor bump **0.2.1 → 0.3.0** via
   changeset (consumed; CHANGELOG updated).

## What I could NOT implement, and why

**PSL-lane GiST authoring (`@@index([path], type: "gist")`) does not work**, and it cannot be
fixed from inside this extension. Root cause (verified against installed `@prisma-next/*@0.14.0`):

- The index-type registry is built in `buildSqlContractFromDefinition`'s
  `assertStorageSemantics` from `definition.extensionPacks[*].indexTypes`.
- The **TS lane** populates `definition.extensionPacks` directly from
  `defineContract({ extensionPacks: { ltree } })`, so it carries our `indexTypes`. ✅
- The **PSL lane** builds `definition.extensionPacks` via the interpreter's
  `buildComposedExtensionPackRefs(target, ids, composedExtensionPackRefs)`. The refs come
  **only** from the PSL provider's static option `composedExtensionPackRefs`. When a ref is
  absent for an id, the interpreter substitutes a **stub** descriptor with **no `indexTypes`**.
- `@prisma-next/postgres`'s `defineConfig` constructs the PSL provider as
  `prismaContract(path, { output, target, createNamespace })` — it **never passes
  `composedExtensionPackRefs`**. The CLI's `executeContractEmit` doesn't inject them either
  (zero references in the CLI dist).
- Net: the PSL index-type registry is built from stubs, so an authored `type: "gist"` fails
  with `unregistered index type "gist"`. The extension's registration is correct; this is a
  framework gap in `@prisma-next/postgres`.

This is captured as a **regression guard** in `test/psl-lane/gist-authoring.test.ts`: the PSL
case currently asserts the emit *rejects* with the unregistered-type message. When upstream
threads the refs, flip that expectation to assert the same GiST IR as the TS lane (no other
extension change needed).

See ADR-005 → "Authoring-lane reality" and "Forward-compatibility" for the full reasoning and
the exact upstream change required.

## Open decisions for the next agent / maintainer

1. **Unblocking PSL without an upstream fix.** The extension *could* ship a thin
   `prisma-ltree/config` `defineConfig` wrapper that re-creates the postgres config and passes
   `composedExtensionPackRefs: [ltree]`. I **did not** do this: it pulls several internal
   `@prisma-next/*` packages into the public dependency surface, couples us to upstream config
   internals, and changes the documented config import for *all* users (not just GiST). It is
   listed under ADR-005 "Alternatives rejected" pending a maintainer call. The cleaner fix is
   upstream (`@prisma-next/postgres` `defineConfig` forwarding extension refs).
2. **Publishing.** Version is bumped and the changeset consumed, so the branch is release-ready,
   but **nothing was published** — no npm registry credentials in this environment. Run the
   normal publish pipeline (`changeset publish` / `npm publish`) from a trusted environment.
3. **`siglen` / opclass tuning** stays out of scope (`gist_ltree_ops(siglen=N)` is an opclass
   typmod, not a `WITH (...)` storage param). `fillfactor` / `buffering` are tracked as a
   `planned` TS-only follow-up (legitimate GiST `WITH` options).

## Environment gotcha (important)

This repo's tooling defaults to the daemon Node at `/exec-daemon/node` (**v22**), but the
package's declared engine and the TS contract provider require **Node ≥ 24**. Under Node 22,
`prisma-next contract emit` of a `.ts` contract (and the parity / gist-authoring tests) fails
with `Failed to resolve contract source`. Put Node 24 first on `PATH`:

```bash
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:/workspace/node_modules/.bin:$PATH"
hash -r
```

Validate from `packages/extension-ltree/`:

```bash
vp run build   # dist/ is gitignored; PSL-lane tests import prisma-ltree/* from dist
vp check
vp test        # 137 passing
vp run check-pins
```

## Suggested skills (load before continuing)

- **`prisma-next-extension-upgrade`** (`.agents/skills/prisma-next-extension-upgrade/SKILL.md`)
  — only if a future task bumps `@prisma-next/*` pins; a newer minor may close the PSL gap.
- **`writing-guidelines`** (`.agents/skills/writing-guidelines/SKILL.md`) — when editing
  README / docs-site prose for voice/tone compliance.
- **`shadcn`** (`.agents/skills/shadcn/SKILL.md`) — only if touching `apps/web` UI components
  (not needed for the MDX content edits done here).
- Repo skill check before substantial work: `pnpm dlx @tanstack/intent@latest list` (per
  `AGENTS.md`). For the docs site specifically, see `apps/web/AGENTS.md`.

## If the next session is "make PSL GiST work"

1. Re-check whether the installed `@prisma-next/postgres` `defineConfig` forwards
   `composedExtensionPackRefs` (grep its `dist/config.mjs`). If a newer pinned minor does, the
   PSL guard test should be flipped to assert GiST IR — likely no source change required.
2. If still absent and the maintainer approves it, implement the `prisma-ltree/config` wrapper
   (ADR-005 alternative), add the needed `@prisma-next/*` deps, and update the authoring docs to
   import `defineConfig` from `prisma-ltree/config`.
3. Either way, extend `test/psl-lane/gist-authoring.test.ts` so the PSL case emits real GiST IR,
   and update `docs/feature-support.md` (PSL row `blocked-upstream` → `supported`) + ADR-005.
