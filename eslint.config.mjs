import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

import noLegacyAuthz from "./eslint-rules/no-legacy-authz.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const legacyAllowlist = JSON.parse(
  readFileSync(join(__dirname, "eslint-legacy-authz-allowlist.json"), "utf8"),
);

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "brag-output/**",
      "coverage/**",
      "drizzle/**",
      "load-test/**",
      "scripts/**",
      "evals/**",
      "tests/**",
      // Legacy isometric figure kits (predate lint; not request path).
      "components/iso/**",
      "components/figures/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      sol: {
        rules: {
          "no-legacy-authz": noLegacyAuthz,
        },
      },
    },
    rules: {
      // Warn until the backlog is cleared; `_` prefixes remain intentional.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "sol/no-legacy-authz": ["error", { allowlist: legacyAllowlist }],
      // Wave 4 (24): lib/ai/gateway.ts is the sole OpenAI entry point.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/ai/openai",
              message:
                "Use getAiClient()/runAi() from '@/lib/ai/gateway' — createOpenAIClient is gateway-only.",
            },
            {
              name: "openai",
              message:
                "Construct OpenAI clients via '@/lib/ai/gateway' only (use `import type` for types).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // The gateway and its factory are the only legitimate importers.
    files: ["lib/ai/gateway.ts", "lib/ai/openai.ts"],
    rules: { "no-restricted-imports": "off" },
  },
];
