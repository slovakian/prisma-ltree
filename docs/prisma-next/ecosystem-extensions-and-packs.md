# Ecosystem Extensions & Packs

Source: prisma-next `docs/architecture docs/subsystems/6. Ecosystem Extensions & Packs.md`

## Overview

Extensions and packs provide a disciplined way to add domain capabilities (vector search, geospatial) without bloating core. Packs contribute deterministic data to the contract, type-safe query surfaces, codecs for values, migration operations, and optional guardrails.

Responsibilities:

- Encode extension data deterministically into `contract.extensionPacks.<namespace>` during emission
- Provide lane helpers/operators and deterministic lowerers gated by declared capabilities
- Supply codecs and optional guardrails at runtime as composable plugins
- Define migration operations with pre/post checks and clear idempotency

## Four Slices Per Pack

A pack is a TS/JS package that may provide any subset of four slices:

1. **PSL/contract slice (compile-time)** — PSL attributes, blocks, validators that contribute to `contract.extensionPacks.<ns>`. Purely data producing.
2. **Query-lane slice (build-time)** — Relational DSL helpers and deterministic lowerers gated by capability IDs.
3. **Runtime slice (execute-time)** — Codecs for parameters/results, optional guardrails or lints.
4. **Migration slice (plan/apply-time)** — Custom operations with pre/post checks, idempotency classification.

## Multi-Plane Entrypoints

| Entrypoint                                          | Role                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `/control`                                          | Descriptor for `prisma-next.config.ts`; migration/contract-space wiring |
| `/runtime`                                          | Codecs + query operations at execution time                             |
| `/pack`                                             | Pure metadata for TS contract authoring                                 |
| `/codec-types`, `/operation-types`, `/column-types` | Types for emitted `contract.d.ts`                                       |

## Schema-Contributing Extensions: Contract Spaces

Some extensions ship persistence structures the user's schema references (e.g., pgvector's `vector` type). ADR 212 (historical docs from the former `prisma/prisma-next` tree) introduces **contract spaces**: each schema-contributing extension owns a `(contract.json, migrations, headRef)` triple.

### Descriptor's `contractSpace` field

```ts
export interface SqlControlExtensionDescriptor<
  TTargetId extends string,
> extends ControlExtensionDescriptor<"sql", TTargetId> {
  readonly contractSpace?: ContractSpace<Contract<SqlStorage>>;
}
```

### Pinned per-space artifacts on disk

```
migrations/
└── pgvector/
    ├── contract.json                 ← byte-for-byte == descriptor.contractSpace.contractJson
    ├── contract.d.ts                 ← typed interface for the pgvector schema
    ├── refs/head.json                ← byte-for-byte == descriptor.contractSpace.headRef
    └── 20240601T0000_install_vector/
        └── …
```

### Canonical reference implementations

- **pgvector**: `packages/3-extensions/pgvector/` — parameterized `vector(N)` type, cosine ops, `CREATE EXTENSION vector`
- **postgis**: `packages/3-extensions/postgis/` — geometry codec, spatial predicates
- **paradedb**: `packages/3-extensions/paradedb/` — pg_search install + search ops

## Key Flows

### Local authoring and execution

1. Developer installs a pack via npm
2. Emitter reads PSL and invokes pack contract slice to produce deterministic JSON under `extensionPacks.<ns>`
3. DSL uses pack lane slice to build AST nodes and lower to SQL
4. Runtime registers pack codecs and optional lints

### Flow: `extensions` in config → contract emit → db init/update applies extension contract-space migration → runtime registers codecs + column methods

## Testing Anatomy

```
src/__tests__/
├── contract/
├── lanes/operators.test.ts           # Operator lowering and type inference
├── runtime/codecs.test.ts            # Encode/decode round-trip
├── migrations/operations.test.ts     # DDL and data ops
└── integration.test.ts               # End-to-end workflows
```

## See Also

- [Extension Packs — Naming and Layout](./extension-packs-naming-and-layout.md)
- [Extensions Glossary](./extensions-glossary.md)
- [Codec Authoring Guide](./codec-authoring-guide.md)
- [Core vs Pack Entity Catalog](./core-vs-pack-entity-catalog.md)
