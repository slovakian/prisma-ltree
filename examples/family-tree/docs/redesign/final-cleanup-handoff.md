# Handoff → Final cleanup + merge to `main`

The Tree-of-Life visual redesign (Phases 1–5) is **complete and committed** on
branch `example/family-tree`. The summary is in
[`redesign-done.md`](./redesign-done.md); all spec §5 acceptance criteria are
closed. Phase 5 is verified green (`vp check`, `vp run typecheck`, `vp test` =
44 passing, `vp run build`).

Your job is small and mechanical: **one dead-code cleanup commit**, then **merge
the branch into `main` and push**. Do them in order. Don't restart the redesign —
it's done.

## 1. Remove the two orphaned UI primitives

Phases 4 and 5 replaced every `Card`/`Badge` usage with the hairline
`ControlSection` / `OperatorTag` idiom (`src/components/Controls/primitives.tsx`)
and the panel's own markup. As a result these two shadcn primitives are now
imported by **nothing** in the package:

- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`

(`avatar`, `button`, `select` are all still used — leave them.)

Steps:

1. **Re-confirm they're orphaned** before deleting (don't trust this doc blindly):

   ```bash
   cd examples/family-tree
   grep -rn "ui/card\|ui/badge" src        # expect: no matches
   ```

   If anything still imports them, stop and reassess — do **not** delete a file
   that's referenced.

2. **Delete both files** (they're tracked, so use `git rm`):

   ```bash
   git rm src/components/ui/card.tsx src/components/ui/badge.tsx
   ```

3. **Update the README.** Line ~191 lists the primitives — drop `badge, card`:

   ```
   - │   │   ├── ui/   # shadcn primitives (avatar, badge, button, card, select)
   + │   │   ├── ui/   # shadcn primitives (avatar, button, select)
   ```

4. **Verify** (DB must be up + seeded — see environment note):

   ```bash
   vp check            # format + lint
   vp run typecheck    # tsc --noEmit (separate; vp check is format+lint only)
   vp test             # 44 passing (ignore the pre-existing `module is not
                       # defined` + `close timed out` teardown noise)
   vp run build        # vite build + tsc
   ```

5. **Commit** on `example/family-tree`:

   ```
   chore(family-tree): remove orphaned ui primitives (card, badge)
   ```

   End the message with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
   trailer.

> **Note on the historical docs.** `redesign-spec.md`, `redesign-plan.md`, and
> `phase-1..5-handoff.md` still mention the deleted `examples/Elegant ape
phylogenetic tree/` inspiration folder. That is **intentional** — they are the
> historical record of the redesign and describe the folder being removed in the
> final phase. `redesign-done.md` is the canonical post-redesign summary. **Leave
> the spec/plan/handoffs as-is**; do not prune them.

## 2. Merge into `main` and push

> This publishes the **entire** family-tree example to a public GitHub repo
> (`origin` = `github.com/slovakian/prisma-ltree`). It is outward-facing and hard
> to reverse. Confirm that's intended before pushing.

State at the time of writing (re-verify — it may have moved):

- `example/family-tree` is **16 commits ahead** of `main` (the whole example +
  its docs: `docs/reference/export-map.md`, `docs/spec/*`, `AGENTS.md`, and
  everything under `examples/family-tree/`). Your cleanup commit makes it 17.
- `main` is **in sync** with `origin/main` (`aa632fd`), so `main` is a strict
  ancestor of the branch → a **fast-forward** merge, no merge commit needed.
- `example/family-tree` is **not** on the remote.

Steps:

1. **Make sure the working tree is clean** and you're on the cleanup commit:

   ```bash
   git status --short              # expect empty
   git log --oneline -1            # the chore(...) cleanup commit
   ```

2. **Refresh `main`** and re-check it's still an ancestor (guards against drift):

   ```bash
   git fetch origin
   git log --oneline origin/main..main        # expect empty (main == origin/main)
   git merge-base --is-ancestor main example/family-tree && echo "ff-able" || echo "NOT ff — reassess"
   ```

   If it prints `NOT ff`, `main` advanced on the remote — stop and rebase the
   branch onto `origin/main` first, don't force anything.

3. **Fast-forward `main`** to the branch and push:

   ```bash
   git checkout main
   git merge --ff-only example/family-tree
   git push origin main
   ```

   (Use `--ff-only` so it refuses to create a surprise merge commit if state
   changed. If you/the user prefer a merge commit for provenance, use
   `git merge --no-ff example/family-tree` instead — that's a judgment call;
   default to `--ff-only` for a clean linear history.)

4. **Confirm** the push landed and leave the tree clean:

   ```bash
   git log --oneline -3 origin/main
   git status
   ```

   Optionally delete the now-merged local branch (`git branch -d
example/family-tree`); leave the remote alone unless asked.

## Environment note

Tests need a running, seeded Postgres (this Mac uses **OrbStack** as the Docker
daemon). If `vp test` shows `42P01` / connection errors:

```
open -a OrbStack
pnpm db:up
pnpm emit && pnpm db:plan && pnpm db:init && pnpm seed   # only if tables are missing
```

`pnpm emit` / `pnpm db:init` regenerate `migrations/**` and `src/prisma/contract.*`
— those are **out of scope**. If you run setup, `git checkout --` those generated
files before committing so the diff stays clean (cleanup should touch only
`src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, and `README.md`).

## Done when

- `card.tsx` + `badge.tsx` gone, README updated, all four `vp` checks green,
  cleanup committed on `example/family-tree`.
- `main` fast-forwarded to include the full redesign + cleanup and pushed to
  `origin/main`.
- Working tree clean. No generated-file churn in the diff.
