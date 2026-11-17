import baseConfig from "@dirstack/kodeks/oxfmt"
import { defineConfig } from "oxfmt"

export default defineConfig({
  ...baseConfig,
  // `packages/ui` is formatted in Highseat and arrives here through a one-way sync.
  ignorePatterns: ["*.md", "packages/ui/**"],
})
