import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "**/src/contract.json",
      "**/src/contract.d.ts",
      "**/migrations/**/migration.json",
      "**/migrations/**/ops.json",
      "**/migrations/**/end-contract.json",
      "**/migrations/**/end-contract.d.ts",
      "**/migrations/**/start-contract.json",
      "**/migrations/**/head.contract.json",
      "**/migrations/**/head.contract.d.ts",
      "**/routeTree.gen.ts",
      ".agents/**",
      "agent/**",
      "vendor/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "**/routeTree.gen.ts",
      ".agents/**",
      "agent/**",
      "apps/web/**",
      "vendor/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
