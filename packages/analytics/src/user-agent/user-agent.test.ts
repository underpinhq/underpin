import { describe, expect, test } from "bun:test"
import parserManifest from "ua-parser-js/package.json" with { type: "json" }
import corpus from "./fixtures/highseat-corpus.json" with { type: "json" }
import { parseUserAgent } from "./user-agent.js"

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36"
const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"

describe("ua-parser-js", () => {
  // 2.x is AGPL-licensed. Its 1.x line is the last MIT one.
  test("resolves to the MIT-licensed 1.x line", () => {
    expect(parserManifest.license).toBe("MIT")
    expect(parserManifest.version).toStartWith("1.")
  })
})

describe("parseUserAgent", () => {
  test.each(corpus)("returns the names Highseat stores for $userAgent", entry => {
    const parsed = parseUserAgent(entry.userAgent)

    expect({ browser: parsed.browser, os: parsed.os, deviceType: parsed.deviceType }).toEqual({
      browser: entry.browser,
      os: entry.os,
      deviceType: entry.deviceType,
    })
  })

  test("covers every device type Highseat stores", () => {
    expect(new Set(corpus.map(entry => entry.deviceType))).toEqual(
      new Set(["desktop", "mobile", "tablet", ""]),
    )
  })

  test("reads a current browser on each platform", () => {
    expect(parseUserAgent(CHROME_MAC)).toEqual({
      browser: "Chrome",
      browserFamily: "Chrome",
      browserVersion: "141.0.0.0",
      os: "macOS",
      osVersion: "10.15.7",
      deviceType: "desktop",
      deviceVendor: "Apple",
      deviceModel: "Macintosh",
    })

    expect(parseUserAgent(SAFARI_IPHONE)).toMatchObject({
      browser: "Mobile Safari",
      browserFamily: "Safari",
      os: "iOS",
      osVersion: "18.6",
      deviceType: "mobile",
      deviceModel: "iPhone",
    })
  })

  test("keeps the mobile prefix in browser and drops it in browserFamily", () => {
    expect(parseUserAgent(CHROME_ANDROID)).toMatchObject({
      browser: "Mobile Chrome",
      browserFamily: "Chrome",
      deviceType: "mobile",
    })

    const firefox = parseUserAgent(
      "Mozilla/5.0 (Android 15; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0",
    )
    expect(firefox).toMatchObject({ browser: "Mobile Firefox", browserFamily: "Firefox" })

    const chromeIos = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1",
    )
    expect(chromeIos).toMatchObject({ browser: "Mobile Chrome", os: "iOS" })
  })

  test.each([
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      osVersion: "26.0",
    },
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1",
      osVersion: "26.2",
    },
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1 Ddg/18.7",
      osVersion: "26.0",
    },
    {
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
      osVersion: "26.1",
    },
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 YaBrowser/26.4.3.680.10 YaApp_iOS/2604.3 YaApp_iOS_Browser/2604.3 YazekaApp/2604.3 Safari/604.1 SA/3 SAPublic/0 Version/26.5",
      osVersion: "18.7",
    },
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
      osVersion: "18.5",
    },
    {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1",
      osVersion: "18.7",
    },
  ])("reads iOS $osVersion for $userAgent", ({ userAgent, osVersion }) => {
    expect(parseUserAgent(userAgent)).toMatchObject({ os: "iOS", osVersion })
  })

  test("names Chrome OS as Highseat stores it", () => {
    const parsed = parseUserAgent(
      "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    )

    expect(parsed.os).toBe("Chrome OS")
  })

  test("returns empty names for an empty user agent", () => {
    for (const userAgent of ["", null, undefined]) {
      expect(parseUserAgent(userAgent)).toEqual({
        browser: "",
        browserFamily: "",
        browserVersion: "",
        os: "",
        osVersion: "",
        deviceType: "",
        deviceVendor: "",
        deviceModel: "",
      })
    }
  })

  test("calls an unrecognised user agent a desktop", () => {
    expect(parseUserAgent("SomeClient/1.0").deviceType).toBe("desktop")
  })
})

describe("parseUserAgent with Client Hints", () => {
  test("changes nothing when the hints add nothing", () => {
    expect(parseUserAgent(CHROME_WINDOWS, {})).toEqual(parseUserAgent(CHROME_WINDOWS))
  })

  test("reads Windows 11 and the full browser version", () => {
    const parsed = parseUserAgent(CHROME_WINDOWS, {
      "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      "sec-ch-ua-full-version-list":
        '"Google Chrome";v="141.0.7390.108", "Not?A_Brand";v="8.0.0.0", "Chromium";v="141.0.7390.108"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-platform-version": '"19.0.0"',
    })

    expect(parsed).toMatchObject({
      browser: "Chrome",
      browserVersion: "141.0.7390.108",
      os: "Windows",
      osVersion: "11",
    })
  })

  test("keeps Windows 10 for a platform version below 13", () => {
    const parsed = parseUserAgent(CHROME_WINDOWS, {
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-platform-version": '"10.0.0"',
    })

    expect(parsed.osVersion).toBe("10")
  })

  test("names a Chromium browser that sends a plain Chrome user agent", () => {
    const parsed = parseUserAgent(CHROME_MAC, {
      "sec-ch-ua": '"Brave";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      "sec-ch-ua-platform": '"macOS"',
    })

    expect(parsed).toMatchObject({
      browser: "Brave",
      browserFamily: "Brave",
      browserVersion: "141",
    })
  })

  test("replaces the frozen macOS version", () => {
    const parsed = parseUserAgent(CHROME_MAC, {
      "sec-ch-ua-platform": '"macOS"',
      "sec-ch-ua-platform-version": '"15.6.1"',
    })

    expect(parsed).toMatchObject({ os: "macOS", osVersion: "15.6.1" })
  })

  test("reads the Android version and model a reduced user agent hides", () => {
    const parsed = parseUserAgent(CHROME_ANDROID, {
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-model": '"Pixel 9"',
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-platform-version": '"16.0.0"',
    })

    expect(parsed).toMatchObject({
      browser: "Mobile Chrome",
      os: "Android",
      osVersion: "16",
      deviceType: "mobile",
      deviceModel: "Pixel 9",
    })
  })

  test("ignores a brand it has no stored name for", () => {
    const parsed = parseUserAgent(CHROME_WINDOWS, {
      "sec-ch-ua": '"Some New Browser";v="3", "Chromium";v="141"',
    })

    expect(parsed.browser).toBe("Chrome")
  })

  test("reads the hints from a Headers object", () => {
    const headers = new Headers({
      "Sec-CH-UA": '"Microsoft Edge";v="141", "Chromium";v="141"',
      "Sec-CH-UA-Platform": '"Windows"',
      "Sec-CH-UA-Platform-Version": '"15.0.0"',
    })

    const edge = `${CHROME_WINDOWS} Edg/141.0.0.0`
    expect(parseUserAgent(edge, headers)).toMatchObject({ browser: "Edge", osVersion: "11" })
  })
})
