import { memo } from "react"

/**
 * Turns a number into the text a reader sees. The app supplies it, so every figure on a page
 * follows the app's own locale and rules: the library builds no number formatter of its own.
 */
export type NumberFormat = (value: number) => string

interface FormattedNumberProps {
  /**
   * Strings (empty-value dashes like "—") render as-is.
   */
  value: number | string
  /** Without one, the number renders as its plain digits. */
  format?: NumberFormat
  prefix?: string
  suffix?: string
}

/**
 * A formatted number, rendered as plain text. Memoised: a board renders hundreds of these, and
 * most keep their value from one render to the next.
 */
export const FormattedNumber = memo(function FormattedNumber({
  value,
  format,
  prefix = "",
  suffix = "",
}: FormattedNumberProps) {
  if (typeof value === "string") return value
  return `${prefix}${format ? format(value) : String(value)}${suffix}`
})
