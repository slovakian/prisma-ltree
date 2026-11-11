# Changesets Workflow

This project uses [Changesets](https://changesets.dev) **v3** to version and publish
`prisma-ltree` to npm.

## Overview

Changesets:

- Tracks what changed between releases
- Calculates version bumps (major / minor / patch)
- Generates changelogs
- Publishes to npm only when an agent **manually** runs the Version workflow

`main` holds the current code and any pending `.changeset/*.md` files. Merging to
`main` does **not** open a Version PR and does **not** publish to npm.

## For Contributors

### Creating a Changeset

When you make a change that should be released:

```bash
pnpm exec changeset
```

You will:

1. Select which packages changed (typically `prisma-ltree`)
2. Choose the bump type (major / minor / patch)
3. Write a summary of the change

That creates a file under `.changeset/` (for example `.changeset/chatty-vees-jump.md`).
Commit it with your change.

Generated files are formatted with the project's formatter (`format: "auto"` — Oxfmt via
Vite+ when available).

### Bump Types

- **patch** (e.g. 0.1.0 → 0.1.1) — Bug fixes, internal improvements
- **minor** (e.g. 0.1.0 → 0.2.0) — New features (backwards compatible)
- **major** (e.g. 0.1.0 → 1.0.0) — Breaking changes

Peer dependents of a bumped package are only patched by default in Changesets v3. Mark a
dependent as major in the same changeset when the peer usage is actually breaking.

## Workflow

### On Pull Requests

1. Create your feature/fix branch
2. Make your changes
3. Run `pnpm exec changeset` to document what changed
4. Push both your code and the `.changeset/*.md` file
5. Open a PR — CI publishes a pkg.pr.new preview, and the Changesets PR Status workflow
   comments whether a changeset is present

### On Main (After Merge)

Merging to `main` only lands code + changesets. Nothing publishes.

Stable npm releases are **manual** (see [Agent release playbook](#agent-release-playbook)
below): trigger `publish.yml` via `workflow_dispatch` twice in the usual case — once to
open/update the Version Packages PR, again after that PR merges to pack + publish.

### Preview packages (automatic)

Every PR gets a pkg.pr.new preview from `ci.yml`. There is **no** rolling “latest from
main” npm or preview publish — use PR previews until someone cuts a stable release.

## GitHub Actions Workflows

### `publish.yml` (Manual Version PR → Pack → Publish)

Runs **only** on `workflow_dispatch` (Actions UI or `gh workflow run publish.yml`).

Optional input:

| Input     | Default | Effect                                              |
| --------- | ------- | --------------------------------------------------- |
| `dry_run` | `false` | When mode is `publish`, pack but skip npm publish   |

Jobs (least-privilege permissions per job):

| Job              | When                                      | Role                                                            |
| ---------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `select-mode`    | always                                    | Decide `version` / `publish` / `none`                           |
| `version`        | mode = `version`                          | `changeset version` + open/update Version PR                    |
| `pack`           | mode = `publish`                          | Build + `changeset pack` (no `id-token`)                        |
| `publish`        | mode = `publish` and not `dry_run`        | Publish packed tarballs with OIDC (`id-token: write` only here) |
| `dry-run-notice` | mode = `publish` and `dry_run`            | Confirm pack succeeded; remind to re-run without `dry_run`      |

This follows the Changesets v3 / e18e **build → pack → publish** flow so install/build never
share Trusted Publishing credentials with the publish step.

**Do not rename** `publish.yml` without updating the npm Trusted Publisher entry — OIDC is
bound to this workflow filename.

### `changesets-pr-status.yml` (PR comments)

On same-repo pull requests, comments whether the PR includes a changeset (non-blocking).

### `ci.yml` (Validation)

Runs on every PR and push:

- Validates the extension (lint, type-check, test, build)
- Publishes a preview package via pkg.pr.new (**pull requests only**)

### pkg.pr.new Integration

Preview packages are published automatically for every PR:

- URL format: `@prisma-ltree@0.0.0-pr-<number>-<hash>.tgz`
- Use for testing in your own projects before official release
- Cleaned up after the PR is closed

## Agent release playbook

When Jason (or anyone) asks an agent to cut a stable npm release:

```bash
# 1) Open or refresh the Version Packages PR (needs pending .changeset files on main)
gh workflow run publish.yml --repo slovakian/prisma-ltree
gh run list --repo slovakian/prisma-ltree --workflow=publish.yml --limit 3

# 2) Review bumps/CHANGELOG, then merge the Version PR
gh pr list --repo slovakian/prisma-ltree --search "version packages" --state open
gh pr view <number> --repo slovakian/prisma-ltree
gh pr merge <number> --repo slovakian/prisma-ltree --merge

# 3) Pack + publish with Trusted Publishing / provenance
gh workflow run publish.yml --repo slovakian/prisma-ltree
gh run list --repo slovakian/prisma-ltree --workflow=publish.yml --limit 1
# Optional: gh run watch --repo slovakian/prisma-ltree

# Rehearsal only (no npm publish):
gh workflow run publish.yml --repo slovakian/prisma-ltree -f dry_run=true
```

Notes:

1. Prefer this GHA path — do **not** run `npm publish` / `changeset publish` from a Cloud
   Agent for production cuts (no long-lived npm token; OIDC stays in Actions).
2. If the first dispatch already sees unpublished version bumps on `main` (Version PR
   already merged), it goes straight to pack/publish — skip step 2.
3. If mode is `none`, there is nothing to version or publish; land a changeset on a PR first.
4. **Don't modify package.json versions manually** — Changesets handles this.
5. **Don't rely on `prepublishOnly`** — release builds happen in the pack job.

## For Agents (feature work)

When implementing features or fixes:

1. **Always create a changeset** with `pnpm exec changeset` before pushing user-facing package changes
2. **Commit the `.changeset/*.md` file** — don't skip it
3. **Choose the correct bump type:**
   - New operator/feature → minor
   - Bug fix → patch
   - Breaking API change → major
4. **Don't modify package.json versions manually** — Changesets handles this
5. **Don't publish to npm** unless Jason asked for a release — then follow the
   [Agent release playbook](#agent-release-playbook)
6. **Don't rely on `prepublishOnly`** — release builds happen in the pack job

## Local / Manual Release Notes

Automated releases build in CI before packing. Prefer the GitHub Actions path for Trusted
Publishing and provenance. Local publish is only for exceptional recovery when Jason
explicitly asks:

```bash
pnpm --filter prisma-ltree run build
pnpm exec changeset publish
```

## Troubleshooting

### "No changesets found" / mode `none`

If `publish.yml` runs but doesn't create a PR or publish, check:

- Did you run `pnpm exec changeset` to create the `.changeset/*.md` file?
- Did you commit and push that file to `main` (via a merged PR)?
- Is the file in the `.changeset/` directory?
- Was the Version Packages PR already merged and the version already on npm?

### Preview package not published

The `ci.yml` publishes preview packages via pkg.pr.new on **pull_request** only. If it's
not showing up:

- Check the "Publish preview package" step in the CI logs
- Verify the package builds correctly with `vp run build`

### Publishing fails

The `publish` job uses npm Trusted Publishing (OIDC) — no long-lived npm token:

1. Go to: https://www.npmjs.com/settings/[your-username]/packages/prisma-ltree/settings
2. Under "Publishing access", add GitHub OIDC provider with:
   - Repository: `slovakian/prisma-ltree`
   - Workflow: `publish.yml`
   - Environment: (none, unless you add a GitHub Environment)
3. Save

If you still see errors, check the publish.yml workflow logs in GitHub Actions.

### Version PR not created

Trigger the workflow manually first (`gh workflow run publish.yml`). If versioning
succeeds but GitHub fails with:

```
GitHub Actions is not permitted to create or approve pull requests
```

the version branch (`changeset-release/main`) may still have been pushed — open the PR
manually from that branch. To fix automation:

1. Repo **Settings → Actions → General → Workflow permissions** → **Read and write permissions**
2. Enable **Allow GitHub Actions to create and approve pull requests**
3. Re-run the Version workflow (`gh workflow run publish.yml` or Re-run jobs in the UI)

The `version` job requests `pull-requests: write`; the repo/org setting above must also allow it.

## Links

- [Changesets docs](https://changesets.dev)
- [Automating Changesets (v3)](https://changesets.dev/guide/automating)
- [Migrating from v2](https://changesets.dev/guide/migration)
- [pkg.pr.new](https://www.pkg.pr.new/)
