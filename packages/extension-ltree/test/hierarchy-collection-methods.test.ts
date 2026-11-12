import type { ContractField } from "@prisma/orm-framework/contract/types";
import type {
  CollectionMethodModel,
  CollectionMethodReceiver,
} from "@prisma/orm-family-sql/relational-core/collection-methods";
import { describe, expect, it } from "vite-plus/test";
import { ltreeHierarchyMethods } from "../src/core/hierarchy-collection-methods";
import ltreeRuntimeDescriptor from "../src/exports/runtime";

const ltree = (): ContractField => ({
  nullable: false,
  type: { kind: "scalar", codecId: "pg/ltree@1" },
});

const category: CollectionMethodModel = {
  target: "postgres",
  name: "Category",
  fields: {
    id: { nullable: false, type: { kind: "scalar", codecId: "pg/int4@1" } },
    path: ltree(),
    materialPath: ltree(),
    breadcrumbs: { ...ltree(), many: { elementNullable: false } },
  },
  relations: {},
  table: {
    columns: {},
    indexes: [],
    uniques: [],
    foreignKeys: [],
  } as CollectionMethodModel["table"],
};

function hierarchyRecorder() {
  const steps: unknown[] = [];
  const row = {
    path: {
      isDescendantOf: (root: string) => ({ descendantOf: root }),
      isAncestorOf: (leaf: string) => ({ ancestorOf: leaf }),
    },
  };
  const receiver: CollectionMethodReceiver = {
    where(condition) {
      steps.push({ where: condition(row, { fns: {}, indexes: {} }) });
      return receiver;
    },
    orderBy(order) {
      steps.push({ orderBy: order(row, { fns: {}, indexes: {} }) });
      return receiver;
    },
  };
  return { receiver, steps };
}

describe("the ltree hierarchy collection methods", () => {
  it("are contributed by the runtime extension descriptor", () => {
    expect(ltreeRuntimeDescriptor.collectionMethods?.()).toEqual([ltreeHierarchyMethods]);
  });

  it("are two per scalar ltree field that is not a list, named <field>_descendants and <field>_ancestors", () => {
    expect(Object.keys(ltreeHierarchyMethods.methodsFor(category))).toEqual([
      "path_descendants",
      "path_ancestors",
      "materialPath_descendants",
      "materialPath_ancestors",
    ]);
  });

  it("filter descendants with isDescendantOf on the field", () => {
    const { receiver, steps } = hierarchyRecorder();
    const descendants = ltreeHierarchyMethods.methodsFor(category)["path_descendants"];

    const result = descendants?.(receiver, ...(["electronics"] as never[]));

    expect({ result, steps }).toEqual({
      result: receiver,
      steps: [{ where: { descendantOf: "electronics" } }],
    });
  });

  it("filter ancestors with isAncestorOf on the field", () => {
    const { receiver, steps } = hierarchyRecorder();
    const ancestors = ltreeHierarchyMethods.methodsFor(category)["path_ancestors"];

    const result = ancestors?.(receiver, ...(["electronics.computers.laptops"] as never[]));

    expect({ result, steps }).toEqual({
      result: receiver,
      steps: [{ where: { ancestorOf: "electronics.computers.laptops" } }],
    });
  });
});

describe("a hierarchy collection method", () => {
  it("fails loudly when the model accessor has no such field", () => {
    const receiver: CollectionMethodReceiver = {
      orderBy: () => receiver,
      where(condition) {
        condition({}, { fns: {}, indexes: {} });
        return receiver;
      },
    };
    const descendants = ltreeHierarchyMethods.methodsFor(category)["path_descendants"];

    expect(() => descendants?.(receiver, ...(["electronics"] as never[]))).toThrow(
      'The model accessor has no ltree field "path".',
    );
  });
});
