import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { readOpaqueTokens } from "./lib/color"
import { readDesignTokens } from "./lib/design-tokens"
import { TOKENS } from "./tokens"
import DESIGN_TOKENS from "./tokens.json"

const CSS = readFileSync(join(import.meta.dir, "styles.css"), "utf8")

test("tokens.ts matches styles.css; run `bun run tokens` in packages/ui when it does not", () => {
  expect(readOpaqueTokens(CSS)).toEqual(TOKENS)
})

test("tokens.json matches styles.css; run `bun run tokens` in packages/ui when it does not", () => {
  const tailwindTheme = readFileSync(
    Bun.resolveSync("tailwindcss/theme.css", import.meta.dir),
    "utf8",
  )
  expect(readDesignTokens(CSS, tailwindTheme)).toEqual(DESIGN_TOKENS)
})
