---
name: prisma-ltree
description: >-
  Route vague prisma-ltree / ltree extension prompts to the right workflow
  skill. Use for "help with prisma-ltree", "how does this extension work",
  "where do I start with ltree", "explain the four slices", "I'm new to this
  repo", "what can I do with prisma-ltree", and comparison questions about
  extension architecture. Do NOT use when the prompt clearly matches a sibling
  workflow — onboarding / context loading, codec or column-helper work, query
  operator authoring, testing, local validation (vp check / test / build /
  ready), or upgrading @prisma-next/* (use upstream prisma-next-extension-upgrade).
---

# prisma-ltree — Router

This skill disambiguates vague prompts about the **prisma-ltree** monorepo — the `@prisma-next/extension-ltree` pack for PostgreSQL `ltree`. When the user hasn't named a concrete task, route them to the right sibling skill.

## When to use

- The user has not stated a concrete task.
- Meta-questions: _"how does this extension work?"_, _"what's the architecture?"_
- First touch on the repo without a specific file or feature named.

## When not to use

Load the matching sibling directly when the user names a workflow:

| User intent                                             | Skill                                      |
| ------------------------------------------------------- | ------------------------------------------ |
| First session, project layout, sync-docs, reference map | `prisma-ltree-onboard`                     |
| Codec, column helper, encode/decode, validation         | `prisma-ltree-codec`                       |
| Query operator, SQL lowering, `descriptor-meta.ts`      | `prisma-ltree-operators`                   |
| Tests, coverage, PGlite integration, golden lowering    | `prisma-ltree-test`                        |
| `vp check`, `vp test`, build, `ready`, check-pins       | `prisma-ltree-develop`                     |
| Bump `@prisma-next/*` minor versions                    | `prisma-next-extension-upgrade` (upstream) |

## Routing rules

If the prompt clearly matches a sibling, route there without asking.

Otherwise ask **one** disambiguating question. Pick from:

- _"Are you trying to understand the project layout, or implement a specific feature?"_ → `prisma-ltree-onboard` vs `prisma-ltree-operators` / `prisma-ltree-codec`.
- _"Is this about a codec/column type, or a query operator that lowers to SQL?"_ → `prisma-ltree-codec` vs `prisma-ltree-operators`.
- _"Do you want to write or fix tests, or run the validation suite?"_ → `prisma-ltree-test` vs `prisma-ltree-develop`.
- _"Are you upgrading the Prisma Next framework pins?"_ → `prisma-next-extension-upgrade`.

If you still can't tell, ask what they want to accomplish. Do not guess.

## Canonical model (one paragraph)

`prisma-ltree` is a Prisma Next **extension pack** with four optional slices: contract (column types + baseline migration), query-lane (typed operators → SQL templates), runtime (codecs + operation registry), and migrate (contract space on disk). The pack exposes multi-plane entrypoints (`/control`, `/runtime`, `/column-types`, `/codec-types`, `/operation-types`, `/pack`). Consumer apps compose the pack in `prisma-next.config.ts` and reference `ltree()` columns in their contract.

## Checklist

- [ ] If the prompt matches a sibling workflow, route there without asking.
- [ ] If vague, ask one disambiguating question.
- [ ] Do not answer implementation questions from this skill — load the sibling first.
- [ ] Framework upgrades always go to upstream `prisma-next-extension-upgrade`, not a local skill.
