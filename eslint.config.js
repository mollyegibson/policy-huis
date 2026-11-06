import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["**/node_modules/**", ".yarn/**", "**/.venv/**", "**/dbt/**", "**/dist/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["browser-app/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    rules: { "react-hooks/exhaustive-deps": "error" }
  },
  { files: ["eslint.config.js"], extends: [tseslint.configs.disableTypeChecked] }
)
