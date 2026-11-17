import baseConfig from "@underpin/config/oxlint"
import { defineConfig } from "oxlint"

export default defineConfig({
  extends: [baseConfig],
  // `packages/ui` is developed and linted in Highseat and arrives here through a one-way
  // sync, so a finding in it could only be fixed there.
  ignorePatterns: ["packages/ui/**", "**/dist/**"],
  rules: {
    // Published declarations come from tsc or tsdown, which keep a `~/*` alias as written,
    // so packages import relatively.
    "no-restricted-imports": "off",
  },
})
