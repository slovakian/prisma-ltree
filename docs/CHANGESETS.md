# Changesets Workflow

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing of the `prisma-ltree` package to npm.

## Overview

Changesets is a workflow tool that:

- Tracks what changed between releases
- Automatically calculates version bumps (major, minor, patch)
- Generates changelogs
- Publishes to npm when ready

## For Contributors

### Creating a Changeset

When you make a change that should be released, create a changeset:

```bash
pnpm exec changeset
```

This will prompt you to:

1. Select which packages changed (typically `prisma-ltree`)
2. Choose the bump type (major/minor/patch)
3. Write a summary of the change

The tool creates a file in `.changeset/` like:

```
.changeset/chatty-vees-jump.md
```

Commit this file with your change.

### Bump Types

- **patch** (e.g., 0.1.0 → 0.1.1) — Bug fixes, internal improvements
- **minor** (e.g., 0.1.0 → 0.2.0) — New features (backwards compatible)
- **major** (e.g., 0.1.0 → 1.0.0) — Breaking changes

## Workflow

### On Pull Requests

1. Create your feature/fix branch
2. Make your changes
3. Run `pnpm exec changeset` to document what changed
4. Push both your code and the `.changeset/*.md` file
5. Open a PR — pkg.pr.new will automatically publish a preview package

### On Main (After Merge)

1. The Version workflow detects changesets
2. It creates or updates a "Version Packages" PR
3. When that PR is merged:
   - Package version is bumped
   - Changelog is updated
   - Package is published to npm

### Skipping Version Updates

If a commit should not trigger a version update (e.g., doc-only changes), add `[skip-version]` to the commit message:

```bash
git commit -m "docs: update readme [skip-version]"
```

## GitHub Actions Workflows

### `version.yml` (Main → Version PR)

Runs on every push to `main`:

- Detects changesets in `.changeset/`
- Creates/updates the "Version Packages" PR
- When that PR merges, publishes to npm

### `ci.yml` (Validation)

Runs on every PR and push:

- Validates extension (lint, type-check, test, build)
- Publishes preview package via pkg.pr.new

### pkg.pr.new Integration

Preview packages are published automatically for every PR:

- URL format: `@prisma-ltree@0.0.0-pr-<number>-<hash>.tgz`
- Use for testing in your own projects before official release
- Automatically cleaned up after PR is closed

## For Agents

When implementing features or fixes:

1. **Always create a changeset** with `pnpm exec changeset` before pushing
2. **Commit the `.changeset/*.md` file** — don't skip it
3. **Choose the correct bump type:**
   - New operator/feature → minor
   - Bug fix → patch
   - Breaking API change → major
4. **Don't modify package.json versions manually** — changesets handles this
5. **Don't merge release commits yourself** — the Version workflow handles publishing

The Version workflow will:

- Automatically create a version PR on main
- Bump versions based on changeset summaries
- Update CHANGELOG.md
- Publish to npm when the version PR is merged

## Troubleshooting

### "No changesets found"

If `version.yml` runs but doesn't create a PR, check:

- Did you run `pnpm exec changeset` to create the `.changeset/*.md` file?
- Did you commit and push that file?
- Is the file in the `.changeset/` directory?

### Preview package not published

The `ci.yml` publishes preview packages via pkg.pr.new. If it's not showing up:

- Check the "Publish preview package" step in the CI logs
- Verify the package builds correctly with `vp run build`

### Publishing fails

The `version.yml` workflow uses npm Trusted Publishing (OIDC) — no secrets needed:

1. Go to: https://www.npmjs.com/settings/[your-username]/packages/prisma-ltree/settings
2. Under "Publishing access", add GitHub OIDC provider with:
   - Repository: `slovakian/prisma-ltree`
   - Branch: `main`
3. Save

If you still see errors, check the version.yml workflow logs in GitHub Actions.

## Links

- [Changesets docs](https://github.com/changesets/changesets)
- [pkg.pr.new](https://www.pkg.pr.new/)
