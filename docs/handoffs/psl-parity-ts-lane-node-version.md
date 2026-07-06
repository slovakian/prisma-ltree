# Handoff: PSL-parity test fails to resolve the TS contract lane

**Status:** Open — ready for a fresh investigation branch
**Date:** 2026-07-06
**From:** review of PR #16 (`paths.lcaAll()`); this failure is **pre-existing and unrelated** to that PR
**Area:** `packages/extension-ltree/test/psl-lane/psl-parity.test.ts`

> **Note on process:** No dedicated "handoff skill" is installed in this repo (the
> historical `docs/progress` / handoff notes were removed in `6fad633`, and
> `@tanstack/intent` surfaces none). This handoff follows the repo's prior handoff-note
> style. If a handoff skill is later added, reformat to match it.

## For the next agent — start here

1. Create a fresh branch off `main`: `git checkout -b cursor/<name>-d26d` (e.g.
   `cursor/psl-parity-ts-lane-d26d`). Do **not** build on PR #16's branch — this issue is
   independent of `lcaAll`.
2. Reproduce (see below), then decide between the two resolution paths in
   "Recommended options". Only one of them is a code change.
3. This handoff doc can be deleted in your investigation PR once the issue is resolved.

## Symptom

`vp test` in `packages/extension-ltree` reports **1 failing test** (everything else
passes):

```
FAIL  test/psl-lane/psl-parity.test.ts > PSL lane parity > emits IR identical to the TS lane (byte-for-byte, including hashes)
CliStructuredError: Failed to resolve contract source
```

The other three tests in the same file pass — they only emit the **PSL** lane
(`prisma.config.ts` → `contract.prisma`). The failing test is the only one that also
emits the **TS** lane (`ts.config.ts` → `contract.ts`).

## Root cause (confirmed)

The top-level `CliStructuredError` hides the real cause. The underlying `why` field is:

```
Unknown file extension ".ts" for /workspace/packages/extension-ltree/test/psl-lane/contract.ts
```

The TS-lane contract-source provider does a native Node `import()` of `contract.ts`.
Node can only import a `.ts` file directly when **native TypeScript type-stripping** is
active. That became the default in **Node v22.18** and is on in **Node 24**. This repo
requires `node >=24` (`package.json#engines`), but the sandbox's active runtime is
**v22.14.0**, which does not strip types → the import throws `Unknown file extension ".ts"`.

The PSL lane is unaffected because `contract.prisma` is parsed as text by the PSL parser;
it is never `import()`ed by Node.

### Evidence — same code, two Node versions

I isolated `executeContractEmit(...)` on `ts.config.ts` and ran it under two runtimes:

| Node runtime | TS-lane emit |
| --- | --- |
| v22.14.0 (sandbox active) | **FAIL** — `Unknown file extension ".ts"` |
| v22.22.2 (via nvm) | **OK** |

So the failure is purely a **runtime version** artifact, not a defect in the extension
code or the fixtures. Under the repo's required `node >=24`, the emit succeeds.

## How to reproduce

```bash
cd packages/extension-ltree
# 1) Reproduce the failure (whatever node vp's runner is using here is < 22.18):
../../node_modules/.bin/vp test test/psl-lane/psl-parity.test.ts

# 2) Confirm the version sensitivity directly (adjust the node paths to what you have):
cat > /tmp/probe.mjs <<'EOF'
import { executeContractEmit } from "@prisma-next/cli/control-api";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const out = await mkdtemp(join(tmpdir(), "probe-"));
try {
  await executeContractEmit({ configPath: join(process.cwd(), "test/psl-lane/ts.config.ts"), outputPath: out });
  console.log("OK under", process.version);
} catch (e) { console.log("FAIL under", process.version, "-", e.why ?? e.message); }
EOF
cp /tmp/probe.mjs ./probe.mjs   # run inside the package so bare imports resolve
node ./probe.mjs                       # older node → FAIL
~/.nvm/versions/node/v22.22.2/bin/node ./probe.mjs   # node >=22.18 → OK
rm ./probe.mjs
```

Key detail: `e.why` carries the real message; the thrown `CliStructuredError.message`
is only the generic "Failed to resolve contract source".

## Recommended options (pick one, on your branch)

**Option A — environment fix (likely correct; no source change).**
Make the test runner use `node >=24` (or `>=22.18`), matching `engines`. Investigate why
`vp test` runs under v22.14.0 here even though nvm has v22.22.2:
- Check how `vp` selects its Node runtime and whether it can be pinned (the AGENTS
  checklist mentions `vp env doctor`, but that subcommand is **not present** in
  `vite-plus@0.1.24` — `vp env doctor` → "Command 'env' not found"; find the current
  equivalent).
- If this only fails in the sandbox and CI already runs node >=24, the fix may be a
  cloud-agent environment config change (base image / setup script) rather than a repo
  change. Consider proposing an env-setup agent for that.

**Option B — make the test runtime-agnostic (defensive, small code change).**
Load the TS contract source through a TS-aware loader instead of relying on native
type-stripping, so the test passes on any supported Node. Options:
- Register `jiti` (already in the dep tree — it loads the `*.config.ts` files) as the
  importer for the contract source in the test/fixture, or
- Point the TS-lane fixture at a pre-transpiled `.mjs`/`.js`, or
- Gate the byte-for-byte test with a Node-version guard (`>=22.18`) and document why.

Prefer A if CI already pins node >=24; B only if the TS lane must work on older Node too.

## Verification checklist (definition of done)

- [ ] `vp test test/psl-lane/psl-parity.test.ts` → 4/4 pass.
- [ ] Full `vp test` in `packages/extension-ltree` → 0 failures.
- [ ] Confirm the **byte-for-byte** assertion itself passes once the emit succeeds (it is
      currently masked by the emit error — you'll be exercising `expect(fromPsl).toEqual(fromTs)`
      for the first time).
- [ ] `vp check` stays clean.
- [ ] Note whether the fix was environment-only (A) or code (B) in the PR body.

## Scope / files

- Failing test: `packages/extension-ltree/test/psl-lane/psl-parity.test.ts`
- TS-lane fixtures: `packages/extension-ltree/test/psl-lane/{ts.config.ts,contract.ts}`
- PSL-lane fixtures (working, for contrast): `.../{prisma.config.ts,contract.prisma}`
- Framework code that wraps the error (read-only, in `node_modules`):
  `@prisma-next/cli/.../control-api/operations/contract-emit.ts` →
  `failedToResolveContractSource` at ~L44 / `contractConfig.source.load` at ~L229.

## What NOT to do

- Don't "fix" it by changing the extension's contract/codec code — the extension is fine;
  the PSL and TS lanes are byte-identical once both emit.
- Don't disable or delete the parity test to make CI green.
- Don't fold this into PR #16 — keep it on its own branch/PR.
