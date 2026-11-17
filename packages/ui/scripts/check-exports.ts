import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

/**
 * Checks the built package. Every subpath resolves to a built file, and the `./*` wildcard to
 * each component. Every built module that came from a source file opening with "use client"
 * still opens with it. The import graph reaches only the package's own dependencies and peers,
 * never a devDependency a consumer would not have. Every entry loads in Node through `import`
 * and through `require`. The stylesheet sits at the root of `dist`, where its `@source "./"`
 * scans the built components, and every file it reaches by a relative `@import` or `url()`,
 * such as the fonts, is there too. Run after `build`.
 */

interface PackageManifest {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  exports: Record<string, string | { types?: string; default?: string }>
}

const IMPORT_PATTERN =
  /(?:^|[;\s])(?:import|export)\s*(?:[\w*{}\s,$]*?\sfrom\s*)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g

// A relative `@import` or `url()` in a stylesheet. Package imports resolve in the consumer.
const CSS_REFERENCE_PATTERN = /(?:@import\s+|url\(\s*)["']?(\.{1,2}\/[^"')\s]+)/g

const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g
const CLIENT_DIRECTIVE = '"use client"'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST = path.join(PACKAGE_ROOT, "dist")
const SOURCE = path.join(PACKAGE_ROOT, "src")

function getPackageName(specifier: string): string {
  const parts = specifier.split("/")
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier)
}

// Every built JavaScript file a subpath points at, with the wildcard expanded.
function getEntryFiles(subpath: string, target: string): string[] {
  if (!subpath.includes("*")) return [path.join(DIST, target)]

  const [prefix = "", suffix = ""] = target.split("*")
  const directory = path.join(DIST, prefix)
  return readdirSync(directory)
    .filter(name => name.endsWith(suffix) && !name.endsWith(".map"))
    .map(name => path.join(directory, name))
}

// The source file a built module came from, if one exists: `.ts` or `.tsx` at the same path.
function findSourceFile(file: string): string | undefined {
  const base = path.join(SOURCE, path.relative(DIST, file)).replace(/\.js$/, "")
  return [`${base}.tsx`, `${base}.ts`].find(candidate => existsSync(candidate))
}

function findLoadError(files: string[], loader: "import" | "require"): string | undefined {
  const calls = files.map(file =>
    loader === "import"
      ? `await import(${JSON.stringify(pathToFileURL(file).href)})`
      : `require(${JSON.stringify(file)})`,
  )
  const source = [
    'import { createRequire } from "node:module"',
    "const require = createRequire(import.meta.url)",
    ...calls,
  ].join("\n")
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    encoding: "utf8",
  })

  if (result.status === 0) return
  return result.stderr.trim()
}

// The manifest npm receives.
const manifest = JSON.parse(
  readFileSync(path.join(DIST, "package.json"), "utf8"),
) as PackageManifest
const allowed = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
])
const failures: string[] = []
const entries: string[] = []

for (const [subpath, conditions] of Object.entries(manifest.exports)) {
  if (typeof conditions === "string") {
    if (!existsSync(path.join(DIST, conditions))) failures.push(`${subpath}: ${conditions} missing`)
    continue
  }

  if (!conditions.default || !conditions.types) {
    failures.push(`${subpath}: needs a "types" and a "default" condition`)
    continue
  }

  const files = getEntryFiles(subpath, conditions.default)
  if (files.length === 0) failures.push(`${subpath}: matches no built file`)

  for (const file of files) {
    if (!existsSync(file)) failures.push(`${subpath}: ${path.relative(DIST, file)} missing`)
    else entries.push(file)
  }
}

if (manifest.exports["./styles.css"] !== "./styles.css") {
  failures.push('./styles.css: must point at "./styles.css", beside the built components')
}

// Every stylesheet the package ships, followed through its relative imports.
const stylesheets = [path.join(DIST, "styles.css")]
const checkedStylesheets = new Set<string>()

while (stylesheets.length > 0) {
  const stylesheet = stylesheets.pop()
  if (!stylesheet || checkedStylesheets.has(stylesheet) || !existsSync(stylesheet)) continue
  checkedStylesheets.add(stylesheet)

  const css = readFileSync(stylesheet, "utf8").replace(BLOCK_COMMENT_PATTERN, "")
  for (const match of css.matchAll(CSS_REFERENCE_PATTERN)) {
    const reference = match[1]
    if (!reference) continue

    const file = path.resolve(path.dirname(stylesheet), reference)
    if (!existsSync(file)) {
      failures.push(`${path.relative(DIST, stylesheet)}: ${reference} is not in dist`)
    } else if (file.endsWith(".css")) {
      stylesheets.push(file)
    }
  }
}

// Every built module, entries and the internal modules they import.
const visited = new Set<string>()
const queue = [...entries]

while (queue.length > 0) {
  const file = queue.pop()
  if (!file || visited.has(file)) continue
  visited.add(file)

  const built = readFileSync(file, "utf8")
  const sourceFile = findSourceFile(file)

  const isClient = sourceFile && readFileSync(sourceFile, "utf8").startsWith(CLIENT_DIRECTIVE)
  if (isClient && !built.startsWith(CLIENT_DIRECTIVE)) {
    failures.push(`${path.relative(DIST, file)}: lost its "use client" directive`)
  }

  for (const match of built.replace(BLOCK_COMMENT_PATTERN, "").matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2]
    if (!specifier) continue

    if (specifier.startsWith(".")) {
      queue.push(path.resolve(path.dirname(file), specifier))
    } else if (!allowed.has(getPackageName(specifier))) {
      failures.push(`${path.relative(DIST, file)}: imports "${specifier}", not a dependency`)
    }
  }
}

for (const loader of ["import", "require"] as const) {
  const error = findLoadError(entries, loader)
  if (error) failures.push(`the entries do not load through ${loader}\n${error}`)
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`${entries.length} entries and ${visited.size} modules check out`)
