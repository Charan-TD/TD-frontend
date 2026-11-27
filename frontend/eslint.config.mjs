import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Flat config for Next.js 16 (`next lint` was removed in 16; run `npm run lint`).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // The app is a static export (`output: "export"`), where next/image needs
      // extra configuration that is not set up. Plain <img> is intentional.
      "@next/next/no-img-element": "off",

      // New React 19 rules. Existing components predate them, and fixing each
      // one means restructuring working effects, so they are tracked as
      // warnings (technical debt) instead of failing CI. Promote to "error"
      // once the existing warnings are cleared.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node-only test scripts written as CommonJS.
    "tests/**",
  ]),
]);

export default eslintConfig;
