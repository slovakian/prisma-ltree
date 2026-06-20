import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: [
      "src/exports/control.ts",
      "src/exports/runtime.ts",
      "src/exports/codec-types.ts",
      "src/exports/operation-types.ts",
      "src/exports/column-types.ts",
      "src/exports/pack.ts",
    ],
    dts: { tsgo: true },
    exports: true,
  },
  test: {
    passWithNoTests: true,
    typecheck: {
      enabled: true,
      include: ["**/*.test-d.ts"],
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/contract.ts"],
      reporter: ["text", "html"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
