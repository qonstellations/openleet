import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { console: "readonly" } }
  },
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { chrome: "readonly", document: "readonly", window: "readonly", fetch: "readonly", AbortController: "readonly", URL: "readonly", crypto: "readonly", CustomEvent: "readonly", HTMLElement: "readonly", HTMLInputElement: "readonly", HTMLSelectElement: "readonly", HTMLTextAreaElement: "readonly", SVGElement: "readonly", MutationObserver: "readonly", location: "readonly", localStorage: "readonly", setTimeout: "readonly", clearTimeout: "readonly", console: "readonly" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  }
);
