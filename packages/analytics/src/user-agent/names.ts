import { ucFirst } from "@underpin/utils/string"
import type { IResult } from "ua-parser-js"

/** The names a user agent gives, as Highseat and Wend store them. */
export interface ParsedUserAgent {
  /** "Chrome", "Mobile Safari". */
  browser: string
  /** The browser without the mobile prefix: "Safari" for both "Safari" and "Mobile Safari". */
  browserFamily: string
  browserVersion: string
  /** "macOS", "Windows", "iOS". */
  os: string
  osVersion: string
  /** "desktop", "mobile", "tablet", "smarttv", "console", "wearable", "xr" or "embedded". */
  deviceType: string
  /** "Apple", "Samsung". */
  deviceVendor: string
  /** "iPhone", "SM-S918B". */
  deviceModel: string
}

const MOBILE_PREFIX = "Mobile "

/**
 * The browsers 2.x names with a mobile prefix, and the token of the mobile build it reads.
 * 1.x names some of them without the prefix.
 */
const MOBILE_BUILDS: Record<string, RegExp> = {
  chrome: /\bchrome\/[\w.]+ mobile\b|\b(?:crios|crmo)\//i,
  firefox: /\b(?:mobile|tablet);[^)]*\brv:[\w.]+[^)]*\).*\bfirefox\/|\bfxios\//i,
  safari: /\bmobile\/\w+ safari\/|\bversion\/[\w.]+ mobile safari\//i,
}

/** 1.x OS names that 2.x spells differently. */
const OS_NAMES: Record<string, string> = {
  "Mac OS": "macOS",
  "Chromium OS": "Chrome OS",
  "Windows Phone OS": "Windows Phone",
  WEBOS: "webOS",
  WebOS: "webOS",
}

/** Windows editions 1.x reports as a version of Windows, and 2.x as an OS of their own. */
const WINDOWS_EDITIONS: Record<string, string> = {
  CE: "Windows CE",
  RT: "Windows RT",
}

function toBrowser(name: string, userAgent: string): string {
  // 2.x reads an iPad app's web view as desktop Safari unless it carries Safari's own version.
  const isIpadWebView = /\bipad\b/i.test(userAgent) && !/\bversion\//i.test(userAgent)
  if (/^(?:mobile )?safari$/i.test(name) && isIpadWebView) return "Safari"

  const mobileBuild = MOBILE_BUILDS[name.toLowerCase()]
  if (!mobileBuild?.test(userAgent)) return name

  return `${MOBILE_PREFIX}${ucFirst(name)}`
}

function toOs(name: string, version: string, userAgent: string): [name: string, version: string] {
  const edition = name === "Windows" ? WINDOWS_EDITIONS[version] : undefined
  if (edition) return [edition, ""]

  // An Android phone running HarmonyOS reports the Android version, which is not HarmonyOS's own.
  if (name === "HarmonyOS" && !/\bharmonyos[ /;]*\d/i.test(userAgent)) return [name, ""]

  // Safari 26 and later keeps the OS token at 18.x and sends its own release as "Version/26.x",
  // which is the iOS release it ships with. Safari writes it right after "(KHTML, like Gecko)" and
  // ends with a "Safari/" token. An app that writes its own "Version/" elsewhere, or without
  // "Safari/", keeps the OS token.
  if (name === "iOS" && /^18(?:\.|$)/.test(version)) {
    const release = /\(KHTML, like Gecko\) Version\/(\d+(?:\.\d+)*) .*\bSafari\//.exec(
      userAgent,
    )?.[1]
    if (release && Number.parseInt(release, 10) >= 26) return [name, release]
  }

  return [OS_NAMES[name] ?? name, version]
}

function toDeviceType(result: IResult): string {
  // 1.x types Xiaomi's Pad tablets as phones.
  if (/^(?:xiaomi|redmi) pad\b/i.test(result.device.model ?? "")) return "tablet"

  return result.device.type ?? "desktop"
}

/** Turns a 1.x result into the names 2.x gives for the same user agent. */
export function toStoredNames(result: IResult): ParsedUserAgent {
  const browser = toBrowser(result.browser.name ?? "", result.ua)
  const [os, osVersion] = toOs(result.os.name ?? "", result.os.version ?? "", result.ua)

  return {
    browser,
    browserFamily: browser.startsWith(MOBILE_PREFIX)
      ? browser.slice(MOBILE_PREFIX.length)
      : browser,
    browserVersion: result.browser.version ?? "",
    os,
    osVersion,
    deviceType: toDeviceType(result),
    deviceVendor: result.device.vendor ?? "",
    deviceModel: result.device.model ?? "",
  }
}
