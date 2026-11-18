import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  // One output file per source module, so every flag and logo stays a module of its own that the
  // consumer's bundler splits into its own chunk.
  unbundle: true,
  // Emit `.js` and `.d.ts`, as the exports expect. The package is ESM-only.
  fixedExtension: false,
  // Keep readable names in stack traces; the consumer's bundler minifies.
  minify: false,
  // Only `dist` ships, and the generated image modules would make every map as large as its image.
  sourcemap: false,
  publint: { level: "error", strict: true },
  attw: { level: "error", profile: "esm-only" },
})
