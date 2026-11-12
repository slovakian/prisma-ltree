import { describe, expectTypeOf, test } from "vite-plus/test";
import type { LtreeHierarchyMethods } from "../src/core/hierarchy-collection-methods";
import type { Ltree } from "../src/types/codec-types";

type LtreeField = {
  readonly nullable: false;
  readonly type: {
    readonly kind: "scalar";
    readonly codecId: "pg/ltree@1";
  };
};

type MethodsFor<Fields extends object> = (LtreeHierarchyMethods & {
  readonly model: {
    readonly target: "postgres";
    readonly name: "Category";
    readonly fields: Fields;
    readonly relations: Record<never, never>;
    readonly table: { readonly columns: Record<never, never>; readonly indexes: readonly [] };
  };
})["methods"];

type CategoryFields = {
  readonly id: {
    readonly nullable: false;
    readonly type: { readonly kind: "scalar"; readonly codecId: "pg/int4@1" };
  };
  readonly path: LtreeField;
  readonly breadcrumbs: LtreeField & { readonly many: { readonly elementNullable: false } };
};

describe("the ltree hierarchy collection methods", () => {
  test("are two per scalar ltree field that is not a list, filtering only", () => {
    type Actual = MethodsFor<CategoryFields>;
    expectTypeOf<Actual["path_descendants"]["parameters"]>().toEqualTypeOf<
      readonly [root: Ltree]
    >();
    expectTypeOf<Actual["path_descendants"]["filters"]>().toEqualTypeOf<true>();
    expectTypeOf<Actual["path_descendants"]["orders"]>().toEqualTypeOf<false>();
    expectTypeOf<Actual["path_ancestors"]["parameters"]>().toEqualTypeOf<readonly [leaf: Ltree]>();
    expectTypeOf<Actual["path_ancestors"]["filters"]>().toEqualTypeOf<true>();
    expectTypeOf<Actual["path_ancestors"]["orders"]>().toEqualTypeOf<false>();
    expectTypeOf<keyof Actual>().toEqualTypeOf<"path_descendants" | "path_ancestors">();
  });

  test("are none for a model with no ltree field", () => {
    expectTypeOf<MethodsFor<Pick<CategoryFields, "id">>>().toEqualTypeOf<Record<never, never>>();
  });
});
