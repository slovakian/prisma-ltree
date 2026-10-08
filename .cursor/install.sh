#!/usr/bin/env bash
# Cloud Agent install step for prisma-ltree.
# Idempotent: safe to run repeatedly against cached or partially prepared state.
set -euo pipefail

# The repo requires Node >=24 (package.json engines) and pins pnpm@11.7.0 via
# `packageManager`. The base image ships Node 22 (which also shadows nvm on PATH
# via /exec-daemon/node), so provision Node 24 through nvm and make it the
# default. Setting the default alias is what lets interactive agent shells
# resolve Node 24 automatically (nvm's auto-use prepends its bin ahead of the
# base image's Node 22).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

nvm install 24 >/dev/null
nvm alias default 24 >/dev/null
nvm use 24 >/dev/null

# Ensure this (non-interactive) script uses Node 24 for the commands below.
export PATH="$(dirname "$(nvm which 24)"):$PATH"

# Activate the pinned pnpm via corepack.
corepack enable
corepack prepare pnpm@11.7.0 --activate

# Install workspace dependencies (apps/* + packages/*). Vite+ (`vp`) and the
# git hooks are wired by the repo's `prepare` script during install.
pnpm install --frozen-lockfile

echo "prisma-ltree install complete: node $(node -v), pnpm $(pnpm -v)"
