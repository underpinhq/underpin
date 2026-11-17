import { defineConfig } from "oxlint"
import baseConfig from "./packages/config/configs/oxlint-base.ts"

export default defineConfig({
  extends: [baseConfig],
  // `packages/ui` is developed and linted in Highseat and arrives here through a one-way
  // sync, so a finding in it could only be fixed there. The config sources are the config
  // package's deliverables: they export defaults, which the shared rules forbid in app code.
  ignorePatterns: ["packages/ui/**", "packages/config/configs/**", "**/dist/**"],
  rules: {
    // Published declarations come from tsc or tsdown, which keep a `~/*` alias as written,
    // so packages import relatively.
    "no-restricted-imports": "off",
  },
})
