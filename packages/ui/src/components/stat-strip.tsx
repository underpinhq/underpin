"use client"

import { useRender } from "@base-ui/react/use-render"
import {
  type ComponentProps,
  isValidElement,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useId,
  useRef,
} from "react"
import { formatIdList } from "../lib/aria"
import { figureClasses } from "../lib/classes"
import { cn, variants, type VariantProps } from "../lib/variants"
import { cardSurfaceClasses } from "./card"
import { Collapse } from "./collapse"
import { FormattedNumber, type NumberFormat } from "./formatted-number"
import { Skeleton } from "./skeleton"

const stripVariants = variants({
  // Stacked in a tighter cut (see the item) until there is room for one row: two-up on a
  // phone, three-up from a tablet, then a flex row that fits however many stats there are.
  // A short last row stretches to the strip's edge instead of leaving an empty cell: a lone
  // last tile spans the row on a phone, and at three-up the last tile takes whatever the row
  // has left (four stats read three and one, five read three and two).
  // A container, so a figure can be sized against the whole strip rather than its own cell.
  base: [
    "@container group/strip grid grid-cols-2 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
    "sm:grid-cols-3 sm:[&>*:last-child:nth-child(3n+1)]:col-span-3 sm:[&>*:last-child:nth-child(3n+2)]:col-span-2",
  ],

  variants: {
    variant: {
      // A white card of figures on its own, divided by full-height hairlines.
      plain: cardSurfaceClasses,
      // The same row as a band of the card it shares with something else, most often the
      // chart the selected figure draws: no surface of its own, and the panel below it
      // carries the hairline that closes the band.
      track: "",
    },

    // Where the stacked grid gives way to one row. A cell of that row is the full width over
    // the number of stats, so how early it can happen is the caller's to know. `lg` carries
    // up to four stats, which are comfortable on a laptop. `wide` carries up to six with a
    // change beside each label: a label of about twelve characters plus a percentage holds
    // from 1360px up and clips at `xl`.
    row: {
      lg: "lg:flex lg:flex-wrap",
      wide: "min-[1360px]:flex min-[1360px]:flex-wrap",
    },
  },

  defaultVariants: {
    variant: "plain",
    row: "lg",
  },
})

/**
 * Shrinks every figure of the strip by the same factor until the widest one fits its cell, so
 * figures stay one size across the strip and none is cut off. A figure's length depends on the
 * reader's language ("12.6K" in English, "12,6 tys." in Polish), so the fit is measured, not
 * assumed.
 *
 * Text width is proportional to font size, so a figure's full-size width is its width now over
 * the factor now: one pass of reads and at most one write, with no reset to full size and the
 * second layout that would cost on every frame of a window resize. The factor is written only
 * when it changes, and a figure that got shorter grows back.
 */
function useFigureFit() {
  const ref = useRef<HTMLDivElement>(null)

  const fit = useCallback(() => {
    const strip = ref.current
    if (!strip) return

    // `||`, not `??`: an unset property reads as "" and so as 0, which means full size.
    const current = Number(strip.style.getPropertyValue("--stat-fit")) || 1
    let scale = 1

    // The text's own width against its line's: a truncated line reports no overflow through
    // `scrollWidth`, since the ellipsis is what fills it. The browser truncates a figure that
    // fits to within a pixel, so the line is taken as two pixels narrower than it is.
    for (const text of strip.querySelectorAll<HTMLElement>("[data-value] > [data-figure]")) {
      const available = (text.parentElement?.clientWidth ?? 0) - 2
      const needed = text.getBoundingClientRect().width / current
      if (needed > available) scale = Math.min(scale, available / needed)
    }

    // Rounded down, so a figure that fits by a subpixel is not cut off by rounding up.
    const next = Math.floor(scale * 100) / 100
    if (next !== current) strip.style.setProperty("--stat-fit", String(next))
  }, [])

  // Every render, since any figure may have changed.
  useLayoutEffect(fit)

  // A cell's width follows the strip's, and the layout steps between two-up, three-up and one
  // row. Only a width change refits: the refit itself changes the strip's height. The observer
  // runs after layout, so its reads are free.
  useLayoutEffect(() => {
    const strip = ref.current
    if (!strip) return

    let width = 0
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === width) return
      width = entry.contentRect.width
      fit()
    })

    observer.observe(strip)
    return () => observer.disconnect()
  }, [fit])

  return ref
}

interface StatStripProps
  extends Omit<ComponentProps<"div">, "ref">, VariantProps<typeof stripVariants> {}

function StatStrip({ className, variant, row, ...props }: StatStripProps) {
  const ref = useFigureFit()

  return (
    <div
      ref={ref}
      data-row={row ?? "lg"}
      className={stripVariants({ variant, row, className })}
      {...props}
    />
  )
}

// Sized against the strip (`cqw`, the strip being the container) rather than its own cell, so
// every figure in a strip comes out the same size. The share follows the layout: half the
// strip per cell while the grid is two-up, a third three-up, and in one row the most cells
// the row variant carries: a quarter for `lg`, a sixth for `wide`. Measured: ~26px on a
// phone; in one row, the 28px cap from about 850px of `lg` strip and 1270px of `wide` strip,
// with the 18px floor never binding. Tabular digits are wider than proportional ones, so the
// shares are 3.3% and 2.2% and the cap 28: a "$30.6K" fits its cell. A longer figure (a
// language that abbreviates in more letters) scales the whole strip down by `--stat-fit`.
const valueClasses = cn(
  // Tabular, so a figure that repolls in place or steps on a range change does not nudge
  // what sits beside it.
  figureClasses,
  "mt-0.5 truncate text-[calc(clamp(1.125rem,8cqw,1.75rem)*var(--stat-fit,1))] leading-figure sm:mt-1",
  "sm:text-[calc(clamp(1.125rem,5cqw,1.75rem)*var(--stat-fit,1))]",
  "group-data-[row=lg]/strip:lg:text-[calc(clamp(1.125rem,3.3cqw,1.75rem)*var(--stat-fit,1))]",
  "group-data-[row=wide]/strip:min-[1360px]:text-[calc(clamp(1.125rem,2.2cqw,1.75rem)*var(--stat-fit,1))]",
)

type StatStripItemProps = Omit<useRender.ComponentProps<"div">, "children" | "onSelect"> & {
  label: string
  /** The full name a screen reader hears where `label` shortens it ("Revenue per visitor"). */
  name?: string
  /**
   * A number (or a string) is formatted with `format`; any other node renders as is.
   */
  value: ReactNode
  format?: NumberFormat
  /** A line under the figure: what it counts, or the figure it is compared with. */
  hint?: ReactNode
  /** Folds the hint line away; keep passing the hint so the line has its text as it closes. */
  hintHidden?: boolean
  /**
   * Rendered at the end of the label row, e.g. a change against a previous period.
   */
  trend?: ReactNode
  /**
   * Draws a skeleton in place of the figure and leaves the trend out, while the figures load.
   * The label and the hint stay, so the strip keeps its shape.
   */
  loading?: boolean
  /** Marks the item as the one driving the panel beside it. */
  selected?: boolean
  /**
   * Makes the item a toggle button for the panel beside it, pressed while `selected`. Its label
   * and figure stay its name, so a screen reader hears the number with the label.
   */
  onSelect?: () => void
}

function StatStripItem({
  label,
  name,
  value,
  format,
  hint,
  hintHidden,
  trend: loadedTrend,
  loading,
  selected,
  onSelect,
  render,
  className,
  ...props
}: StatStripItemProps) {
  const id = useId()
  const trend = loading ? undefined : loadedTrend
  // Named by the label and the figure alone ("Visitors 1,234"), so the change and the hint
  // read after them as its description rather than running into the number.
  const button = onSelect && (
    <button
      type="button"
      aria-pressed={!!selected}
      aria-labelledby={`${id}-label ${id}-value`}
      aria-describedby={formatIdList(
        !!trend && `${id}-trend`,
        !!hint && !hintHidden && `${id}-hint`,
      )}
      onClick={() => onSelect()}
    />
  )

  return useRender({
    render: render ?? button,
    defaultTagName: "div",
    props: {
      "data-selected": selected ? true : undefined,
      className: cn(
        // The inset scales with the strip like the figure does, so a cell keeps its proportions
        // from a phone (16/12) up to the full desktop row (24/20).
        "group/stat relative min-w-0 flex-1 px-[clamp(1rem,2cqw,1.5rem)] py-[clamp(0.75rem,1.5cqw,1.25rem)] text-start",
        // Hairline divider before every neighbour: between the columns while the strip is
        // stacked, then between the cells of the single row. Hidden on whichever item starts
        // a row, which is every other one at two-up and every third at three-up.
        "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-edge",
        "first:before:hidden max-sm:[&:nth-child(odd)]:before:hidden",
        "group-data-[row=lg]/strip:sm:max-lg:[&:nth-child(3n+1)]:before:hidden",
        "group-data-[row=wide]/strip:sm:max-[1360px]:[&:nth-child(3n+1)]:before:hidden",
        // And one above every row after the first while the strip is stacked: from the third
        // item at two-up, the fourth at three-up. The single row has nothing above it.
        "after:absolute after:inset-x-0 after:top-0 after:hidden after:h-px after:bg-edge",
        "max-sm:[&:nth-child(n+3)]:after:block",
        "group-data-[row=lg]/strip:sm:max-lg:[&:nth-child(n+4)]:after:block",
        "group-data-[row=wide]/strip:sm:max-[1360px]:[&:nth-child(n+4)]:after:block",
        // The selected cell carries a 2px bar in the first series colour along its bottom edge,
        // where the chart it picks begins, as a tab marks its panel; the hairlines either side
        // stay. The value is full-strength whichever way; the label is muted until the cell is
        // selected.
        "data-selected:[&_[data-label]]:text-ink",
        // A cell other than the selected one answers the pointer as a tab does, with no fill: its
        // label steps up one shade, short of the selected ink, and the bar shows faintly.
        "[&:is(button)]:hover:not-data-selected:[&_[data-label]]:text-ink-secondary",
        // A surface that clips would cut a focus outline drawn past a flush cell, so the
        // outline sits inside the cell instead.
        "focus-visible:outline-offset-[-2px]",
        className,
      ),
      children: (
        <>
          {/* One bar for both states, so a click on a hovered cell only strengthens it. */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 bottom-0 h-0.5 bg-chart-1 opacity-0",
              onSelect && "group-hover/stat:opacity-35",
              "group-data-selected/stat:opacity-100!",
            )}
          />
          <p
            data-label
            className="flex items-baseline justify-between gap-2 text-ink-muted text-sm"
          >
            <span id={`${id}-label`} className="min-w-0 truncate">
              {name ? (
                <>
                  <span aria-hidden>{label}</span>
                  <span className="sr-only">{name}</span>
                </>
              ) : (
                label
              )}
            </span>
            {trend && (
              <span id={`${id}-trend`} className="shrink-0">
                {trend}
              </span>
            )}
          </p>

          <p id={`${id}-value`} data-value className={valueClasses}>
            <span data-figure>
              {loading ? (
                // A span, since the figure sits inside a <p>. Middle-aligned with no vertical
                // margin, so it sits inside the value line's fixed height instead of stretching
                // it. The strong fill rather than the skeleton's own, which the selected item
                // would show as the one figure that looks missing.
                <Skeleton
                  render={<span />}
                  className="inline-block h-[1em] w-[3.5em] bg-fill-strong align-middle"
                />
              ) : isValidElement(value) ||
                (typeof value !== "number" && typeof value !== "string") ? (
                value
              ) : (
                <FormattedNumber value={value} format={format} />
              )}
            </span>
          </p>

          {hint && (
            <Collapse open={!hintHidden} className={hintHidden ? "duration-200" : undefined}>
              <p
                id={`${id}-hint`}
                className={cn(
                  "truncate text-ink-muted text-sm",
                  "transition-[translate,filter] duration-250 ease-out-expo motion-reduce:transition-none",
                  hintHidden && "-translate-y-1.5 blur-[4px]",
                )}
              >
                {hint}
              </p>
            </Collapse>
          )}
        </>
      ),
      ...props,
    },
  })
}

export { StatStrip, StatStripItem }
