import { describe, expect, test } from "bun:test"
import { detectBot, isAncientBrowser, isBackendClient, isBot } from "./bots.js"

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"

describe("detectBot", () => {
  test("returns null for a current browser", () => {
    expect(detectBot(CHROME)).toBeNull()
    expect(detectBot(SAFARI_IPHONE)).toBeNull()
  })

  test("flags a missing user agent", () => {
    expect(detectBot("")).toBe("missing")
    expect(detectBot(null)).toBe("missing")
    expect(detectBot(undefined)).toBe("missing")
  })

  test("flags a crawler", () => {
    expect(
      detectBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    ).toBe("crawler")
    expect(detectBot("curl/8.7.1")).toBe("crawler")
  })

  test("finds a crawler token anywhere in a long header", () => {
    const padded = `${CHROME} ${"x".repeat(600)} Googlebot/2.1`
    expect(padded.indexOf("Googlebot")).toBeGreaterThan(512)
    expect(detectBot(padded)).toBe("crawler")
    expect(detectBot(`${CHROME} ${"x".repeat(100_000)}`)).toBeNull()
  })

  test("flags a browser too old for real traffic", () => {
    const chrome49 =
      "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36"

    expect(detectBot(chrome49)).toBe("spoofed")
  })
})

describe("isBot", () => {
  test("is true for every reason", () => {
    expect(isBot("")).toBe(true)
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true)
    expect(isBot(CHROME)).toBe(false)
  })
})

describe("isAncientBrowser", () => {
  test.each([
    [
      "Chrome 79",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0 Safari/537.36",
    ],
    ["Firefox 60", "Mozilla/5.0 (Windows NT 10.0; rv:60.0) Gecko/20100101 Firefox/60.0"],
    [
      "Safari 12",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15",
    ],
    [
      "iOS 12",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    ],
    [
      "Android 6",
      "Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    ],
  ])("flags %s", (_, userAgent) => {
    expect(isAncientBrowser(userAgent)).toBe(true)
  })

  test("ignores a Chromium derivative's own version", () => {
    const edge = `${CHROME} Edg/18.0`

    expect(isAncientBrowser(edge)).toBe(false)
  })

  test("never flags a user agent it cannot read", () => {
    expect(isAncientBrowser("SomeClient/1.0")).toBe(false)
  })
})

describe("isBackendClient", () => {
  test.each([
    "node",
    "undici",
    "Bun/1.2.0",
    "curl/8.7.1",
    "python-requests/2.32.3",
    "Go-http-client/2.0",
  ])("flags %s", userAgent => {
    expect(isBackendClient(userAgent)).toBe(true)
  })

  test("never flags a client isbot lets through", () => {
    expect(isBackendClient("Dart/3.1 (dart:io)")).toBe(false)
    expect(isBackendClient(CHROME)).toBe(false)
  })
})
