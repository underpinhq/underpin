"use client"

import { Component, type ReactNode, lazy, Suspense, useEffect, useState } from "react"
import type { TimeSeriesChartProps } from "../lib/time-series-plot"
import { cn } from "../lib/variants"
import { ErrorState } from "./error-state"
import { Skeleton } from "./skeleton"

export type { TimeSeriesChartProps } from "../lib/time-series-plot"
export type { TimeSeriesNote, TimeSeriesPoint, TimeSeriesSeries } from "../lib/time-series"

function importPlot() {
  return import("../lib/time-series-plot")
}

let chartModule: ReturnType<typeof importPlot> | undefined

/**
 * Starts loading the chart's code, so a route can have it ready before its page renders. The
 * module is fetched once: every later call answers the same promise. A load that failed (the
 * network dropped, or a deploy replaced the chunk) is forgotten, so the next call tries again.
 */
export function loadTimeSeriesChart() {
  chartModule ??= importPlot().catch((error: unknown) => {
    chartModule = undefined
    throw error
  })
  return chartModule
}

/** A lazy component keeps the failure of its first load for good, so a retry needs a new one. */
function createLazyPlot() {
  return lazy(async () => ({ default: (await loadTimeSeriesChart()).TimeSeriesPlot }))
}

let lazyPlot = createLazyPlot()

export interface TimeSeriesChartSkeletonProps {
  className?: string
}

/**
 * The chart's place while its data or its code loads, at the plot's height. It starts loading
 * the chart's code as it mounts, so the code arrives alongside the data rather than after it.
 */
export function TimeSeriesChartSkeleton({ className }: TimeSeriesChartSkeletonProps) {
  useEffect(() => void loadTimeSeriesChart(), [])

  return <Skeleton className={cn("h-64 w-full", className)} />
}

interface ChartBoundaryProps {
  children: ReactNode
  onRetry: () => void
}

interface ChartBoundaryState {
  failed: boolean
}

/**
 * Catches a chart whose code failed to load, so the page around it stays, and offers a retry
 * in the chart's place. A class, because React catches a render error only in one.
 */
class ChartBoundary extends Component<ChartBoundaryProps, ChartBoundaryState> {
  state: ChartBoundaryState = { failed: false }

  static getDerivedStateFromError(): ChartBoundaryState {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex h-64 items-center justify-center">
        <ErrorState
          title="Couldn’t load the chart"
          className="text-center"
          onRetry={() => {
            this.props.onRetry()
            this.setState({ failed: false })
          }}
        />
      </div>
    )
  }
}

/**
 * The time series chart. The chart library is among the largest modules an app ships, so this
 * entry loads it on demand: a page that imports the chart paints around it first, and the chart
 * draws in its skeleton's place once its code arrives. A load that fails shows a retry in the
 * chart's place rather than taking the page down. Import it directly; no lazy wrapper is needed
 * in the app.
 */
export function TimeSeriesChart(props: TimeSeriesChartProps) {
  const [Plot, setPlot] = useState(() => lazyPlot)

  return (
    <ChartBoundary
      onRetry={() => {
        // Shared by every chart on the page, so one retry loads the code for all of them.
        if (lazyPlot === Plot) lazyPlot = createLazyPlot()
        setPlot(() => lazyPlot)
      }}
    >
      <Suspense fallback={<TimeSeriesChartSkeleton />}>
        <Plot {...props} />
      </Suspense>
    </ChartBoundary>
  )
}
