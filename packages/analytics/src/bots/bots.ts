import { isbot } from "isbot"

/**
 * Why a user agent reads as automated traffic:
 * - `missing`: no user agent at all. Every browser sends one, so a request without one comes
 *   from a script.
 * - `crawler`: a crawler, monitor or HTTP library `isbot` knows.
 * - `spoofed`: a browser version too old for real traffic, which fake clients often claim.
 */
export type BotReason = "missing" | "crawler" | "spoofed"

// Conservative 2020-era floors, well below any browser a real long-tail visitor still runs, so
// they never cut genuine traffic.
const MIN_VERSIONS = {
  chrome: 80,
  firefox: 80,
  safari: 13,
  ios: 13,
  android: 7,
} as const

type BrowserFamily = keyof typeof MIN_VERSIONS

// Chromium derivatives (Edge, Opera, Samsung Internet, Yandex) number their releases on their
// own, so only the `Chrome/` token itself is read as Chrome. Each pattern captures a major version.
const VERSION_PATTERNS: [family: BrowserFamily, pattern: RegExp][] = [
  ["chrome", /Chrome\/(\d+)/],
  ["firefox", /Firefox\/(\d+)/],
  ["safari", /Version\/(\d+)[\d.]* Safari/],
  ["ios", /(?:iPhone |CPU )OS (\d+)_/],
  ["android", /Android (\d+)/],
]

// The default user agent of a backend HTTP client: Node's `fetch` (`node`, or `undici` in older
// releases), Bun, Deno and the common libraries of other languages.
const BACKEND_CLIENT =
  /^(?:node|undici|node-fetch|axios|got|ky|bun|deno|python-requests|python-httpx|python-urllib|aiohttp|go-http-client|curl|wget|okhttp|java|apache-httpclient|ruby|faraday|guzzlehttp|reqwest)(?:[/\s]|$)/i

/**
 * Checks if a user agent claims a browser or OS release too old for real traffic. An unreadable
 * version never counts, so a user agent this cannot parse is not treated as a bot.
 * @param userAgent - The `User-Agent` header.
 * @returns True if any browser or OS version in it is below its floor.
 */
export function isAncientBrowser(userAgent: string): boolean {
  return VERSION_PATTERNS.some(([family, pattern]) => {
    const version = Number(userAgent.match(pattern)?.[1])
    return version < MIN_VERSIONS[family]
  })
}

/**
 * Checks if a user agent is the default one of a backend HTTP client, such as `node`, `curl` or
 * `python-requests`, that `isbot` also flags. A client `isbot` lets through, such as Flutter's
 * `Dart/3.1 (dart:io)` in a mobile app, never counts.
 * @param userAgent - The `User-Agent` header.
 * @returns True if a server-side script most likely sent the request.
 */
export function isBackendClient(userAgent: string): boolean {
  return BACKEND_CLIENT.test(userAgent) && isbot(userAgent)
}

/**
 * Reads whether a user agent is automated traffic, and why. Only the user agent is judged:
 * signals such as a datacenter IP or a spam referrer belong to the caller.
 * @param userAgent - The `User-Agent` header.
 * @returns The reason, or null when the user agent looks like a person's browser.
 * @example
 * detectBot("Googlebot/2.1 (+http://www.google.com/bot.html)") // "crawler"
 * detectBot(request.headers.get("user-agent")) // null for a current browser
 */
export function detectBot(userAgent: string | null | undefined): BotReason | null {
  if (!userAgent) return "missing"
  if (isbot(userAgent)) return "crawler"
  if (isAncientBrowser(userAgent)) return "spoofed"

  return null
}

/**
 * Checks if a user agent is automated traffic, for any reason {@link detectBot} gives.
 * @param userAgent - The `User-Agent` header.
 * @returns True for a missing, crawler or spoofed user agent.
 */
export function isBot(userAgent: string | null | undefined): boolean {
  return detectBot(userAgent) !== null
}
