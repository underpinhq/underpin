import { defineConfig } from "tsdown"

export default defineConfig({
  // One entry per subpath export. The `./*` export in package.json maps
  // `@underpin/analytics/<name>` to `dist/<name>/<name>.js`, so a new feature adds its folder
  // and its entry here, and package.json stays as it is.
  entry: [
    "src/user-agent/user-agent.ts",
    "src/bots/bots.ts",
    "src/client-ip/client-ip.ts",
    "src/geo/geo.ts",
    "src/favicon/favicon.ts",
    "src/referrer/referrer.ts",
    "src/referrer-dataset/referrer-dataset.ts",
    // The `underpin-referers` bin in package.json.
    "src/referrer-dataset/cli.ts",
  ],
  format: "esm",
  platform: "node",
  // Emit `.js` beside `.d.ts`, as the `./*` export expects. The package is ESM-only.
  fixedExtension: false,
  // One output file per source module, so `dist/geo/geo.js` sits beside `geo.d.ts`.
  unbundle: true,
  // Keep readable names in stack traces; the consumer's bundler minifies.
  minify: false,
  // `src/` ships with the package, so maps point at it instead of embedding the source again.
  sourcemap: true,
  outputOptions: { sourcemapExcludeSources: true },
  dts: { sourcemap: true },
  publint: { level: "error", strict: true },
  attw: { level: "error", profile: "esm-only" },
})
