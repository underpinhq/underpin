import { describe, expect, test } from "bun:test"
import { parseUserAgent } from "@underpin/analytics/user-agent"
import corpus from "../../analytics/src/user-agent/fixtures/highseat-corpus.json" with { type: "json" }
import names from "./fixtures/parser-names.json" with { type: "json" }
import { LOGO_LOADERS } from "./generated/browsers.js"
import { DEVICE_TYPES, findBrowserLogo, findOsMark } from "./names.js"

// The names the parser returns now, over the corpus, with the names it returned over a larger set
// of public user agents.
const parsed = corpus.map(entry => parseUserAgent(entry.userAgent))

function collect(listed: string[], found: string[]): Set<string> {
  return new Set([...listed, ...found].filter(Boolean))
}

const browsers = collect(
  names.browser,
  parsed.map(result => result.browser),
)
const systems = collect(
  names.os,
  parsed.map(result => result.os),
)
const deviceTypes = collect(
  names.deviceType,
  parsed.map(result => result.deviceType),
)

// A name without a logo gets the generic glyph. The snapshots below list every such name, so a
// new parser name or a dropped logo shows up in review as a deliberate fallback.
function withoutIcon(values: Set<string>, find: (name: string) => string | undefined) {
  return [...values].filter(name => !find(name)).sort((a, b) => a.localeCompare(b))
}

describe("browser logos", () => {
  test("every mapped logo exists", () => {
    for (const name of browsers) {
      const logo = findBrowserLogo(name)
      if (logo) expect(LOGO_LOADERS[logo]).toBeDefined()
    }
  })

  test("every name the parser returns has a logo or falls back on purpose", () => {
    // The most common browsers, which must never fall back.
    for (const name of [
      "Chrome",
      "Mobile Chrome",
      "Safari",
      "Mobile Safari",
      "Firefox",
      "Mobile Firefox",
      "Edge",
      "Opera",
      "Samsung Internet",
      "Brave",
      "Yandex",
    ]) {
      expect(findBrowserLogo(name)).toBeDefined()
    }

    expect(withoutIcon(browsers, findBrowserLogo)).toMatchSnapshot()
  })

  test("ignores case, as the parser keeps a user agent's own", () => {
    expect(findBrowserLogo("chrome")).toBe("chrome")
    expect(findBrowserLogo("OPERA")).toBe("opera")
  })

  test("covers the names other tools store", () => {
    expect(findBrowserLogo("Microsoft Edge")).toBe("edge")
    expect(findBrowserLogo("Tor")).toBe("tor")
  })
})

describe("OS marks", () => {
  test("cover the systems most visits come from", () => {
    expect(findOsMark("macOS")).toBe("apple")
    expect(findOsMark("iOS")).toBe("apple")
    expect(findOsMark("Android")).toBe("android")
    expect(findOsMark("Windows")).toBe("windows")
    expect(findOsMark("Windows Phone")).toBe("windows")
    expect(findOsMark("Linux")).toBe("linux")
    expect(findOsMark("Ubuntu")).toBe("ubuntu")
    expect(findOsMark("Chrome OS")).toBe("chrome")
    expect(findOsMark("HarmonyOS")).toBe("harmonyos")
  })

  test("every name the parser returns has a mark or falls back on purpose", () => {
    expect(withoutIcon(systems, findOsMark)).toMatchSnapshot()
  })
})

describe("device types", () => {
  test("cover every type the parser returns", () => {
    for (const type of deviceTypes) {
      expect(DEVICE_TYPES).toContain(type)
    }
  })
})
