"use client"

import { useEffect, useRef } from "react"
import {
  DayPicker,
  type ChevronProps,
  type DayButtonProps,
  type DayPickerProps,
} from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "../lib/icons"
import { cn } from "../lib/variants"

/** The month back/forward arrow, on both the single and the two-month layout. */
const navButton =
  "row-start-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-secondary hover:bg-fill-subtle hover:text-ink aria-disabled:opacity-40"

/**
 * The month navigation arrows, drawn from this package's own glyph set rather than
 * react-day-picker's inline SVG.
 */
function Chevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeftIcon : ChevronRightIcon
  return <Icon className={cn("size-3.5", className)} />
}

/**
 * The day cell's button. Its fill is computed here, from the modifiers, instead of through the
 * `classNames` map: a day in a selected range carries `selected` *and* `range_middle`, whose
 * class strings would both land on the element with no defined order between them. Resolving
 * it in JS lets `cn` drop the loser.
 */
function DayButton({ day: _day, modifiers, className, ...props }: DayButtonProps) {
  // react-day-picker moves a `focused` flag between days as the arrow keys walk the grid, and
  // expects the day wearing it to pull the browser's focus across. Its own DayButton does this;
  // an override that leaves it out renders a grid the arrow keys appear to ignore.
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  // The ends of a range read as picked; the days between them are only tinted, so the two
  // dates a reader is looking for stay legible inside the band. An outside day never takes the
  // solid chip: six fixed week rows mean a neighbouring month's days can appear in two grids at
  // once, and only the one in its own month should read as the day that was picked.
  const filled = modifiers.selected && !modifiers.range_middle && !modifiers.outside

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // `h-8 w-8` rather than `size-8`: `fluid` overrides the width alone, and class merging
        // drops a whole `size-*` when a later `w-*` lands on it, taking the height with it.
        "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-xs",
        "disabled:opacity-40",
        filled
          ? "bg-ink font-medium text-ink-inverse"
          : "text-ink-secondary hover:bg-fill-subtle hover:text-ink",
        // Every day of a range is set in medium, so the span reads as one block at a glance.
        modifiers.range_middle && "font-medium text-ink",
        // A neighbouring month's day is still a day that can be picked, so it is muted rather
        // than dimmed out of reach.
        modifiers.outside && !filled && "text-ink-muted",
        // A dot under the number, in whatever colour the number itself is.
        modifiers.today &&
          "font-medium after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-current",
        className,
      )}
      {...props}
    />
  )
}

/**
 * `ref` and `initialFocus` for the popover or dialog holding a `Calendar`: focus lands on the
 * day react-day-picker marks as its keyboard entry point, so arrow keys move between days at
 * once. Base UI otherwise focuses the back arrow, and react-day-picker's own `autoFocus` does
 * not fire once Base UI has taken focus.
 */
export function useCalendarFocus() {
  const ref = useRef<HTMLDivElement>(null)

  function initialFocus() {
    return ref.current?.querySelector<HTMLElement>('[role="grid"] button[tabindex="0"]') ?? null
  }

  return { ref, initialFocus }
}

export type CalendarProps = DayPickerProps & {
  /**
   * Spread the month across its container instead of sizing it to the day cells. For a single
   * month filling a phone-width sheet, where a grid sized to 32px cells leaves a wide margin
   * either side. Days grow with the columns, which also gives them a thumb-sized target.
   */
  fluid?: boolean
}

/**
 * A month grid: one date, several, or a range, depending on `mode`. Every react-day-picker prop
 * passes through; this wraps it in the site's tokens and glyphs.
 *
 * Weeks start on Monday; pass `weekStartsOn` to change that.
 */
export function Calendar({ className, classNames, fluid, ...props }: CalendarProps) {
  return (
    <DayPicker
      weekStartsOn={1}
      showOutsideDays
      // Always six week rows, so the panel keeps its height from one month to the next instead
      // of resizing under the cursor, and side-by-side months line up row for row.
      fixedWeeks
      // Both arrows sit on the caption row of the months they belong to, so a two-month
      // calendar keeps one arrow at each outer edge.
      navLayout="around"
      className={cn("select-none", fluid ? "w-full" : "w-fit", className)}
      components={{ Chevron, DayButton }}
      classNames={{
        months: "flex items-start gap-6 max-sm:flex-col max-sm:gap-4",
        // Three columns: the back arrow, the caption, the forward arrow. The grid spans all
        // three, and each part names its own column so a month missing an arrow keeps its
        // caption centred.
        month: cn("grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-y-3", fluid && "w-full"),
        button_previous: cn(navButton, "col-start-1"),
        button_next: cn(navButton, "col-start-3"),
        month_caption: "col-start-2 row-start-1 flex justify-center font-medium text-sm",
        // Separate borders with vertical spacing only: the days of a week stay edge to edge so
        // a selected range reads as one unbroken bar, while the rows get air between them.
        // `table-fixed` is what splits the width into seven equal columns once it is `w-full`.
        month_grid: cn(
          "col-span-3 row-start-2 border-separate border-spacing-y-1",
          fluid && "w-full table-fixed",
        ),
        weekdays: "",
        weekday: cn("pb-2 font-normal text-2xs text-ink-muted", !fluid && "w-8"),
        week: "",
        // The row's outer cells round the band where a range wraps onto the next week.
        day: "p-0 text-center first:rounded-l-md last:rounded-r-md",
        // The band behind a selected range. `range_start`/`range_end` round its outer edge; a
        // one-day range picks up both and rounds on both sides.
        range_start: "rounded-l-md bg-fill",
        range_middle: "bg-fill",
        range_end: "rounded-r-md bg-fill",
        // Left blank on purpose: `DayButton` draws these states from the modifiers instead,
        // where conflicting ones can be resolved in order.
        selected: "",
        today: "",
        outside: "",
        disabled: "",
        day_button: fluid ? "h-10 w-full" : "",
        ...classNames,
      }}
      {...props}
    />
  )
}

/** A `from`/`to` pair in `mode="range"`, under a name that doesn't collide with a product's own. */
export type { DateRange as CalendarRange } from "react-day-picker"
