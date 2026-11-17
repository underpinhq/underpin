import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { readOpaqueTokens, THEMES, type Theme } from "../src/lib/color"
import { readDesignTokens } from "../src/lib/design-tokens"

// Writes `src/tokens.ts`, the stylesheet's opaque colours as hex for code that cannot read CSS,
// and `src/tokens.json`, every token for the Figma library. `tokens.test.ts` fails while either
// file lags behind the stylesheet.
const root = join(import.meta.dir, "..")
const css = readFileSync(join(root, "src/styles.css"), "utf8")
const tailwindTheme = readFileSync(Bun.resolveSync("tailwindcss/theme.css", root), "utf8")
const tokens = readOpaqueTokens(css)

function formatTheme(theme: Theme) {
  const entries = Object.entries(tokens[theme]).map(([name, hex]) => `    "${name}": "${hex}",`)
  return [`  ${theme}: {`, ...entries, "  },"]
}

const source = [
  "// Generated from styles.css by `bun run tokens`. Edit the stylesheet, then run it.",
  "",
  "export const TOKENS = {",
  ...THEMES.flatMap(formatTheme),
  "} as const",
  "",
].join("\n")

writeFileSync(join(root, "src/tokens.ts"), source)
writeFileSync(
  join(root, "src/tokens.json"),
  `${JSON.stringify(readDesignTokens(css, tailwindTheme), null, 2)}\n`,
)
