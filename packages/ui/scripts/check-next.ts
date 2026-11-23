import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process"
import { readdirSync, readFileSync, renameSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Builds the Next.js App Router app in `fixtures/next-app` against the packed package, the
 * tarball npm would receive, with Turbopack and with webpack. Its page is a server component
 * that renders every component without "use client" and one client component, and its
 * stylesheet imports the package's `styles.css` into Tailwind as a consumer's would.
 *
 * Each build then serves the page. The HTML must hold every marker the page renders, and the
 * built CSS must hold the fonts and the classes that appear only inside the built components,
 * which Tailwind finds through the stylesheet's `@source "./"`. Run after `build`.
 */

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST = path.join(PACKAGE_ROOT, "dist")
const FIXTURE = path.join(PACKAGE_ROOT, "fixtures/next-app")
const PORT = "6391"

// Text the page renders, one per group of components.
const MARKERS = [
  "Server render marker",
  "Badge marker",
  "Button marker",
  "Callout marker",
  "1234 visits",
  "Breakdown marker",
  "Row marker",
  "Collapse marker",
  "Empty marker",
  "Error marker",
  "Not found marker",
  "Auth card marker",
  "Danger zone marker",
  "Facts marker",
  "Form section marker",
  "Nav marker",
  "Review queue",
  "Shell marker",
  "Area rail marker",
  'aria-label="Leave settings"',
  "Performance marker",
  "Series marker",
  'id="trend-marker"',
  "Zoned marker",
  'role="switch"',
  'aria-label="Favicon marker"',
  "Paged data table marker",
  "Infinite data table marker",
  "Query table marker",
  "View marker",
  "Showing",
  "End of list",
]

// Classes the fixture never writes, which only the built components use, and the fonts the
// stylesheet imports.
const STYLE_MARKERS = [
  ".bg-fill-subtle",
  ".shadow-card",
  ".text-ink-muted",
  ".page-container",
  "@keyframes area-rail-enter",
  "font-family:Inter Variable",
  "font-family:Geist Mono Variable",
  ".woff2",
]

function run(command: string, args: string[], options: SpawnSyncOptions): string {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", ...options })
  const output = `${result.stdout?.toString() ?? ""}${result.stderr?.toString() ?? ""}`

  if (result.status !== 0) {
    console.error(output)
    process.exit(result.status ?? 1)
  }
  return output
}

/** The HTML of `pathname` from `next start`. */
async function fetchPage(pathname: string): Promise<string> {
  // The server gets its own process group, so killing the group stops Next.js as well as Bun.
  const server = spawn("bun", ["run", "start", "--port", PORT], {
    cwd: FIXTURE,
    detached: true,
    stdio: "ignore",
  })

  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        return await (await fetch(`http://localhost:${PORT}${pathname}`)).text()
      } catch {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    throw new Error("next start never answered")
  } finally {
    if (server.pid) process.kill(-server.pid)
  }
}

/** Every stylesheet the build emitted, joined. */
function readBuiltCss(): string {
  const directory = path.join(FIXTURE, ".next/static")
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter(file => file.endsWith(".css"))
    .map(file => readFileSync(path.join(directory, file), "utf8"))
    .join("\n")
}

const tarball = run("npm", ["pack", "--silent", "--pack-destination", FIXTURE], { cwd: DIST })
renameSync(path.join(FIXTURE, tarball.trim()), path.join(FIXTURE, "ui.tgz"))

// Every pack has the same name and version, so `--force` stops Bun reusing a cached one. The
// lockfile is deleted too, since Bun installs the hash it pins.
rmSync(path.join(FIXTURE, "bun.lock"), { force: true })
run("bun", ["install", "--force"], { cwd: FIXTURE })

const failures: string[] = []

for (const bundler of ["--turbopack", "--webpack"]) {
  // Webpack's cache keys a package by its version, which every pack shares, so a kept cache
  // builds the previous pack.
  rmSync(path.join(FIXTURE, ".next"), { force: true, recursive: true })
  console.log(run("bun", ["run", "build", bundler], { cwd: FIXTURE }))

  const html = await fetchPage("/")
  for (const marker of MARKERS) {
    if (!html.includes(marker)) failures.push(`${bundler}: the page renders no "${marker}"`)
  }

  const css = readBuiltCss()
  for (const marker of STYLE_MARKERS) {
    if (!css.includes(marker)) failures.push(`${bundler}: the CSS has no "${marker}"`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("The fixture builds and renders with Turbopack and with webpack")
