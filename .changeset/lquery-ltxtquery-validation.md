---
"prisma-ltree": patch
---

Validate literal `lquery` / `ltxtquery` pattern args at query-build time with clearer errors (empty patterns, empty segments, unbalanced operators) while leaving Expression binds to Postgres.
