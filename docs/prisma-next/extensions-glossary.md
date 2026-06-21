# Extensions Glossary

Source: prisma-next `docs/reference/extensions-glossary.md`

## Core Concepts

### Data Contract

A canonical, verifiable JSON artifact that describes an application's data model, relationships, invariants, and policies. Serialized as `contract.json` with `storageHash`, optional `executionHash`, and optional `profileHash`.

### Extension Pack

A versioned, installable npm package that extends Prisma Next with domain-specific features. Packs declare a namespace, provide schemas for contract decorations, and implement SPIs for authoring, runtime, and migration integration.

### Codec

A deterministic encoder/decoder pair for converting between JavaScript values and database wire formats. Three artifacts:

1. **Codec class** extending `CodecImpl<Id, TTraits, TWire, TInput>`
2. **Descriptor class** extending `CodecDescriptorImpl<P>`
3. **Per-codec column helper** calling `descriptor.factory(...)` and packaging into a `ColumnSpec`

### Branded Type

A TypeScript nominal type carrying semantic info about extension values (e.g., `Vector<1536>`). Prevents mixing incompatible extension values.

### Capability Key

A canonical identifier for a database or extension feature (e.g., `sql.lateral`, `pgvector.ivfflat`). Namespaced and follows a stability contract.

## Extension Architecture

### Namespace

A lowercase identifier (`^[a-z][a-z0-9_-]*$`) uniquely identifying an extension pack. Used for PSL constructor paths (`pgvector.Vector(...)`) and contract organization.

### Contract Extensions

A section in `contract.json` under `extensions.<namespace>` containing pack-specific decorations and constructs.

### Contract Space

Each schema-contributing extension owns a `(contract.json, migrations, headRef)` triple treated by the framework with the same per-space planner/runner/verifier the application uses.

## Runtime Integration

### Codec Resolution

Deterministic assembly of active codecs with strict precedence: app-provided → pack codecs → adapter built-ins → driver fallbacks. Cached per contract type and adapter profile.

## Migration and Deployment

### Extension-Aware Migrations

Migration operations that understand extension capabilities and gate execution on pack availability. Includes pre/post checks and rollback strategies.

### InvariantId

An immutable string identifier (e.g., `pgvector:install-vector-v1`) emitted by baseline migrations. Once published, never changes — downstream consumers reference by literal string match.

## Package.json `prismaNext` metadata

```json
{
  "prismaNext": {
    "family": "sql",
    "dialects": ["postgres"],
    "type": "extension-pack"
  }
}
```

External extension packs also exact-pin every `@prisma-next/*` dependency to the framework version
they were validated against. See [Versioning & Compatibility](./versioning-and-compatibility.md).
