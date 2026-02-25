import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // Ignore generated/compiled artifacts — never lint these
    ignores: [
      "workers/voice-agent/dist/**",
      "public/sw.js",
      "scripts/*.mjs",
      "scripts/*.ts",
      ".next/**",
      "get-shit-done/**",
      "fred-cary-db/**",
    ],
  },
  {
    // Test files: allow `any` in mocks — standard practice per TypeScript ESLint docs
    files: [
      "tests/**",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "vitest.setup.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
];

export default eslintConfig;
