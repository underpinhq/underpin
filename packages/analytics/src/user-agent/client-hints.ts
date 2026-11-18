import type { ParsedUserAgent } from "./names.js"

/**
 * The User-Agent Client Hints a Chromium browser sends, keyed by lowercase header name. Pass the
 * request's `Headers` instead to read them from there. A browser sends `sec-ch-ua`,
 * `sec-ch-ua-mobile` and `sec-ch-ua-platform` by default, and the others only after the site asks
 * for them with `Accept-CH`.
 */
export interface ClientHints {
  "sec-ch-ua"?: string | null
  "sec-ch-ua-full-version-list"?: string | null
  "sec-ch-ua-mobile"?: string | null
  "sec-ch-ua-model"?: string | null
  "sec-ch-ua-platform"?: string | null
  "sec-ch-ua-platform-version"?: string | null
}

type HintName = keyof ClientHints

interface Brand {
  name: string
  version: string
}

/**
 * Brands a Chromium browser lists under its own name, and the names the user agent parser gives
 * them. A brand missing here never replaces the parsed browser, so hints add no new names.
 */
const BRAND_NAMES: Record<string, string> = {
  "Google Chrome": "Chrome",
  "Microsoft Edge": "Edge",
  Brave: "Brave",
  Opera: "Opera",
  "Opera GX": "Opera GX",
  "Samsung Internet": "Samsung Internet",
  Vivaldi: "Vivaldi",
  Yandex: "Yandex",
  YaBrowser: "Yandex",
}

/** The names a plain Chromium user agent parses to, which a brand may make more precise. */
const GENERIC_BROWSERS = new Set(["Chrome", "Mobile Chrome", "Chromium"])

/** The OS names the parser gives, by the platform name the hints use. */
const PLATFORM_NAMES: Record<string, string> = {
  Android: "Android",
  "Chrome OS": "Chrome OS",
  "Chromium OS": "Chrome OS",
  iOS: "iOS",
  Linux: "Linux",
  macOS: "macOS",
  Windows: "Windows",
}

// A browser freezes these parts of a reduced user agent, so they say nothing about the visitor.
const FROZEN_BROWSER_VERSION = /^\d+\.0\.0\.0$/
const FROZEN_ANDROID_MODEL = "K"
const FROZEN_OS_VERSIONS: Record<string, string> = {
  macOS: "10.15.7",
  Android: "10",
  Windows: "10",
}

function readHint(hints: ClientHints | Headers, name: HintName): string {
  const value = hints instanceof Headers ? hints.get(name) : hints[name]
  return value?.trim() ?? ""
}

/** Reads a structured-header string such as `"Windows"` without its quotes. */
function unquote(value: string): string {
  return value.replace(/^"(.*)"$/, "$1")
}

/** Reads a brand list such as `"Chromium";v="141", "Not?A_Brand";v="8"`. */
function parseBrands(value: string): Brand[] {
  const brands: Brand[] = []

  for (const [, name = "", version = ""] of value.matchAll(/"([^"]*)"\s*;\s*v\s*=\s*"([^"]*)"/g)) {
    // Browsers add a made-up brand ("Not?A_Brand") so that sites cannot match the list exactly.
    if (!/not.?a.?brand/i.test(name)) brands.push({ name, version })
  }

  return brands
}

/** The brand that names the browser: the first one other than Chromium itself. */
function findBrand(hints: ClientHints | Headers): Brand | undefined {
  const fullVersions = parseBrands(readHint(hints, "sec-ch-ua-full-version-list"))
  const brands = fullVersions.length ? fullVersions : parseBrands(readHint(hints, "sec-ch-ua"))

  return brands.find(brand => brand.name !== "Chromium" && BRAND_NAMES[brand.name])
}

/**
 * Windows reports its release as a platform version: 13 and later is Windows 11, 1 to 12 is
 * Windows 10. Windows 7 to 8.1 report 0, which reads as unknown.
 */
function toWindowsVersion(platformVersion: string): string {
  const major = Number(platformVersion.split(".")[0])
  if (!major) return ""

  return major >= 13 ? "11" : "10"
}

function applyBrowser(parsed: ParsedUserAgent, hints: ClientHints | Headers): ParsedUserAgent {
  const brand = findBrand(hints)
  const name = brand && BRAND_NAMES[brand.name]
  if (!brand || !name) return parsed

  // A Chromium browser such as Brave sends a plain Chrome user agent, so only its brand names it.
  if (GENERIC_BROWSERS.has(parsed.browser) && name !== "Chrome") {
    return { ...parsed, browser: name, browserFamily: name, browserVersion: brand.version }
  }

  // The full version list replaces a frozen "141.0.0.0" with the real one of the same release.
  const sameRelease = brand.version.split(".")[0] === parsed.browserVersion.split(".")[0]
  if (
    sameRelease &&
    brand.version.includes(".") &&
    FROZEN_BROWSER_VERSION.test(parsed.browserVersion)
  ) {
    return { ...parsed, browserVersion: brand.version }
  }

  return parsed
}

function applyPlatform(parsed: ParsedUserAgent, hints: ClientHints | Headers): ParsedUserAgent {
  const platform = PLATFORM_NAMES[unquote(readHint(hints, "sec-ch-ua-platform"))]
  if (!platform) return parsed

  const result = { ...parsed }
  if (!result.os) result.os = platform
  if (result.os !== platform) return result

  const platformVersion = unquote(readHint(hints, "sec-ch-ua-platform-version"))
  const version = platform === "Windows" ? toWindowsVersion(platformVersion) : platformVersion
  const frozen = FROZEN_OS_VERSIONS[platform]

  if (version && (!result.osVersion || result.osVersion === frozen)) {
    result.osVersion = platform === "Android" ? version.replace(/(\.0)+$/, "") : version
  }

  return result
}

function applyDevice(parsed: ParsedUserAgent, hints: ClientHints | Headers): ParsedUserAgent {
  const result = { ...parsed }
  const model = unquote(readHint(hints, "sec-ch-ua-model"))

  if (model && (!result.deviceModel || result.deviceModel === FROZEN_ANDROID_MODEL)) {
    result.deviceModel = model
  }

  if (readHint(hints, "sec-ch-ua-mobile") === "?1" && result.deviceType === "desktop") {
    result.deviceType = "mobile"
  }

  return result
}

/**
 * Fills in what a reduced user agent leaves out, from the request's Client Hints. A hint only
 * replaces a missing or frozen value, so a request without hints parses exactly as before, and
 * every name stays one the parser itself gives.
 */
export function applyClientHints(
  parsed: ParsedUserAgent,
  hints: ClientHints | Headers,
): ParsedUserAgent {
  return applyDevice(applyPlatform(applyBrowser(parsed, hints), hints), hints)
}
