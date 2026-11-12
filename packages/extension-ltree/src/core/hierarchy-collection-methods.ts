import type {
  CollectionMethodBody,
  CollectionMethodContribution,
  CollectionMethodContributionId,
  CollectionMethodContributionType,
  CollectionMethodModelType,
} from "@prisma/orm-family-sql/relational-core/collection-methods";
import { blindCast } from "@prisma/orm-framework/utils/casts";
import { InternalError } from "@prisma/orm-framework/utils/internal-error";
import type { Ltree } from "../types/codec-types";
import { LTREE_CODEC_ID } from "./constants";

type LtreeFieldNames<Fields> = {
  [Name in keyof Fields]: Fields[Name] extends { readonly many: object }
    ? never
    : Fields[Name] extends {
          readonly type: { readonly codecId: typeof LTREE_CODEC_ID };
        }
      ? Name
      : never;
}[keyof Fields];

type HierarchyMethodTable<Model extends CollectionMethodModelType> = {
  readonly [Name in LtreeFieldNames<Model["fields"]> & string as `${Name}_descendants`]: {
    readonly parameters: readonly [root: Ltree];
    readonly filters: true;
    readonly orders: false;
  };
} & {
  readonly [Name in LtreeFieldNames<Model["fields"]> & string as `${Name}_ancestors`]: {
    readonly parameters: readonly [leaf: Ltree];
    readonly filters: true;
    readonly orders: false;
  };
};

/**
 * One `{field}_descendants` / `{field}_ancestors` method per scalar `ltree`
 * field. Descendants map to `isDescendantOf` (`<@`); ancestors map to
 * `isAncestorOf` (`@>`). Both are inclusive of equality, matching PostgreSQL.
 */
export interface LtreeHierarchyMethods extends CollectionMethodContributionType {
  readonly methods: HierarchyMethodTable<this["model"]>;
}

declare module "@prisma/orm-family-sql/relational-core/collection-methods" {
  interface CollectionMethodRegistry {
    readonly "ltree/hierarchy": LtreeHierarchyMethods;
  }
}

interface HierarchyField {
  isDescendantOf(root: Ltree): unknown;
  isAncestorOf(leaf: Ltree): unknown;
}

type LtreeFields = Readonly<Record<string, HierarchyField>>;

function fieldOf(model: unknown, field: string): HierarchyField {
  const accessor = blindCast<
    LtreeFields,
    "an ltree field of the ORM model accessor has hierarchy operators"
  >(model)[field];
  if (accessor === undefined) {
    throw new InternalError(`The model accessor has no ltree field "${field}".`);
  }
  return accessor;
}

function descendantsMethod(field: string): CollectionMethodBody {
  return (collection, ...args) => {
    const [root] = blindCast<readonly [Ltree], "the type half declares a root path">(args);
    return collection.where((model) => fieldOf(model, field).isDescendantOf(root));
  };
}

function ancestorsMethod(field: string): CollectionMethodBody {
  return (collection, ...args) => {
    const [leaf] = blindCast<readonly [Ltree], "the type half declares a leaf path">(args);
    return collection.where((model) => fieldOf(model, field).isAncestorOf(leaf));
  };
}

function isScalarLtreeField(field: unknown): boolean {
  if (typeof field !== "object" || field === null) return false;
  const record = field as {
    readonly many?: unknown;
    readonly type?: { readonly kind?: string; readonly codecId?: string };
  };
  return (
    record.many === undefined &&
    record.type?.kind === "scalar" &&
    record.type.codecId === LTREE_CODEC_ID
  );
}

/** The run-time half of `LtreeHierarchyMethods`. */
export const ltreeHierarchyMethods: CollectionMethodContribution = {
  id: "ltree/hierarchy" satisfies CollectionMethodContributionId,
  methodsFor: (model) =>
    Object.fromEntries(
      Object.entries(model.fields).flatMap(([name, field]) =>
        isScalarLtreeField(field)
          ? [
              [`${name}_descendants`, descendantsMethod(name)],
              [`${name}_ancestors`, ancestorsMethod(name)],
            ]
          : [],
      ),
    ),
};
