import { defineConfig } from "oxfmt"
import baseConfig from "./packages/config/configs/oxfmt.ts"

export default defineConfig({
  ...baseConfig,
  // `packages/ui` is formatted in Highseat and arrives here through a one-way sync.
  ignorePatterns: ["*.md", "packages/ui/**"],
})
