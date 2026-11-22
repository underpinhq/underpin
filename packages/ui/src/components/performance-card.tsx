"use client"

import { type ComponentProps, type ReactNode, useState } from "react"
import { cn } from "../lib/variants"
import { Card, CardPanel } from "./card"
import { EmptyState } from "./empty-state"
import type { NumberFormat } from "./formatted-number"
import { StatStrip, StatStripItem } from "./stat-strip"
import {
  TimeSeriesChart,
  type TimeSeriesChartProps,
  TimeSeriesChartSkeleton,
} from "./time-series-chart"

/** One figure of the card's strip, and the chart drawn while it is selected. */
export interface PerformanceSeries {
  /** Names the series in `value` and `onValueChange`. */
  id: string
  label: string
  /** The full name a screen reader hears where `label` shortens it ("Revenue per visitor"). */
  name?: string
  /** The figure: a number or string goes through `format`, any other node renders as is. */
  value: ReactNode
  format?: NumberFormat
  /** A line under the figure: what it counts, or the figure it is compared with. */
  hint?: ReactNode
  /** The change at the end of the label row, such as a `Trend`. */
  trend?: ReactNode
  /**
   * The chart drawn while this series is selected. A series without one is a figure only and
   * cannot be selected, such as a lifetime total beside the range's own.
   */
  chart?: TimeSeriesChartProps
  /** Classes for the series' strip item, such as `max-sm:hidden` for a figure a phone drops. */
  className?: string
}

interface PerformanceCardBaseProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /**
   * A row above the strip: the card's title, and the range control the page owns, such as a
   * `CardHeader` with a `RangePicker` in its `actions`.
   */
  header?: ReactNode
  /** Draws the chart's skeleton and the figures', and starts loading the chart's code. */
  isLoading?: boolean
  /**
   * The card is showing an earlier range's data while the next one loads: the chart dims after
   * a moment, so a quick load never flickers, and reads as busy.
   */
  isPlaceholder?: boolean
  /**
   * What the card shows in place of a chart that failed to load, such as an `ErrorState` with
   * a retry. Shown only while there is no data to draw: a failed refetch keeps the series
   * already on screen.
   */
  error?: ReactNode
  /** What the card shows for a range with no data; "No data in this range" by default. */
  empty?: ReactNode
  /** A muted line under the chart, at its end: what the figures above leave out. */
  footnote?: ReactNode
  /** The plot's inset, for a card whose strip does not use the cells' own padding. */
  plotClassName?: string
  /** Panels after the chart's, such as a note on what the figures count. */
  children?: ReactNode
}

interface PerformanceCardSeriesProps extends PerformanceCardBaseProps {
  /**
   * The figures, one strip item each. The card draws the strip and the selected series' chart,
   * and switches the chart when another item is picked.
   */
  series: PerformanceSeries[]
  /** The selected series' `id`, for a card whose selection the page keeps, such as in the URL. */
  value?: string
  /** The series selected at first when the card keeps the selection itself; the first with a chart. */
  defaultValue?: string
  onValueChange?: (id: string) => void
  strip?: never
  chart?: never
}

interface PerformanceCardStripProps extends PerformanceCardBaseProps {
  /**
   * A strip of your own, a `StatStrip variant="track"`, for figures `series` cannot describe
   * (a tooltip on an item, a strip-wide error). Its selected item names the series `chart`
   * draws, and the page keeps the selection.
   */
  strip: ReactNode
  /** The selected series. While it is loading, leave it out or set `isLoading`. */
  chart?: TimeSeriesChartProps
  series?: never
  value?: never
  defaultValue?: never
  onValueChange?: never
}

export type PerformanceCardProps = PerformanceCardSeriesProps | PerformanceCardStripProps

interface SeriesStripProps {
  series: PerformanceSeries[]
  selected?: string
  isLoading?: boolean
  onSelect: (id: string) => void
}

/**
 * The strip `series` describes, one item each. Items are pressable, and the selected one marked,
 * only when there are two charts to pick between: a lone chart needs no picking.
 */
function SeriesStrip({ series, selected, isLoading, onSelect }: SeriesStripProps) {
  const isPickable = series.filter(item => item.chart).length > 1

  return (
    // Up to four figures fit one row on a laptop; five or six need the wider breakpoint.
    <StatStrip variant="track" row={series.length > 4 ? "wide" : "lg"}>
      {series.map(item => {
        const pickable = isPickable && !!item.chart

        return (
          <StatStripItem
            key={item.id}
            label={item.label}
            name={item.name}
            value={item.value}
            format={item.format}
            hint={item.hint}
            trend={item.trend}
            loading={isLoading}
            selected={pickable && item.id === selected}
            onSelect={pickable ? () => onSelect(item.id) : undefined}
            className={item.className}
          />
        )
      })}
    </StatStrip>
  )
}

/**
 * The stats card of a dashboard: a strip of figures whose selected one is both the chart's
 * title and the series drawn under it, in one card. Pass `series` and the card draws the strip
 * and switches the chart itself, keeping the selection unless the page passes `value`; or pass
 * a `strip` of your own and the selected `chart`. The page owns the range. The card draws the
 * loading, error, empty and earlier-data states of the chart in one place.
 */
export function PerformanceCard({
  header,
  isLoading,
  isPlaceholder,
  error,
  empty,
  footnote,
  plotClassName,
  children,
  series,
  value,
  defaultValue,
  onValueChange,
  strip,
  chart: stripChart,
  ...props
}: PerformanceCardProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  // Resolved on every render, and only to a series that has a chart, so a selection that names
  // a figure-only series, an unknown id or a series since removed falls back to the first chart
  // rather than leaving the card with nothing to draw. A card that mounts before its charts
  // arrive lands on the first one once they do.
  const charted = series?.filter(item => item.chart)
  const requested = value ?? uncontrolled
  const selected = (charted?.find(item => item.id === requested) ?? charted?.[0])?.id
  const chart = series ? charted?.find(item => item.id === selected)?.chart : stripChart
  const isEmpty = !chart?.data.length

  function select(id: string) {
    setUncontrolled(id)
    onValueChange?.(id)
  }

  return (
    <Card {...props}>
      {header}

      {/* The strip is a full-bleed band across the card; the panel under it draws the hairline
          that closes the band, and insets the plot to the cells' own padding. */}
      {series ? (
        <SeriesStrip series={series} selected={selected} isLoading={isLoading} onSelect={select} />
      ) : (
        strip
      )}

      <CardPanel
        size="none"
        aria-busy={!!isLoading || !!isPlaceholder || undefined}
        className={cn("flex flex-col px-3 pt-3 pb-2 md:px-5 md:pt-4 md:pb-3", plotClassName)}
      >
        {error && isEmpty ? (
          // Ahead of the skeleton: a first load that failed has no chart, so the skeleton would
          // win and pulse forever with no message and no way to retry.
          <div className="flex h-64 items-center justify-center">{error}</div>
        ) : isLoading || (!chart && !series) ? (
          // A strip of your own with no chart yet is a chart on its way; series with none to
          // draw once loaded are empty.
          <TimeSeriesChartSkeleton />
        ) : isEmpty ? (
          (empty ?? <EmptyState title="No data in this range" className="h-64 justify-center" />)
        ) : (
          <TimeSeriesChart
            {...chart}
            // The delay keeps a load that answers within it from dimming at all.
            className={cn(
              isPlaceholder
                ? "opacity-50 transition-opacity delay-200 duration-300"
                : "transition-none",
              chart.className,
            )}
          />
        )}

        {footnote && <p className="mt-1 text-right text-ink-muted text-xs">{footnote}</p>}
      </CardPanel>

      {children}
    </Card>
  )
}
