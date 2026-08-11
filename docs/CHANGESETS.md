# Changesets Workflow

This project uses [Changesets](https://changesets.dev) **v3** to version and publish
`prisma-ltree` to npm.

## Overview

Changesets:

- Tracks what changed between releases
- Calculates version bumps (major / minor / patch)
- Generates changelogs
- Publishes to npm when the Version PR merges

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

1. The Version workflow (`publish.yml`) runs `select-mode`
2. If there are unreleased changesets, it opens/updates a "Version Packages" PR
3. When that Version PR merges:
   - **pack** builds `prisma-ltree` and creates publish tarballs (no npm OIDC)
   - **publish** uploads those tarballs with Trusted Publishing / provenance

### Skipping Version Updates

Doc-only or repo-meta commits that should not open a Version PR can use `[skip-version]`:

```bash
git commit -m "docs: update readme [skip-version]"
```

## GitHub Actions Workflows

### `publish.yml` (Main → Version PR → Pack → Publish)

Runs on every push to `main` (unless the commit message contains `[skip-version]`).

Jobs (least-privilege permissions per job):

| Job           | When                         | Role                                                                 |
| ------------- | ---------------------------- | -------------------------------------------------------------------- |
| `select-mode` | always (unless skipped)      | Decide `version` / `publish` / `none`                                |
| `version`     | mode = `version`             | `changeset version` + open/update Version PR                         |
| `pack`        | mode = `publish`             | Build + `changeset pack` (no `id-token`)                             |
| `publish`     | after successful `pack`      | Publish packed tarballs with OIDC (`id-token: write` only here)      |

This follows the Changesets v3 / e18e **build → pack → publish** flow so install/build never
share Trusted Publishing credentials with the publish step.

### `changesets-pr-status.yml` (PR comments)

On same-repo pull requests, comments whether the PR includes a changeset (non-blocking).

### `ci.yml` (Validation)

Runs on every PR and push:

- Validates the extension (lint, type-check, test, build)
- Publishes a preview package via pkg.pr.new

### pkg.pr.new Integration

Preview packages are published automatically for every PR:

- URL format: `@prisma-ltree@0.0.0-pr-<number>-<hash>.tgz`
- Use for testing in your own projects before official release
- Cleaned up after the PR is closed

## For Agents

When implementing features or fixes:

1. **Always create a changeset** with `pnpm exec changeset` before pushing user-facing package changes
2. **Commit the `.changeset/*.md` file** — don't skip it
3. **Choose the correct bump type:**
   - New operator/feature → minor
   - Bug fix → patch
   - Breaking API change → major
4. **Don't modify package.json versions manually** — Changesets handles this
5. **Don't merge release commits yourself** — the Version workflow handles publishing
6. **Don't rely on `prepublishOnly`** — release builds happen in the pack job

## Local / Manual Release Notes

Automated releases build in CI before packing. If you publish manually:

```bash
pnpm --filter prisma-ltree run build
pnpm exec changeset publish
```

Prefer the GitHub Actions path for Trusted Publishing and provenance.

## Troubleshooting

### "No changesets found"

If `publish.yml` runs but doesn't create a PR, check:

- Did you run `pnpm exec changeset` to create the `.changeset/*.md` file?
- Did you commit and push that file?
- Is the file in the `.changeset/` directory?

### Preview package not published

The `ci.yml` publishes preview packages via pkg.pr.new. If it's not showing up:

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

### Version PR not created automatically

If versioning succeeds but GitHub fails with:

```
GitHub Actions is not permitted to create or approve pull requests
```

the version branch (`changeset-release/main`) may still have been pushed — open the PR
manually from that branch. To fix automation:

1. Repo **Settings → Actions → General → Workflow permissions** → **Read and write permissions**
2. Enable **Allow GitHub Actions to create and approve pull requests**
3. Re-run the failed Version workflow (or push an empty commit to `main` with a new changeset)

The `version` job requests `pull-requests: write`; the repo/org setting above must also allow it.

## Links

- [Changesets docs](https://changesets.dev)
- [Automating Changesets (v3)](https://changesets.dev/guide/automating)
- [Migrating from v2](https://changesets.dev/guide/migration)
- [pkg.pr.new](https://www.pkg.pr.new/)
