# Changesets Setup Checklist

✅ **Completed:**

- [x] @changesets/cli installed
- [x] `.changeset/config.json` configured for public npm publishing
- [x] `.github/workflows/publish.yml` created for automated versioning
- [x] `docs/CHANGESETS.md` documentation written
- [x] `pnpm run changeset` script added

## 🔧 What's Next (Actions Required)

### 1. Configure npm Trusted Publishing (OIDC)

The `publish.yml` workflow uses **Trusted Publishing** — a secure, token-free approach using OpenID Connect.

**On npm.org:**

1. Go to: https://www.npmjs.com/settings/[your-username]/packages/prisma-ltree/settings
2. Scroll to "Publishing access" section
3. Add GitHub OIDC provider:
   - Repository: `slovakian/prisma-ltree`
   - Repository owner: `slovakian`
   - Repository branch: `main`
4. Save

**That's it!** No secrets to configure. The workflow automatically uses GitHub's OIDC token to authenticate.

> **Why Trusted Publishing?**
>
> - No tokens stored as GitHub secrets
> - Automatic token rotation
> - Auditable via npm activity logs
> - More secure than static tokens

### 2. Test the Workflow (Optional but Recommended)

Create a test changeset on a feature branch:

```bash
git checkout -b test/changesets
pnpm run changeset
# Select: prisma-ltree
# Choose: patch
# Message: "test: verify changesets workflow"
git add .changeset/
git commit -m "test: add changeset"
git push origin test/changesets
```

Then:

1. Open a PR
2. Verify pkg.pr.new publishes preview package
3. Merge to main
4. Watch GitHub Actions → publish.yml creates a version PR
5. Review and merge the version PR to publish to npm

### 3. Update Package Metadata (Optional)

Consider adding these to `packages/extension-ltree/package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/slovakian/prisma-ltree.git",
    "directory": "packages/extension-ltree"
  },
  "bugs": {
    "url": "https://github.com/slovakian/prisma-ltree/issues"
  },
  "homepage": "https://github.com/slovakian/prisma-ltree#readme"
}
```

(These are already present in the package.json)

## 📋 Workflow Summary

```
Feature Branch
  ↓
git commit (with code + .changeset/*.md)
  ↓
Open PR
  ↓
CI validates (ci.yml)
  ↓
pkg.pr.new publishes preview package
  ↓
Merge to main
  ↓
publish.yml runs
  ↓
Creates "Version Packages" PR with:
  - Version bumps
  - Updated CHANGELOG.md
  - Automated commit
  ↓
Review and merge Version PR
  ↓
NPM package published automatically! 🎉
```

## 🚨 Important Notes

- **Never skip changesets:** Always run `pnpm run changeset` for features/fixes
- **The .changeset/\*.md file is required:** It tells changesets what changed
- **[skip-version] flag:** For doc-only changes, add this to commit message
- **Package versioning is automatic:** Don't manually bump package.json versions
- **Multiple changesets are OK:** If you make multiple changes, create multiple changeset files
- **Version PR automation:** Repo workflow permissions must allow GHA to create PRs (`Settings → Actions → Workflow permissions`: read/write + allow PR creation). See `docs/CHANGESETS.md` troubleshooting if the Version workflow fails after merge.

## 🔗 Quick Links

- Full guide: `docs/CHANGESETS.md`
- Changesets docs: https://github.com/changesets/changesets
- pkg.pr.new: https://www.pkg.pr.new/
