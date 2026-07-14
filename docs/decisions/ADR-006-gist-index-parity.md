# ADR-006: GiST index authoring — blocked on PSL↔TS parity

**Status:** Superseded / blocked (do not ship)  
**Date:** 2026-07-08  
**Superseded by:** [gist-index-psl-ts-parity-blocker.md](gist-index-psl-ts-parity-blocker.md)

## Summary

A spike on branch `cursor/gist-indexes-b338` registered `gist` on the ltree pack via
`defineIndexTypes()`, mirroring paradedb's `bm25` pattern. **TS lane emit works** with
standard `defineContract({ extensionPacks: { ltree } })`. **PSL lane emit fails** with
the standard `@prisma-next/postgres/config` `defineConfig` shape.

Until both lanes work on the **same consumer config path** with identical Contract IR,
GiST indexes will not ship.

## Decision (revised)

**Do not release GiST index support.** Keep implementation on a feature branch for
when upstream or a documented first-class wiring path closes the gap.

See the [full technical analysis](gist-index-psl-ts-parity-blocker.md) for root cause,
`siglen` explanation, and resolution options.
