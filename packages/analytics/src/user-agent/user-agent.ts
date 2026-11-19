import { UAParser } from "ua-parser-js"
import { applyClientHints, type ClientHints } from "./client-hints.js"
import { extensions } from "./extensions.js"
import {
  fromParserResult,
  toStoredNames,
  type ParsedUserAgent,
  type UserAgentParserResult,
} from "./names.js"

export type { ClientHints } from "./client-hints.js"
export type { ParsedUserAgent, UserAgentParserResult } from "./names.js"

/**
 * A user agent parser class such as `UAParser` from `ua-parser-js` 2.x or PRO. The app installs it
 * under its own license and passes the class in: this package never imports it.
 */
export type UserAgentParser = new (userAgent: string) => {
  getResult(): UserAgentParserResult
}

export interface ParseUserAgentOptions {
  /**
   * The app's own parser. Its names are returned as it gives them, without the 1.x patterns and
   * renames. Without one, the bundled `ua-parser-js` 1.x parses and its names are mapped to 2.x's.
   */
  parser?: UserAgentParser
}

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
 * @param options - `parser` takes the app's own `ua-parser-js` 2.x or PRO class.
 * @returns The names, ready to store.
 * @example
 * parseUserAgent(request.headers.get("user-agent"), request.headers)
 * @example
 * import { UAParser } from "ua-parser-js" // 2.x or PRO, under the app's own license
 * parseUserAgent(request.headers.get("user-agent"), request.headers, { parser: UAParser })
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
  hints?: ClientHints | Headers,
  options?: ParseUserAgentOptions,
): ParsedUserAgent {
  // The parser reads `navigator.userAgent` when handed nothing, which a DOM test environment has.
  if (!userAgent) return { ...EMPTY }

  const Parser = options?.parser
  const parsed = Parser
    ? fromParserResult(new Parser(userAgent).getResult())
    : toStoredNames(new UAParser(userAgent, extensions).getResult())

  return hints ? applyClientHints(parsed, hints) : parsed
}
