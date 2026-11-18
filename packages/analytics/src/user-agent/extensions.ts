/** A field a capture group fills, or a field set to a fixed value. */
type Property = string | [field: string, value: string]

/** Pattern lists alternating with the properties they set, per result section. */
type Extensions = Record<string, (RegExp[] | Property[])[]>

const NAME = "name"
const VERSION = "version"

/**
 * Patterns `ua-parser-js` 1.x checks before its own, for the names 2.x reads and 1.x misses.
 * Each entry pairs a list of patterns with the fields their capture groups fill, in the 1.x
 * extension format.
 */
export const extensions: Extensions = {
  browser: [
    [/\(ecosia (?:android|ios)@([\w.]+)/i],
    [VERSION, [NAME, "Ecosia"]],
    [/\bnorton\/([\w.]+)/i],
    [VERSION, [NAME, "Norton Private Browser"]],
    [/\bavira\/([\w.]+)/i],
    [VERSION, [NAME, "Avira Secure Browser"]],
    // Brave's old builds put their name before the Chrome token.
    [/\bbrave chrome\/([\w.]+)/i],
    [VERSION, [NAME, "Brave"]],
    [/\bdooble\/([\w.]+)/i],
    [VERSION, [NAME, "Dooble"]],
    // Huawei Browser for Windows.
    [/\bhbpc\/([\w.]+)/i],
    [VERSION, [NAME, "Huawei Browser"]],
  ],
  os: [
    // Apps that write "iPhone OS 7.0.2" with dots and no "CPU" before it.
    [/\biphone os ([\d.]+)(?=[;,)])/i],
    [VERSION, [NAME, "iOS"]],
    [/\bwatchos[ /]([\d.]+)/i],
    [VERSION, [NAME, "watchOS"]],
    // Old Windows spelled out by name rather than as an NT version.
    [/\bwindows (xp|me|98|95)\b/i],
    [VERSION, [NAME, "Windows"]],
  ],
}
