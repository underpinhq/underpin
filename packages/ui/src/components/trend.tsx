import type { ComponentProps } from "react"
import { ApproximatelyEqualIcon, ArrowDownIcon, ArrowUpIcon } from "../lib/icons"
import { numberFormat } from "../lib/intl"
import { cn } from "../lib/variants"

export interface TrendProps extends Omit<ComponentProps<"span">, "children"> {
  /** The change as a fraction: 0.06 reads "6%" beside an arrow pointing up. */
  change: number
  /** For a figure where down is good, such as a bounce rate or a refund count. */
  invert?: boolean
  /**
   * The decimals of a percent the change is read to: 0 by default, so a +0.4% move reads
   * "0%" with nothing pointing up, and 1 reads it "0.4%" beside an arrow. It sets both the
   * default figure and the change below which the glyph says there was none.
   */
  precision?: number
  /**
   * The unsigned figure beside the arrow, handed the change's magnitude as a fraction, before
   * any rounding. A percent to `precision` in the reader's language by default, and a
   * multiplier from tenfold up ("12.5×").
   */
  format?: (magnitude: number) => string
  /** The language of the default figure; the reader's own when left out. */
  locale?: string
}

/**
 * The change rounded to `precision` decimals of a percent, which is what the glyph is chosen
 * from. The magnitude is rounded and the sign restored, so a half rounds away from zero either
 * way, as `Intl.NumberFormat` rounds the figure beside it: -0.5% reads "1%" pointing down.
 */
function roundChange(change: number, precision: number) {
  const factor = 10 ** (precision + 2)
  const rounded =
    (Math.sign(change) * Math.round((Math.abs(change) + Number.EPSILON) * factor)) / factor
  return rounded === 0 ? 0 : rounded
}

/**
 * The change as the figure the arrow points at: "6%", "150%". From tenfold up it is a
 * multiplier ("12.5×", "248×", "12K×"): "24743%" is a number nobody reads, and a figure that
 * grew from almost nothing is exactly where a change lands there. A drop cannot pass 100%, so
 * it always stays a percent.
 */
function formatChange(magnitude: number, precision: number, locale?: string) {
  if (magnitude < 10) {
    return numberFormat(locale, { style: "percent", maximumFractionDigits: precision }).format(
      magnitude,
    )
  }

  const multiplier = 1 + magnitude
  const digits = multiplier < 100 ? 1 : 0
  const figure = numberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(multiplier)
  return `${figure}×`
}

/**
 * The change against a compared period beside a figure: an arrow for the direction and the
 * unsigned figure, coloured by whether the move is good. A change that rounds to zero gets an
 * "about equal" glyph in the full ink, so it reads as a result rather than as part of the muted
 * text around it. Sized by the text around it, so it fits a stat's label row
 * (`StatStripItem`'s `trend`) or a table cell alike. A change that is not a finite number (a
 * division by a compared figure of zero) renders nothing, since no figure would be true.
 */
export function Trend({
  change,
  invert,
  precision = 0,
  format,
  locale,
  className,
  ...props
}: TrendProps) {
  if (!Number.isFinite(change)) return null

  // Whole decimals of a percent only; a negative or fractional precision would make the
  // number formatter throw.
  const digits = Number.isFinite(precision) ? Math.min(Math.max(Math.trunc(precision), 0), 20) : 0
  const rounded = roundChange(change, digits)
  const good = invert ? rounded < 0 : rounded > 0
  const tone = rounded === 0 ? "text-ink" : good ? "text-success-ink" : "text-danger-ink"
  const Glyph = rounded === 0 ? ApproximatelyEqualIcon : rounded > 0 ? ArrowUpIcon : ArrowDownIcon
  const label = rounded === 0 ? "No change" : rounded > 0 ? "Up" : "Down"

  return (
    // Never wraps: the glyph carries the direction, so a line break between it and the figure
    // would leave a percentage that reads as neither up nor down.
    <span className={cn("whitespace-nowrap font-medium", tone, className)} {...props}>
      {/* Icons are hidden by default; this one is the whole reading, so it is announced. */}
      <Glyph
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-hidden={false}
        aria-label={label}
        strokeWidth={2}
        className="mr-[0.1em] inline-block size-[1em] align-[-0.15em]"
      />
      {format ? format(Math.abs(change)) : formatChange(Math.abs(rounded), digits, locale)}
    </span>
  )
}
