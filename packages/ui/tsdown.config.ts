import { defineConfig } from "tsdown"
import type { UserConfig } from "tsdown"

const config: UserConfig = defineConfig({
  entry: ["src/components/*.tsx", "src/lib/*.{ts,tsx}", "src/tokens.ts", "!src/**/*.test.{ts,tsx}"],
  format: "esm",
  platform: "neutral",
  dts: true,
  // One built file per source module, at the same path under `dist`. Each component keeps the
  // "use client" it opens with, and a shared chunk would move a client component into a file
  // without one. The `./*` export maps a subpath to `components/<name>.js` by that path.
  unbundle: true,
  hash: false,
  sourcemap: true,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  // `@source "./"` in the stylesheet scans the folder it sits in, so it goes to the root of
  // `dist`, beside the built components whose classes a consumer's Tailwind must generate. The
  // files it imports keep their paths beside it: `fonts.css` and the Inter files it points at.
  copy: [
    { from: "src/styles.css", to: "dist" },
    { from: "src/fonts.css", to: "dist" },
    { from: "src/fonts", to: "dist" },
  ],
  // Rolldown warns that a module's "use client" may be lost in bundling. Each module is its own
  // file, so it is kept, and `check-exports` fails the build of a client module that lost it.
  checks: { moduleLevelDirective: false },
})

export default config
