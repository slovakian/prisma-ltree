export const LTREE_SPACE_ID = "ltree" as const;

export const LTREE_NATIVE_TYPE = "ltree" as const;

/** Contract storage.types key — must be a valid identifier for contract emit. */
export const LTREE_ARRAY_STORAGE_TYPE = "ltreeArray" as const;

export const LTREE_BASELINE_MIGRATION_NAME = "20260619T2142_install_ltree" as const;

export const LTREE_DECLARE_EXTENSION_MIGRATION_NAME =
  "20261111T1905_declare_ltree_extension" as const;

export const LTREE_CREATE_EXTENSION_MIGRATION_NAME =
  "20261111T1904_create_ltree_extension" as const;

export const LTREE_INVARIANTS = {
  installLtree: "ltree:install-ltree-v1",
} as const;
