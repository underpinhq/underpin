/**
 * The arithmetic behind `TimeSeriesChart`: its point and note shapes, round grid lines, evenly
 * spaced date ticks, and notes folded onto the buckets that hold them. Pure, so it is tested
 * without rendering a chart.
 */

export interface TimeSeriesSeries {
  /** Reads `point.values[key]`. */
  key: string
  label: string
  /** One of the `--color-chart-*` tokens; defaults to `SERIES_COLORS` by index. */
  color?: string
}

/** The hues of a multi-series chart's lines, in series order; a fourth line wraps to the first. */
export const SERIES_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
]

export interface TimeSeriesPoint {
  date: Date
  value: number
  /**
   * The same bucket in a compared period, drawn as a dashed, unfilled line.
   */
  previous?: number
  /**
   * An optional second series drawn as bars behind the line, on its own left-hand axis
   * (a different unit, e.g. revenue against a traffic line). Shown when any point is above zero.
   */
  bar?: number
  /**
   * A segment stacked on `bar`, drawn as a dashed outline: the part the bar lost (a refund
   * over net revenue). Drawn, and listed in the tooltip, once any point is above zero.
   */
  outline?: number
  /** Multi-series mode: one figure per `TimeSeriesSeries.key`. */
  values?: Record<string, number>
  /**
   * The bucket covers only part of its period, so its figures read low: the last buckets while
   * they are still running, or the first when a rolling range starts mid-bucket. The line
   * reaches them dashed and their bars are dashed outlines, so a partial bucket never reads as
   * a drop.
   */
  partial?: boolean
  /**
   * Figures of the bucket that the chart does not draw, already formatted, listed in its
   * tooltip under a hairline.
   */
  details?: { label: string; value: string }[]
}

export interface TimeSeriesNote {
  date: Date
  text: string
  /** Who wrote it; the tooltip's small line over the text ("Piotr · Sep 10"). */
  author?: string
}

/**
 * The wash under a line, as `TimeSeriesChart` and `Sparkline` draw it: a quarter of the series'
 * hue at the line, fading to nothing at the baseline. Offsets run from the top of the plot.
 */
export const AREA_FADE = [
  { offset: 0.05, opacity: 0.25 },
  { offset: 0.95, opacity: 0.01 },
] as const

/** How many buckets at the end of the series are still running. */
export function countRunning(data: Pick<TimeSeriesPoint, "partial">[]): number {
  let count = 0
  while (count < data.length && data[data.length - 1 - count]?.partial) count += 1
  return count
}

/** How many partial buckets open the series, leaving out the running ones at its end. */
export function countPartialStart(data: Pick<TimeSeriesPoint, "partial">[]): number {
  const limit = data.length - countRunning(data)
  let count = 0
  while (count < limit && data[count]?.partial) count += 1
  return count
}

/** The sum of one series over the range, for the legend; a point without the key counts as zero. */
export function seriesTotal(data: TimeSeriesPoint[], key: string): number {
  return data.reduce((sum, point) => sum + (point.values?.[key] ?? 0), 0)
}

/** Plainest tick steps, tried first: one of these times a power of ten. */
const PLAIN_STEPS = [1, 2, 5, 10]

/** Finer steps, for the ranges no plain step fits without leaving the plot half empty. */
const FINE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/** The smallest step on `ladder` that fits `raw`; a whole-number series never gets a fractional one. */
function roundStep(raw: number, ladder: number[], integer: boolean): number {
  const power = 10 ** Math.floor(Math.log10(raw))
  return (
    ladder
      .map(unit => unit * power)
      .find(unit => unit >= raw && (!integer || Number.isInteger(unit))) ?? raw
  )
}

/**
 * Intervals between horizontal grid lines. Fixed rather than scaled to the data, so the
 * bar axis, drawn on the same lines over its own unit, keeps one scale as the metric on the
 * value axis changes; otherwise the same revenue bars resize on every switch of the stat strip.
 * Four intervals also divide a `[0, 100]` rate into round quarters.
 */
const GRID_INTERVALS = 4

/** The grid lines at `step` apart, from zero. */
function ticksOf(step: number): number[] {
  // toPrecision kills the float dust a 0.1 step leaves behind (0.30000000000000004).
  return Array.from({ length: GRID_INTERVALS + 1 }, (_, index) =>
    Number((step * index).toPrecision(12)),
  )
}

/**
 * Grid lines from 0 up past `max`, all on round numbers. A plain step (1, 2, 5) wins unless the
 * data would fill less than three quarters of the scale it makes, and steps whose ticks render
 * the same label are ruled out: a currency axis over a few cents otherwise reads "$0.01,
 * $0.01". An empty series is a plain 0–4.
 */
export function niceTicks(
  max: number,
  { integer = false, format }: { integer?: boolean; format?: (value: number) => string } = {},
): number[] {
  if (!(max > 0)) return ticksOf(1)

  function scaleOn(ladder: number[]) {
    const step = roundStep(max / GRID_INTERVALS, ladder, integer)
    return { top: step * GRID_INTERVALS, ticks: ticksOf(step) }
  }
  const plain = scaleOn(PLAIN_STEPS)
  const readable = [plain, scaleOn(FINE_STEPS)].filter(
    scale => !format || new Set(scale.ticks.map(format)).size === scale.ticks.length,
  )
  // Where neither step can tell its labels apart (a sub-cent money axis, a sub-second
  // duration), the plain one stands: it repeats itself least.
  const fallback = readable[0] ?? plain

  return readable.find(scale => max >= scale.top * 0.75)?.ticks ?? fallback.ticks
}

/** Grid lines over a fixed scale (a rate pinned to `[0, 100]`), in equal intervals. */
export function domainTicks([low, high]: [number, number]): number[] {
  return ticksOf((high - low) / GRID_INTERVALS).map(value => low + value)
}

/**
 * Tick instants on a time axis: every nth bucket from the first, with the smallest whole n
 * that fits `count` labels. Ticks land on real buckets and the gaps are equal, so the labels
 * step by a constant amount ("2 AM, 4 AM, 6 AM") instead of drifting between 1 and 2. The
 * tail bucket is dropped when it doesn't fall on the step rather than crowding the last gap.
 */
export function pickTicks(times: number[], count: number): number[] {
  const total = times.length
  if (total <= count) return times
  const step = Math.ceil((total - 1) / (count - 1))
  return times.filter((_, index) => index % step === 0)
}

/**
 * Notes grouped onto the bucket that holds them: a note belongs to the last bucket starting at
 * or before it, so a week bucket folds in its seven days and an hourly chart shows a midnight
 * note on its 00:00 bucket. Anything past the trailing bucket's `end` is outside the range and
 * dropped, as is anything before the first bucket. Without an `end` the trailing bucket is taken
 * to be as wide as the one before it (wrong for months, hence the parameter); a lone bucket
 * then has no width to infer from, so only a note on its exact instant lands.
 */
export function bucketNotes(
  times: number[],
  notes: TimeSeriesNote[],
  endOfLast?: number,
): Map<number, TimeSeriesNote[]> {
  const bucketed = new Map<number, TimeSeriesNote[]>()
  const count = times.length
  const first = times[0]
  const last = times[count - 1]
  if (first === undefined || last === undefined) return bucketed

  const before = times[count - 2]
  const end = endOfLast ?? (before === undefined ? last : last + (last - before))

  for (const note of notes) {
    const time = note.date.getTime()
    if (time < first || (end === last ? time !== last : time >= end)) continue

    // The last bucket starting at or before the note; `times` is ascending.
    let low = 0
    let high = count - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if ((times[middle] ?? Number.POSITIVE_INFINITY) <= time) low = middle
      else high = middle - 1
    }

    const start = times[low] ?? first
    const existing = bucketed.get(start)
    if (existing) existing.push(note)
    else bucketed.set(start, [note])
  }

  return bucketed
}
