import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { ArrowUpRightIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { FormattedNumber, type NumberFormat } from "./formatted-number"
import { Skeleton } from "./skeleton"

/**
 * Ranked breakdown list: each row is a label sitting on a soft bar whose width is the row's
 * share of the largest value, measured across the whole row, with the figures right-aligned
 * beside it. It is a real `<table>` on auto layout, so every figure column is exactly as wide
 * as its own widest cell (its column name included) rather than every column sharing one
 * width cut to fit the longest name. Compose it as `BarList` → `BarList.Header` +
 * `BarList.Body` (or `BarList.Skeleton`), so the names and the figures share the columns.
 *
 * A row that links out carries its `href` on the arrow beside the label; a row-sized click
 * target (click-to-filter) goes in the row's `overlay`, since a `<tr>` can be neither.
 *
 * The bar and the overlay span the row but hang off the label cell, not the `<tr>`: Safari
 * never made a positioned table row a containing block (WebKit 240961), so anything absolute
 * inside one lands on the nearest positioned ancestor outside the table (the card), and every
 * row's bar ran the card's full height and painted over the rows above it. A cell is honoured
 * everywhere, and the wrapper is a container so `100cqw` is the table's width, which is what
 * a share of the row measures against.
 */
function BarListRoot({ className, ...props }: ComponentProps<"table">) {
  return (
    // `border-spacing-y` is the row gap; it also pads the table's top and bottom edge, which
    // `-my-1` takes back. `-mx-2` is the row's own cell padding, so the text sits on the
    // parent's inset and the bar bleeds 8px past it. The margins ride the wrapper: a container
    // is its own formatting context, so a margin on the table would not collapse through it.
    <div className={cn("@container -mx-2 -my-1", className)}>
      <table className="w-full border-separate border-spacing-y-1" {...props} />
    </div>
  )
}

/**
 * The label column takes every pixel the figure columns leave (`w-full`) and may shrink below
 * its own text (`max-w-0`), so a long name truncates instead of widening the table. It is the
 * positioned box the bar and the overlay are laid out against (see `BarListRoot`).
 */
const labelCellClasses = "relative w-full max-w-0 pl-2"

/** Laid out from the label cell's left edge across the whole row, whatever the column count. */
export const rowSpanClasses = "absolute inset-y-0 left-0 w-[100cqw]"

/**
 * The gutter before a figure column. Content-sized columns sit as close as their own digits
 * allow, so the gutter is what keeps four of them from reading as one number.
 */
const figureGutter = "pl-4"

/**
 * A figure column is at least 64px, so the columns of two cards side by side line up, and
 * grows with its contents past that. `relative` lifts the figure over the bar, which reaches
 * across from the label cell; that also puts it above a row-sized `overlay`, which is why the
 * overlay carries a z-index.
 */
const figureCellClasses = cn(
  figureGutter,
  "relative min-w-16 text-right whitespace-nowrap tabular-nums",
)

/** The rightmost column carries the row's padding at the end of the row. */
const lastCellClasses = "pr-2"

export type BarListRowProps = Omit<ComponentProps<"tr">, "children"> & {
  /**
   * Row text; string labels truncate.
   */
  label: ReactNode
  /**
   * Plain-text row name for the link's aria label, when `label` isn't a string.
   */
  name?: string
  /**
   * Leading visual (favicon, flag, icon tile), 16px.
   */
  icon?: ReactNode
  value: number
  /**
   * The largest value in the list; the bar spans `value / max` of the row.
   */
  max: number
  /**
   * Bar width as a fraction of the row, overriding `value / max`: e.g. a rank ladder so the
   * bars hold still while the rows' labels and values change under them.
   */
  share?: number
  format?: NumberFormat
  /**
   * The figure that leads the row (revenue, a conversion rate), in the column right after the
   * label: the same place on a card and in the full list beside it.
   */
  secondaryValue?: number | string
  secondaryFormat?: NumberFormat
  /** Styles the secondary figure, e.g. tinting money apart from the counts around it. */
  secondaryClassName?: string
  /**
   * Further muted figures in their own columns between the secondary one and the value, for
   * a wide list (a dialog) that has room for figures the card holds back.
   */
  extras?: { value: ReactNode; className?: string }[]
  /**
   * External URL, shown as an arrow beside the label that opens in a new tab.
   */
  href?: string
  /**
   * An element laid over the whole row, such as a click-to-filter button. It renders inside the
   * label cell, which positions it; give it `rowSpanClasses` to cover every column. Give it a
   * `z-index`: the figure cells are positioned and come after it, so at `z-auto` they would
   * paint over it and swallow every click outside the label. Keep it under the `href` arrow's
   * `z-10` and the arrow stays clickable above it.
   */
  overlay?: ReactNode
}

function BarListRow({
  label,
  name,
  icon,
  value,
  max,
  share: shareOverride,
  format,
  secondaryValue,
  secondaryFormat,
  secondaryClassName,
  extras,
  href,
  overlay,
  className,
  style,
  ...props
}: BarListRowProps) {
  // Clamped at both ends. The low end guards a negative value and the divide by zero; the
  // high end guards a `share` override above 1, or a `max` computed from a filtered subset
  // while `value` comes from the full set. The bar is absolutely positioned, so it would
  // run past the row's right edge and under the value column.
  const share = Math.min(Math.max(shareOverride ?? (max > 0 ? value / max : 0), 0), 1)

  return (
    <tr
      className={cn("group/bar h-7.5 text-start text-sm", className)}
      style={{ "--bar-share": share, ...style } as CSSProperties}
      {...props}
    >
      <td className={labelCellClasses}>
        {/* The bar spans the whole row, so a 100% share runs edge to edge behind label and
            value alike; the text sits above it. A clip draws the share, since a list changes
            every bar at once and animating their widths would lay the rows out on each frame. */}
        <div
          aria-hidden
          data-bar
          className="absolute inset-y-0 left-0 w-[100cqw] bg-fill-subtle transition-[clip-path] duration-250 ease-out-expo [clip-path:inset(0_calc(100%-max(var(--bar-share)*100%,0.375rem))_0_0_round_var(--radius-md))]"
        />

        <div className="relative flex items-center gap-2">
          {icon && <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>}
          {/* A truncated label has no other full reading: the row has no tooltip, and the
              details dialog truncates the same way. */}
          <span
            title={name ?? (typeof label === "string" ? label : undefined)}
            className="min-w-0 truncate"
          >
            {label}
          </span>

          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              data-row-link
              aria-label={`Open ${name ?? (typeof label === "string" ? label : "this row")} in a new tab`}
              // Its own flex item, never inside the label: a truncating label would clip
              // the arrow away. `z-10` keeps it clickable under a row-sized `overlay`
              // (click-to-filter); a coarse pointer gets a target grown around the glyph,
              // with the negative margin keeping the row's layout. The -3px takes back the
              // inset its click target leaves around a 14px glyph, so the arrow sits the same
              // 8px off the label as the icon does on the other side.
              className="relative z-10 -ml-[3px] flex size-5 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:text-ink pointer-coarse:-mx-1 pointer-coarse:size-7"
            >
              <ArrowUpRightIcon className="size-3.5" />
            </a>
          )}
        </div>

        {overlay}
      </td>

      {secondaryValue !== undefined && (
        <td className={cn(figureCellClasses, "text-ink-muted", secondaryClassName)}>
          <FormattedNumber value={secondaryValue} format={secondaryFormat} />
        </td>
      )}

      {extras?.map((extra, index) => (
        <td key={index} className={cn(figureCellClasses, "text-ink-muted", extra.className)}>
          {extra.value}
        </td>
      ))}

      <td className={cn(figureCellClasses, lastCellClasses, "font-medium text-ink-muted")}>
        <FormattedNumber value={value} format={format} />
      </td>
    </tr>
  )
}

export type BarListBodyProps = ComponentProps<"tbody">

/**
 * Holds the `BarList.Row`s, next to the `BarList.Header` that names their columns.
 */
function BarListBody(props: BarListBodyProps) {
  return <tbody {...props} />
}

export type BarListHeaderProps = Omit<ComponentProps<"thead">, "children"> & {
  /**
   * Names the rows' `extras` columns, in the same order.
   */
  extras?: { label: ReactNode; className?: string }[]
  /**
   * Names the secondary column; leave it out when no row fills that column.
   */
  secondary?: ReactNode
  value: ReactNode
  /**
   * Pin the names to the top of the nearest scroll container, for a list long enough to scroll
   * (the full list in a dialog), so the figures stay named however far down you are. Give the
   * scroll container no top padding: the names then start where they stick and never move.
   */
  sticky?: boolean
}

/**
 * Column names over a `BarList`, in the rows' own columns: the table lines them up, and each
 * name is free to be as wide as it needs. Keep it inside the same `BarList` as whatever swaps
 * the rows for their skeleton, and the card keeps one height across loading and loaded; drop
 * the whole table for an empty or error state, or the names stand over nothing.
 */
function BarListHeader({
  extras,
  secondary,
  value,
  sticky,
  className,
  ...props
}: BarListHeaderProps) {
  // Sticky rides the cells, not the `<thead>`: a table section only sticks in newer browsers,
  // and each cell has to carry the background itself: `border-separate` leaves gaps a
  // section-level background never paints, which the rows would show through. A sticky
  // element is held inside its scroll container's padding, so padding there would leave a band
  // over the names that the rows pass through; the room above belongs outside the container.
  // `z-20`, over the rows' `z-10` arrows: at the same z, later in the DOM, they paint over it.
  const stickyClasses = sticky && "sticky top-0 z-20 bg-surface"
  // No top padding: the parent's padding is the room over the names. 8px plus the row gap
  // puts the first bar 12px under them, matching the 12px above.
  const cellClasses = cn(
    figureGutter,
    "pb-2 text-right font-normal whitespace-nowrap",
    stickyClasses,
  )

  return (
    <thead className={cn("text-ink-muted text-xs", className)} {...props}>
      <tr>
        {/* The label column goes unnamed (the card's title and tab already say what the
            rows are), so its corner is a plain cell holding the column open, not a header
            of nothing. It stays in the accessibility tree: a hidden cell in a header row can
            shift which header a screen reader pairs with each column. */}
        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
        <td className={cn(labelCellClasses, stickyClasses)} />
        {secondary !== undefined && <th className={cellClasses}>{secondary}</th>}
        {extras?.map((extra, index) => (
          <th key={index} className={cn(cellClasses, extra.className)}>
            {extra.label}
          </th>
        ))}
        <th className={cn(cellClasses, lastCellClasses)}>{value}</th>
      </tr>
    </thead>
  )
}

/**
 * Label bars step down like a ranked list would, so the swap to data reads as a fill-in
 * rather than a reflow.
 */
const skeletonShares = ["70cqw", "55cqw", "45cqw", "35cqw", "30cqw"] as const

export type BarListSkeletonProps = ComponentProps<"tbody"> & {
  /**
   * Rows to draw, matching the list that replaces it.
   */
  rows?: number
  /**
   * Columns the list has, the label one included, so the one figure the skeleton draws lands
   * under the same name the data's will.
   */
  columns?: number
}

/**
 * Loading stand-in at the exact row height of `BarList.Row`, so swapping in data causes no
 * layout shift. Its bars take `Skeleton`'s own fill, a step darker than a row's, so the pulse
 * still reads on a card.
 */
function BarListSkeleton({ rows = 5, columns = 2, className, ...props }: BarListSkeletonProps) {
  return (
    <tbody aria-hidden className={className} {...props}>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index} className="h-7.5">
          <td className={labelCellClasses}>
            <Skeleton
              className="absolute inset-y-0 left-0"
              style={{ width: skeletonShares[index % skeletonShares.length] }}
            />
          </td>
          {/* Placeholders for the columns between the label and the last figure. They carry no
              padding of their own, so a column its header hides on a narrow screen collapses
              to nothing here too. */}
          {Array.from({ length: Math.max(columns - 2, 0) }, (_, column) => (
            <td key={column} aria-hidden />
          ))}
          {columns > 1 && (
            <td className={cn(figureCellClasses, lastCellClasses)}>
              <Skeleton className="ml-auto h-3.5 w-8" />
            </td>
          )}
        </tr>
      ))}
    </tbody>
  )
}

const BarList = Object.assign(BarListRoot, {
  Row: BarListRow,
  Body: BarListBody,
  Header: BarListHeader,
  Skeleton: BarListSkeleton,
})

export { BarList }
