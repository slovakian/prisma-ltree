---
"prisma-ltree": minor
---

Upgrade framework pins to `@prisma-next/*@0.16.0`. Document GiST indexes on `ltree` / `ltree[]` columns (`@@index(..., type: "gist")` / `constraints.index(..., { type: "gist" })`), now supported by the Postgres target's built-in index-type registry.
