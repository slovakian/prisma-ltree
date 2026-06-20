import type { CodecTypes as CoreCodecTypes } from "../core/codecs";

export type Ltree = string & { readonly __ltree?: undefined };

export type LtreeArray = readonly string[] & { readonly __ltreeArray?: undefined };

export type CodecTypes = CoreCodecTypes;
