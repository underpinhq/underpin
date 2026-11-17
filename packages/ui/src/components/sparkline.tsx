"use client"

import { area, curveMonotoneX, line } from "d3-shape"
import { type ComponentProps, useId } from "react"
import { AREA_FADE } from "../lib/time-series"
import { cn } from "../lib/variants"

export type SparklineProps = Omit<ComponentProps<"div">, "children"> & {
  /** One figure per step along the line, in order. */
  data: number[]
  /**
   * Series colour; one of the `--color-chart-*` tokens.
   */
  color?: string
  /**
   * Line weight in px.
   */
  strokeWidth?: number
  /**
   * Whether the line wipes in when the element enters the page. Off by default: a line on a
   * page people return to all day would redraw on every visit.
   */
  animated?: boolean
}

/**
 * The drawing box. The SVG stretches it to whatever size its class gives, and the stroke keeps
 * its width through `vectorEffect`, so the box's proportions never show.
 */
const WIDTH = 100
const HEIGHT = 32
/** Half a stroke at the box's top and bottom, so a line at either end is not cut in half. */
const INSET = 1

interface Plotted {
  x: number
  y: number
}

const AREA = area<Plotted>()
  .x(point => point.x)
  .y0(HEIGHT)
  .y1(point => point.y)
  .curve(curveMonotoneX)
const LINE = line<Plotted>()
  .x(point => point.x)
  .y(point => point.y)
  .curve(curveMonotoneX)

/**
 * A trend at a glance: the smooth gradient area of `TimeSeriesChart` with no axes, grid,
 * tooltip or hover, filling whatever box it is given. Plain SVG rather than a chart, so the
 * pages that list sites never load the chart runtime for it. Purely a picture, so it takes no
 * pointer events and whatever sits under it stays clickable.
 */
export function Sparkline({
  data,
  color = "var(--color-chart-1)",
  strokeWidth = 1.5,
  animated = false,
  className,
  ...props
}: SparklineProps) {
  const gradientId = useId()
  const max = Math.max(...data, 0)
  const last = Math.max(data.length - 1, 1)
  const plotted = data.map((value, index) => ({
    x: (index / last) * WIDTH,
    // `||`: an all-zero series still draws its baseline at the bottom, not mid-box.
    // oxlint-disable-next-line typescript/prefer-nullish-coalescing
    y: HEIGHT - INSET - (value / (max || 1)) * (HEIGHT - INSET * 2),
  }))

  return (
    <div
      // Decorative: the figures it sketches are printed beside it.
      aria-hidden
      className={cn("pointer-events-none h-16 w-full", className)}
      {...props}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={cn(
          "size-full overflow-visible",
          animated && "animate-wipe-in motion-reduce:animate-none",
        )}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {AREA_FADE.map(stop => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>
        <path d={AREA(plotted) ?? undefined} fill={`url(#${gradientId})`} />
        <path
          d={LINE(plotted) ?? undefined}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
