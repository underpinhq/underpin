import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { DesignTokens } from "../src/lib/design-tokens"

// Prints a script for the Figma MCP `use_figma` tool: the tokens from `src/tokens.json`, then
// `figma-sync.js`, which applies them to the Dirstack UI library. A token's description repeats
// across its group, so each one is sent once and referenced by index.
const root = join(import.meta.dir, "..")
const tokens = JSON.parse(readFileSync(join(root, "src/tokens.json"), "utf8")) as DesignTokens
const descriptions: string[] = []

function indexDescription<Token extends { description?: string }>(token: Token) {
  if (!token.description) return token
  if (!descriptions.includes(token.description)) descriptions.push(token.description)
  return { ...token, description: descriptions.indexOf(token.description) }
}

const payload = {
  ...tokens,
  colors: tokens.colors.map(indexDescription),
  shadows: tokens.shadows.map(indexDescription),
}

// The same FNV-1a hash `figma-sync.js` checks before it changes anything.
function hash(text: string) {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value.toString(16)
}

const script = [
  `const TOKENS = ${JSON.stringify(payload)}`,
  `const DESCRIPTIONS = ${JSON.stringify(descriptions)}`,
  `const CHECKSUM = "${hash(JSON.stringify([payload, descriptions]))}"`,
  readFileSync(join(import.meta.dir, "figma-sync.js"), "utf8").replace(
    /^\/\* global [^*]+\*\/\n/,
    "",
  ),
].join("\n")

console.log(script)
