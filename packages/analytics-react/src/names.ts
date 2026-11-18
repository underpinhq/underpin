/**
 * The logo for each browser name `parseUserAgent` from `@underpin/analytics/user-agent` returns,
 * keyed by the lowercase name: the parser keeps the case a user agent writes, so "chrome" and
 * "Chrome" both occur. A name missing here gets the generic browser glyph.
 */
const BROWSER_LOGOS: Record<string, string> = {
  brave: "brave",
  chrome: "chrome",
  "mobile chrome": "chrome",
  "chrome headless": "chrome",
  "chrome webview": "chrome",
  chromium: "chromium",
  safari: "safari",
  "mobile safari": "safari-ios",
  mobilesafari: "safari-ios",
  firefox: "firefox",
  "mobile firefox": "firefox",
  "firefox focus": "firefox",
  edge: "edge",
  opera: "opera",
  "opera mini": "opera",
  "opera mobi": "opera",
  "opera tablet": "opera",
  "opera touch": "opera",
  "opera coast": "opera",
  "opera gx": "opera-gx",
  "samsung internet": "samsung-internet",
  vivaldi: "vivaldi",
  yandex: "yandex",
  ucbrowser: "uc",
}

/**
 * Names other tools store for the same browsers, such as rows imported from Plausible. They are
 * not parser names, so they sit apart from {@link BROWSER_LOGOS}.
 */
const IMPORTED_BROWSER_NAMES: Record<string, string> = {
  "chrome mobile": "chrome",
  "firefox mobile": "firefox",
  "microsoft edge": "edge",
  "samsung browser": "samsung-internet",
  "yandex browser": "yandex",
  "uc browser": "uc",
  // Tor Browser sends a plain Firefox user agent, so only an imported row names it.
  tor: "tor",
}

/**
 * Finds the logo of a browser.
 * @param name - A browser name, as `parseUserAgent` returns it.
 * @returns The logo's key, or undefined for a browser without one.
 */
export function findBrowserLogo(name: string): string | undefined {
  const key = name.trim().toLowerCase()
  return BROWSER_LOGOS[key] ?? IMPORTED_BROWSER_NAMES[key]
}

/** The operating system marks this package draws. */
export type OsMark =
  | "apple"
  | "android"
  | "windows"
  | "linux"
  | "ubuntu"
  | "chrome"
  | "harmonyos"
  | "fedora"
  | "debian"
  | "freebsd"
  | "playstation"

// Checked in order, so a more specific name comes before the family it belongs to.
const OS_PATTERNS: [mark: OsMark, pattern: RegExp][] = [
  ["apple", /^(?:macos|mac os|ios|ipados|watchos|visionos)\b/i],
  ["chrome", /^(?:chrome os|chromium os|chromecast)\b/i],
  ["harmonyos", /^(?:harmonyos|openharmony)\b/i],
  ["android", /^android\b/i],
  ["windows", /^windows\b/i],
  ["ubuntu", /^ubuntu\b/i],
  ["fedora", /^fedora\b/i],
  ["debian", /^debian\b/i],
  ["freebsd", /^freebsd\b/i],
  ["playstation", /^playstation\b/i],
  [
    "linux",
    /^(?:linux|arch|gentoo|mint|suse|slackware|centos|red hat|mageia|manjaro|kubuntu|elementary os|deepin|pop!_os)\b/i,
  ],
]

/**
 * Finds the mark of an operating system.
 * @param name - An OS name, as `parseUserAgent` returns it.
 * @returns The mark, or undefined for an OS without one.
 */
export function findOsMark(name: string): OsMark | undefined {
  return OS_PATTERNS.find(([, pattern]) => pattern.test(name.trim()))?.[0]
}

/**
 * The device types `parseUserAgent` returns. Each has a glyph of its own, except "embedded", which
 * `DeviceIcon` draws with the desktop glyph.
 */
export const DEVICE_TYPES: readonly string[] = [
  "desktop",
  "mobile",
  "tablet",
  "smarttv",
  "console",
  "wearable",
  "xr",
  "embedded",
]
