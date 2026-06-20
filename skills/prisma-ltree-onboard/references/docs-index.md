# Docs index — when to read what

| Doc                        | Path                                                    | Read when                                                |
| -------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Feature support matrix     | `docs/feature-support.md`                               | Any user-facing change; check status before implementing |
| Product spec               | `docs/spec/prisma-ltree-spec.md`                        | Full requirements, tiers, acceptance criteria            |
| Extension architecture hub | `docs/prisma-next/ecosystem-extensions-and-packs.md`    | Four-slice model, contract spaces, flows                 |
| Naming & layout            | `docs/prisma-next/extension-packs-naming-and-layout.md` | Package exports, directory conventions                   |
| Extensions glossary        | `docs/prisma-next/extensions-glossary.md`               | Terminology: codecs, invariantIds, contract spaces       |
| Codec authoring            | `docs/prisma-next/codec-authoring-guide.md`             | Writing encode/decode, descriptors, column helpers       |
| Core vs pack catalog       | `docs/prisma-next/core-vs-pack-entity-catalog.md`       | What's core vs extension-provided                        |
| Versioning & compatibility | `docs/prisma-next/versioning-and-compatibility.md`      | Pin rules, upgrade workflow, release checklist           |
| PostgreSQL ltree reference | `docs/ltree/postgresql-ltree-reference.md`              | SQL operators, functions, index types                    |
| ADR-001 LCA API            | `docs/decisions/ADR-001-lca-api-shape.md`               | Variadic lca constraints                                 |
| ADR-002 free functions     | `docs/decisions/ADR-002-free-function-lowering.md`      | toLtree, prependText receiver rules                      |
| ADR-003 array receiver     | `docs/decisions/ADR-003-array-receiver.md`              | ltree[] codec and first-match ops                        |
| CLAUDE.md / AGENTS.md      | repo root                                               | Skill loading, sync-docs, reference path map             |

Progress logs (optional): `docs/progress/` — per-tier implementation notes.
