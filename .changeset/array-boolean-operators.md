---
"prisma-ltree": minor
---

Add boolean `ltree[]` operators (`containsAncestorOf`, `containsDescendantOf`, `matchesAnyLquery`, `matchesAnyLqueryArray`, `matchesAnyLtxtquery`) and the scalar commutators `isAncestorOfAny` and `isDescendantOfAny`. A GiST index on an `ltree[]` column can serve the descendant and pattern checks.
