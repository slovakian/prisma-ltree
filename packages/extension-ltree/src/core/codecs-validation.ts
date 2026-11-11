import { LTREE_MAX_LABEL_LENGTH, LTREE_MAX_LABELS } from "./constants";

const LABEL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function assertValidLtree(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("ltree value must be a string");
  }
  if (value.length === 0) {
    throw new Error("ltree value must not be empty");
  }
  const labels = value.split(".");
  if (labels.length > LTREE_MAX_LABELS) {
    throw new Error(`ltree path exceeds max labels: got ${labels.length}, max ${LTREE_MAX_LABELS}`);
  }
  for (const label of labels) {
    if (label.length === 0) {
      throw new Error(`ltree label must not be empty in path "${value}"`);
    }
    if (label.length > LTREE_MAX_LABEL_LENGTH) {
      throw new Error(
        `ltree label exceeds max length: got ${label.length}, max ${LTREE_MAX_LABEL_LENGTH}`,
      );
    }
    if (!LABEL_PATTERN.test(label)) {
      throw new Error(
        `ltree label "${label}" contains invalid characters; allowed: alphanumeric, underscore, hyphen`,
      );
    }
  }
}
