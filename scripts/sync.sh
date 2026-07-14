#!/usr/bin/env bash
# sync.sh — refresh the prisma-next git subtree (and remind about ltree docs)
#
# Usage:  bash scripts/sync.sh
# Run:    pnpm run sync-prisma-next
#
# What it does:
#   1. Pulls latest prisma-next into vendor/prisma-next/ via `git subtree pull --squash`.
#      That tree is committed in this repo so agents always have reference
#      implementations (pgvector, postgis), SPI types, and extension skills —
#      no clone step required to *read* them.
#   2. Prints a reminder to check ltree docs — the committed reference at
#      docs/ltree/postgresql-ltree-reference.md is the baseline; PostgreSQL
#      releases may bring new operators/functions.
#
# Prerequisites: clean git working tree (subtree pull creates commits).
set -euo pipefail

cd "$(dirname "$0")/.."

PRISMA_NEXT_URL="${PRISMA_NEXT_URL:-https://github.com/prisma/prisma-next.git}"
PRISMA_NEXT_REF="${PRISMA_NEXT_REF:-main}"
LTREE_DOCS_URL="${LTREE_DOCS_URL:-https://www.postgresql.org/docs/current/ltree.html}"
PREFIX="vendor/prisma-next"

echo "=== sync: prisma-next subtree ==="
echo "  prefix: $PREFIX"
echo "  remote: $PRISMA_NEXT_URL ($PRISMA_NEXT_REF)"

if [ ! -d "$PREFIX" ]; then
  echo "  ERROR: $PREFIX is missing."
  echo "  Re-add the subtree with:"
  echo "    git subtree add --prefix=$PREFIX $PRISMA_NEXT_URL $PRISMA_NEXT_REF --squash"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "  ERROR: working tree is dirty. Commit or stash before syncing."
  exit 1
fi

git subtree pull \
  --prefix="$PREFIX" \
  "$PRISMA_NEXT_URL" \
  "$PRISMA_NEXT_REF" \
  --squash \
  -m "chore: sync prisma-next subtree from ${PRISMA_NEXT_REF}"

echo "  prisma-next ready at $PREFIX"
echo "  key reference dirs:"
echo "    $PREFIX/packages/3-extensions/pgvector/"
echo "    $PREFIX/packages/3-extensions/postgis/"
echo "    $PREFIX/packages/3-extensions/paradedb/"
echo "    $PREFIX/docs/"
echo "    $PREFIX/skills/extension-author/"

echo ""
echo "=== sync: ltree docs ==="
echo "  note: ltree docs change rarely (PG release cadence)."
echo "  committed reference: docs/ltree/postgresql-ltree-reference.md"
echo "  current online:      $LTREE_DOCS_URL"
echo "  to refresh: use the webfetch tool or visit the URL above."

echo ""
echo "=== sync complete ==="
echo "  Review the subtree merge commit, then push when ready."
