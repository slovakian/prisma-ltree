# Handoff: PSL lane extension index types — upstream fix for `prisma-ltree` GiST

**Date:** 2026-06-30  
**Author:** agent session (handoff for the next agent)  
**Next session goal:** Open a **GitHub issue** and/or **PR in `prisma/prisma-next`** to wire extension `indexTypes` into the PSL contract authoring path. This unblocks PSL `@@index(..., type: "gist")` for `prisma-ltree` and PSL `@@index(..., type: "bm25")` for ParadeDB — without moving GiST into core.

> Do **not** re-read or duplicate the full design. Start from these artifacts in this repo (branch `cursor/add-gist-index-support-00ce`, PR [#9](https://github.com/slovakian/prisma-ltree/pull/9)):
>
> - [`docs/spec/gist-index-support-handoff.md`](./gist-index-support-handoff.md) — extension-side completion status
> - [`docs/decisions/ADR-005-gist-index-support.md`](../decisions/ADR-005-gist-index-support.md) — why `gist` lives in the pack, PSL gap analysis
> - [`docs/spec/gist-index-support-plan.md`](./gist-index-support-plan.md) — phased implementation plan
> - [`packages/extension-ltree/test/psl-lane/gist-authoring.test.ts`](../../packages/extension-ltree/test/psl-lane/gist-authoring.test.ts) — regression guard (PSL rejects today; flip when fixed)

After `pnpm run sync-docs`, upstream reference clone lives at `.sync/prisma-next/` (gitignored).

---

## Conversation summary

### 1. Was GiST index support fully implemented (PSL + TS lanes)?

**No — partially.**

| Lane | GiST contract authoring | Status |
|------|-------------------------|--------|
| **TypeScript** | `constraints.index([col], { type: "gist", options: {} })` | ✅ Complete on gist branch |
| **PSL** | `@@index([col], type: "gist")` | ❌ Blocked upstream |

Extension work on gist branch is done: `defineIndexTypes().add("gist", …)`, pack/control wiring, tests, docs, version bump to `0.3.0`. TS lane verified end-to-end (emit → GiST IR → PGlite `CREATE INDEX … USING gist`).

PSL lane fails at emit with `unregistered index type "gist"` even though the pack registers it correctly.

### 2. Would upgrading Prisma Next fix PSL?

**No.** Investigated on 2026-06-30:

- `prisma-ltree` already pins **`@prisma-next/*@0.14.0`** (npm `latest`).
- **`0.15.0` is not published** (404 on npm). Skill has placeholder `0.14-to-0.15` with empty extension changes.
- **`0.14.0-dev.28`** (npm `dev`) has identical `@prisma-next/postgres` `defineConfig` — still no `composedExtensionPackRefs`.
- Synced upstream **`prisma-next` main** (`.sync/prisma-next/`) — same gap in `packages/3-extensions/postgres/src/config/define-config.ts`.

Upgrading pins will not unblock PSL until upstream wires pack refs.

### 3. Should GiST be native in Prisma Next core, or extension territory?

**Extension territory — by design.**

- **GiST** = built-in Postgres **index access method** (not an extension).
- **`ltree`** = Postgres **contrib extension** (`CREATE EXTENSION ltree`); GiST operator classes `gist_ltree_ops` / `gist__ltree_ops` come from that extension.
- **Prisma Next ADR 210** (Index-type registry): index types are contributed by **extension packs** via `defineIndexTypes()`; framework renders DDL; **no built-in registry entries**. ParadeDB's `bm25` is the reference pattern.
- **`prisma-ltree` registering `gist`** is correct. Core should **not** natively add ltree-specific GiST — it should **fix PSL wiring** so any pack's `indexTypes` reach the PSL interpreter.

The gap is **framework integration**, not missing GiST implementation.

---

## Root cause (verified against `@prisma-next/*@0.14.0` and `.sync/prisma-next/`)

Index-type validation runs at contract **lowering** from the per-contract registry built from attached packs' `indexTypes` (ADR 210).

**TS lane:** `defineContract({ extensionPacks: { ltree } })` carries full pack refs → registry includes `gist`. ✅

**PSL lane:**

1. `@prisma-next/postgres` `defineConfig` calls `prismaContract(path, { output, target, createNamespace })` **without** `composedExtensionPackRefs`.
2. CLI `executeContractEmit` passes `composedExtensionPacks: stack.extensionPacks.map(p => p.id)` (IDs only) in `ContractSourceContext` — **no field for pack refs**; zero CLI references to `composedExtensionPackRefs`.
3. PSL interpreter `buildComposedExtensionPackRefs()` substitutes **stub refs** (id/kind only, **no `indexTypes`**) when real refs are absent.
4. Authoring `type: "gist"` → `unregistered index type "gist"`.

The PSL provider **already accepts** `composedExtensionPackRefs` (`packages/2-sql/2-authoring/contract-psl/src/provider.ts`). Upstream integration tests pass refs **directly** to `interpretPslDocumentToSqlContract` (e.g. `test/integration/test/authoring/psl-index-type-options.integration.test.ts` with ParadeDB) — bypassing `defineConfig`.

**Affects all extension index types in PSL**, not just ltree GiST (ParadeDB `bm25` same gap via standard config).

---

## Recommended next action: issue first, then PR

**Smartest path: open a GitHub issue in `prisma/prisma-next` first**, then a linked PR if you can implement the fix.

**Why issue first:**

- The fix touches **public config API shape** (how consumers pass pack refs vs control descriptors). Prisma may prefer one approach over another.
- The bug is **cross-cutting** (all extension `indexTypes`, not ltree-specific). Issue framing should say that explicitly.
- A PR alone might stall on API design; an issue documents intent and links ParadeDB + ltree as motivating consumers.

**PR is still valuable** if the fix is small and you can mirror upstream test patterns — link it to the issue. Likely touch points:

| File / area | What to change |
|-------------|----------------|
| `packages/3-extensions/postgres/src/config/define-config.ts` | Thread `composedExtensionPackRefs` into `prismaContract(...)` |
| `packages/1-framework/3-tooling/cli/src/control-api/operations/contract-emit.ts` | Optionally pass pack refs into PSL `load()` context |
| `packages/1-framework/1-core/config/src/contract-source-types.ts` | Optionally extend `ContractSourceContext` |
| Tests | Extend `packages/3-extensions/postgres/test/config/define-config.test.ts`; add integration test via real config emit (not direct interpreter call) |

**Do not ask upstream to "add GiST support."** Ask to **wire extension `indexTypes` into PSL authoring** via `composedExtensionPackRefs`.

### Issue title suggestion

> PSL contract emit: extension `indexTypes` not validated — `defineConfig` / CLI omit `composedExtensionPackRefs`

### Acceptance criteria for upstream fix

1. PSL config with `extensions: [ltreeControl]` (or equivalent) + `@@index([path], type: "gist")` emits GiST index IR (same as TS lane).
2. ParadeDB PSL `@@index(..., type: "bm25", options: { key_field: "id" })` works through standard `@prisma-next/postgres/config` — not only via direct interpreter tests.
3. No duplicate/conflicting registration when pack refs are threaded correctly.

### Downstream follow-up in `prisma-ltree` (after upstream ships)

1. Flip `packages/extension-ltree/test/psl-lane/gist-authoring.test.ts` PSL case from "expects reject" to "expects GiST IR parity with TS".
2. Update `docs/feature-support.md` PSL row: `blocked-upstream` → `supported`.
3. Update ADR-005 "Authoring-lane reality" table.

---

## Environment notes (for reproducing gist branch tests)

- Package requires **Node ≥ 24** for TS contract emit. Cloud agent default Node may be v22 → `Failed to resolve contract source`.
- From `packages/extension-ltree/`: `pnpm run build` (dist gitignored), `pnpm test`, `pnpm run check-pins`.

---

## Key upstream references (post `sync-docs`)

| What | Path in `.sync/prisma-next/` |
|------|------------------------------|
| ADR 210 — index-type registry design | `docs/architecture docs/adrs/ADR 210 - Index-type registry.md` |
| PSL provider accepts `composedExtensionPackRefs` | `packages/2-sql/2-authoring/contract-psl/src/provider.ts` |
| Stub fallback when refs missing | `packages/2-sql/2-authoring/contract-psl/src/interpreter.ts` (`buildComposedExtensionPackRefs`) |
| Postgres `defineConfig` gap | `packages/3-extensions/postgres/src/config/define-config.ts` |
| CLI emit — IDs only, no refs | `packages/1-framework/3-tooling/cli/src/control-api/operations/contract-emit.ts` |
| ParadeDB PSL index test (direct interpreter) | `test/integration/test/authoring/psl-index-type-options.integration.test.ts` |
| ParadeDB pack `indexTypes` pattern | `packages/3-extensions/paradedb/src/types/index-types.ts` |

---

## Suggested skills

Load these before substantial work in the next session:

| Skill | When |
|-------|------|
| **`handoff`** (this doc) | Starting point — read once, then go to upstream repo |
| **`prisma-next-extension-upgrade`** (`.agents/skills/prisma-next-extension-upgrade/SKILL.md`) | Only if bumping `@prisma-next/*` pins after upstream release; **not needed for this task** |
| **`writing-guidelines`** (`.agents/skills/writing-guidelines/SKILL.md`) | Polishing issue/PR description prose |
| Repo **`AGENTS.md`** skill check | `pnpm dlx @tanstack/intent@latest list` when working inside `prisma-ltree` after upstream lands |

For work **inside `prisma/prisma-next`**, consult upstream extension-author skills after clone: `skills/extension-author/` (synced to `prisma-ltree/.sync/prisma-next/skills/extension-author/`).

---

## Explicit non-goals for the next agent

- Do **not** move GiST registration into `@prisma-next/target-postgres` core (contradicts ADR 210).
- Do **not** expect a `prisma-ltree` pin bump alone to fix PSL (verified: 0.14.0, dev.28, no 0.15).
- Do **not** implement the `prisma-ltree/config` wrapper unless upstream rejects/fix is delayed and maintainer approves (see ADR-005 "Alternatives rejected").
- Do **not** duplicate gist implementation work — extension side is complete on gist branch; task is **upstream wiring only**.
