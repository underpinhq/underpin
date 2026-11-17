import { UAParser } from "ua-parser-js"
import { applyClientHints, type ClientHints } from "./client-hints.js"
import { extensions } from "./extensions.js"
import { toStoredNames, type ParsedUserAgent } from "./names.js"

export type { ClientHints } from "./client-hints.js"
export type { ParsedUserAgent } from "./names.js"

const EMPTY: ParsedUserAgent = {
  browser: "",
  browserFamily: "",
  browserVersion: "",
  os: "",
  osVersion: "",
  deviceType: "",
  deviceVendor: "",
  deviceModel: "",
}

/**
 * Reads the browser, OS and device a user agent names. The names match what `ua-parser-js` 2.x
 * returns, which is what Highseat and Wend store, so a product can switch to this function and
 * keep its stored data. Every field is an empty string when the user agent does not name it.
 *
 * `browser` keeps the parser's mobile prefix ("Mobile Safari"). `browserFamily` drops it
 * ("Safari"), so the two spellings of one browser group together.
 *
 * `deviceType` is "desktop" for a user agent that names no device, since the parser gives desktop
 * browsers no type. An empty user agent describes no device at all.
 *
 * @param userAgent - The `User-Agent` header.
 * @param hints - The request's `Sec-CH-UA*` headers, when the browser sent them. They fill in what a
 * reduced user agent leaves out, such as the Windows version or the model of an Android phone.
 * @returns The names, ready to store.
 * @example
 * parseUserAgent(request.headers.get("user-agent"), request.headers)
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
  hints?: ClientHints | Headers,
): ParsedUserAgent {
  // The parser reads `navigator.userAgent` when handed nothing, which a DOM test environment has.
  if (!userAgent) return { ...EMPTY }

  const parsed = toStoredNames(new UAParser(userAgent, extensions).getResult())

  return hints ? applyClientHints(parsed, hints) : parsed
}
