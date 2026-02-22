import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

let tsParser = null;
let tsPlugin = null;

try {
  const parserModule = await import("@typescript-eslint/parser");
  const pluginModule = await import("@typescript-eslint/eslint-plugin");
  tsParser = parserModule.default;
  tsPlugin = pluginModule.default;
} catch (error) {
  console.warn(
    "Warning: Failed to load @typescript-eslint/parser or @typescript-eslint/eslint-plugin. TypeScript files will not be linted.",
    error,
  );
}

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  ...(tsParser && tsPlugin
    ? [
        {
          files: ["**/*.{ts,tsx}"],
          extends: [
            reactHooks.configs["recommended-latest"],
            reactRefresh.configs.vite,
          ],
          plugins: {
            "@typescript-eslint": tsPlugin,
          },
          languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
              ecmaVersion: "latest",
              sourceType: "module",
              ecmaFeatures: { jsx: true },
            },
          },
          rules: {
            ...tsPlugin.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
              "error",
              { varsIgnorePattern: "^[A-Z_]" },
            ],
          },
        },
      ]
    : []),
  {
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/vitest.setup.mjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
]);
