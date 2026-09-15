import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  //
  // Every pattern is `**/`-prefixed on purpose. An unanchored pattern only matches
  // at the config root, so build output NESTED inside the repo was walked: `eslint`
  // run in the main checkout linted `.claude/worktrees/*/.next/**` — generated,
  // minified code — and reported 18 unparseable files plus 2 `no-explicit-any`
  // errors that exist in no source file. The same run inside a worktree was clean,
  // which is how a ghost failure survives: whether the repo was green depended on
  // where you stood.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Worktrees of this same repo live here. Their files are linted on their own
    // branch, never as a copy of this one.
    ".claude/**",
  ]),
  // eslint-config-next ships `settings.react.version: 'detect'`; detection calls
  // context.getFilename(), removed in ESLint 10, and throws on every file. Pin the version.
  {
    settings: { react: { version: "19.2.8" } },
  },
  // Disable set-state-in-effect: our load functions call setLoading(true) synchronously so they
  // also work as retry callbacks — the rule generates false positives for this legitimate pattern.
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // No `console.log` in the app. `warn` and `error` stay: they are how a route
  // reports a failure it swallowed, and they are what `journalctl -u petvity-app`
  // shows an operator at 2am. A `console.log` is a debugging line somebody forgot,
  // and on a server it writes a stranger's data into the journal forever.
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  // Scripts are operator tools run by hand or by CI; their stdout IS the output.
  {
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  // Test files: allow `any` — mocks need escape hatches to satisfy Drizzle/Next types
  // Allow `_`-prefixed unused vars — conventional "intentionally ignored" pattern in destructuring
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "lib/test-helpers/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
