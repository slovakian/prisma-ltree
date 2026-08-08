# Codec Authoring Guide

Source: prisma-next `docs/reference/codec-authoring-guide.md`

## At a Glance

A codec is **three artifacts**:

1. A **codec class** extending `CodecImpl<Id, TTraits, TWire, TInput>` — implements `encode`/`decode`/`encodeJson`/`decodeJson`
2. A **descriptor class** extending `CodecDescriptorImpl<P>` — declares codec id, traits, target types, params schema, factory
3. A **per-codec column helper** calling `descriptor.factory(...)` directly, packaging into a `ColumnSpec` via `column(...)`. Carries `satisfies ColumnHelperFor<D>`

## Framework Imports

From `@prisma/orm-framework/components/codec`:

- `CodecImpl<Id, TTraits, TWire, TInput>` — abstract codec base class
- `CodecDescriptorImpl<P>` — abstract descriptor base class
- `ColumnHelperFor<D>` / `ColumnHelperForStrict<D>` — `satisfies` shapes
- `column(codecFactory, codecId, typeParams, nativeType)` — column-spec packager
- `voidParamsSchema` — Standard Schema validator for `P = void`

## Case 1 — Non-parameterized codec (pattern for `ltree`)

```ts
class LtreeCodec extends CodecImpl<"pg/ltree@1", readonly ["equality", "order"], string, string> {
  async encode(value: string, _ctx: CodecCallContext) {
    return value;
  }
  async decode(wire: string, _ctx: CodecCallContext) {
    return wire;
  }
}

class LtreeDescriptor extends CodecDescriptorImpl<void> {
  override readonly codecId = "pg/ltree@1" as const;
  override readonly traits = ["equality", "order"] as const;
  override readonly targetTypes = ["ltree"] as const;
  override readonly paramsSchema = voidParamsSchema;
  override renderOutputType(): string {
    return "string";
  }
  override factory(): (ctx: CodecInstanceContext) => LtreeCodec {
    const shared = new LtreeCodec(this);
    return () => shared;
  }
}

export const ltreeDescriptor = new LtreeDescriptor();

export const ltree = () =>
  column(ltreeDescriptor.factory(), ltreeDescriptor.codecId, undefined, "ltree");
ltree satisfies ColumnHelperFor<LtreeDescriptor>;
```

The factory is **constant**: every call returns the same shared codec instance. The runtime relies on this contract.

## Case 2 — Parameterized codec with literal preservation (pgvector pattern)

```ts
class VectorCodec<N extends number> extends CodecImpl<
  "pg/vector@1",
  readonly ["equality"],
  string,
  number[]
> {
  constructor(
    descriptor: PgVectorDescriptor,
    readonly dimension: N,
  ) {
    super(descriptor);
  }
  async encode(value: number[], _ctx: CodecCallContext) {
    return `[${value.join(",")}]`;
  }
  async decode(wire: string, _ctx: CodecCallContext) {
    return parseVector(wire);
  }
}

class PgVectorDescriptor extends CodecDescriptorImpl<{ readonly length: number }> {
  override readonly codecId = "pg/vector@1" as const;
  override readonly traits = ["equality"] as const;
  override readonly targetTypes = ["vector"] as const;
  override readonly paramsSchema = type({ length: "number > 0" });
  override renderOutputType({ length }: { length: number }) {
    return `Vector<${length}>`;
  }
  override factory<N extends number>(params: {
    readonly length: N;
  }): (ctx: CodecInstanceContext) => VectorCodec<N> {
    return (ctx) => new VectorCodec<N>(this, params.length);
  }
}

export const vector = <N extends number>(length: N) =>
  column(pgVectorDescriptor.factory({ length }), pgVectorDescriptor.codecId, { length }, "vector");
vector satisfies ColumnHelperFor<PgVectorDescriptor>;
```

**Method generics on the descriptor's factory** preserve literals. Direct invocation (not structural extraction) preserves `N`.

## `satisfies` Discipline

- `ColumnHelperFor<D>` — checks helper returns `ColumnSpec` whose typeParams matches descriptor. Catches wiring errors; doesn't catch literal-preservation violations.
- `ColumnHelperForStrict<D>` — also checks codec type matches `ReturnType<D['factory']>`. Use when codec's resolved type is well-defined.

## Pitfalls

- **`override` discipline.** With `noImplicitOverride`, every concrete-subclass member touching inherited members must carry `override`.
- **Don't widen the factory return at the descriptor.** Concrete descriptors should declare typed return like `(ctx) => VectorCodec<N>`, not `(ctx) => Codec<...>`.
- **Don't extract codec types via `Parameters`/`ReturnType` of descriptor's `factory`.** TypeScript widens method generics to constraint. Use per-codec helper's typed return.
- **Don't reach through the codec instance for metadata.** Read traits/target types/meta from `descriptor` (e.g. `context.codecDescriptors.descriptorFor(codecId).traits`).
