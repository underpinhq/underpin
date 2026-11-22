"use client"

import {
  areaY,
  barY,
  type ChartGuideLineStyle,
  createMark,
  defineChart,
  group,
  lineY,
} from "@tanstack/charts"
import { d3Curve } from "@tanstack/charts/d3/shape"
import { focusGuideX } from "@tanstack/charts/focus/guide"
import { motion } from "@tanstack/charts/motion"
import { RendererChart } from "@tanstack/charts/react/tooltip"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { tooltip } from "@tanstack/charts/tooltip"
import { portal } from "@tanstack/charts/tooltip/portal"
import { curveLinear, curveMonotoneX } from "d3-shape"
import {
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  useDeferredValue,
  useId,
  useRef,
  useState,
} from "react"
import { type ChartTooltipItem, ChartTooltipContent } from "../components/chart"
import { CHART_TRANSITION } from "./animation"
import { splitCurve } from "./chart-curve"
import { tooltipLabelClasses, tooltipRuleClasses } from "./classes"
import { useElementWidth } from "./media"
import {
  bucketNotes,
  AREA_FADE,
  countPartialStart,
  countRunning,
  domainTicks,
  niceTicks,
  pickTicks,
  SERIES_COLORS,
  seriesTotal,
  type TimeSeriesNote,
  type TimeSeriesPoint,
  type TimeSeriesSeries,
} from "./time-series"
import { cn } from "./variants"

// The chart itself, which `components/time-series-chart.tsx` loads on demand so the chart
// library stays out of the bundle of a page until it draws one. It lives in `lib/` so the
// `"./*"` wildcard export, which maps into `components/`, never exposes it as a subpath.

const DEFAULT_COLOR = "var(--color-chart-1)"
const BAR_COLOR = "var(--color-chart-2)"
// Neither the line's hue nor the bars': a note is a third thing on the chart.
const NOTE_COLOR = "var(--color-chart-3)"
/** How far a value label sits above its grid line, so the line runs under it, not through. */
const LABEL_RISE = 8
/**
 * The space between a plot edge that carries value labels and the data nearest it. The grid
 * lines run the full width; the line or the outermost bar stops this far short of the labels.
 */
const PLOT_INSET = 40
const PLOT_HEIGHT = 256
/** The `text-2xs` size in px, as the chart renderer takes it. */
const TICK_FONT_SIZE = 11
const GRID: ChartGuideLineStyle = {
  stroke: "var(--color-edge)",
  strokeOpacity: 1,
  strokeDasharray: "2 3",
}
const BAR_RADIUS = [2, 2, 0, 0] as const
const BAR_MAX_WIDTH = 18
/** The share of the space between buckets that the renderer gives a bucket's bars. */
const BAR_SHARE = 0.8
/** The band a lone bucket's bars get, with no neighbour to measure the space against. */
const LONE_BANDWIDTH = 48
/** The gaps around a compared pair's two bars, as a share of the pair's band. */
const PAIR_PADDING = 0.08
/** Half the diagonal of the 9px square a note marker is, stood on its corner. */
const NOTE_RADIUS = 6.4
/** A chart moves when its numbers change. Its first draw is not a change, so it lands at once. */
const RENDERER = motion({ initial: false, transition: CHART_TRANSITION })

/**
 * Room for one date label. Ticks are thinned to what the plot can hold at this pitch, so a
 * week shows every day on a wide card and a 180-day range still reads on a narrow one.
 */
const TICK_PITCH = 80
/** A tick label's width per character, as a share of its font size: the average advance. */
const TICK_CHARACTER_WIDTH = 0.6

/** Notes listed in one tooltip before the rest are summed up. */
const TOOLTIP_NOTES = 2

const DAY_MS = 86_400_000

/**
 * How far a bucket's bars reach either side of its time, given the band the renderer sizes
 * them from: half a bar, or half a compared pair of them. Follows the renderer's own sizing,
 * so the outermost bar can be placed to the pixel.
 */
function measureBarReach(bandwidth: number, paired: boolean) {
  if (!paired) return Math.min(bandwidth, BAR_MAX_WIDTH) / 2
  const step = bandwidth / (2 + PAIR_PADDING)
  return (step + Math.min((1 - PAIR_PADDING) * step, BAR_MAX_WIDTH)) / 2
}

interface EyebrowProps {
  parts: (string | false | undefined)[]
}

/** The small line over a note's text: whichever of author and day apply, or nothing at all. */
function Eyebrow({ parts }: EyebrowProps) {
  const shown = parts.filter(Boolean)
  if (!shown.length) return null
  return <div className={cn(tooltipLabelClasses, "truncate text-2xs")}>{shown.join(" · ")}</div>
}

interface NotesFooterProps {
  notes?: TimeSeriesNote[]
  /** The bucket's instant and exclusive end. */
  bucket?: number
  end?: number
  hint?: string
  color: string
  formatDate: (date: Date) => string
}

/**
 * The hovered bucket's notes under its figures, each with the marker's colour down its left
 * edge and a small line naming the author and the day. The day is left off only where the
 * tooltip's own heading already says it: a bucket no wider than a day, holding a note on that
 * very instant. Then what a click does, where the chart takes one; with neither notes nor a
 * click to explain it renders nothing at all.
 */
function NotesFooter({ notes, bucket, end, hint, color, formatDate }: NotesFooterProps) {
  const shown = notes?.slice(0, TOOLTIP_NOTES) ?? []
  const rest = (notes?.length ?? 0) - shown.length
  const dayBucket = bucket !== undefined && end !== undefined && end - bucket <= DAY_MS

  if (!shown.length) {
    return hint ? <div className={tooltipLabelClasses}>{hint}</div> : null
  }

  return (
    <div className="grid gap-1.5">
      {shown.map((note, index) => (
        <div
          key={index}
          className="min-w-0 border-l-2 border-(--color-note) pl-2"
          style={{ "--color-note": color } as CSSProperties}
        >
          <Eyebrow
            parts={[
              note.author,
              !(dayBucket && note.date.getTime() === bucket) && formatDate(note.date),
            ]}
          />
          {/* One line, whatever its length: a note runs to a paragraph, and a tooltip that
              grew to hold one would cover the chart it reports on. */}
          <div className="truncate font-medium">{note.text}</div>
        </div>
      ))}

      {rest > 0 && (
        <div className={tooltipLabelClasses}>
          and {rest} more {rest === 1 ? "note" : "notes"}
        </div>
      )}

      {hint && (
        // 8px either side of the rule, like the one the tooltip draws over this footer:
        // the grid's 6px gap plus 2px, then the same padding below.
        <div className={cn(tooltipLabelClasses, "mt-0.5 border-t pt-2", tooltipRuleClasses)}>
          {hint}
        </div>
      )}
    </div>
  )
}

interface SeriesLegendProps {
  series: (TimeSeriesSeries & { color: string })[]
  /** Absent for a metric with no meaningful sum. */
  totals?: Map<string, number>
  formatValue: (value: number) => string
}

/**
 * One entry per line of a multi-series plot: the line's swatch, its name and its total over
 * the range. Left-aligned above the plot, so the names are read before the lines they label.
 */
function SeriesLegend({ series, totals, formatValue }: SeriesLegendProps) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {series.map(entry => (
        <div key={entry.key} className="flex items-center gap-1.5">
          {/* A dash, not a dot: it reads as the line it stands for. */}
          <span
            aria-hidden
            className="h-0.5 w-2.5 shrink-0 rounded-[1px] bg-(--color-swatch)"
            style={{ "--color-swatch": entry.color } as CSSProperties}
          />
          <span className="text-ink-secondary">{entry.label}</span>
          {totals && (
            <span className="font-medium tabular-nums">
              {formatValue(totals.get(entry.key) ?? 0)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/** The dot a line shows at the hovered bucket, ringed in the card's colour. */
function focusMarker(color: string) {
  return { radius: 4, fill: color, stroke: "var(--color-surface)", strokeWidth: 2 }
}

/** Whether a bucket has an outline segment to stack on its bar. */
function isOutlined(point: TimeSeriesPoint) {
  return (point.outline ?? 0) > 0
}

/** A bucket as the chart draws it: the point, where its bucket starts and ends, and its notes. */
interface PlotPoint extends TimeSeriesPoint {
  time: number
  end: number
  notes: TimeSeriesNote[]
}

/**
 * A diamond in the note colour on the baseline of each bucket holding a note, the shape
 * Plausible settled on: a dot the size of the line would read as a data point, and one small
 * enough not to would read as nothing. Decorative, so hovering it reports its bucket as usual.
 */
function noteMarkers(times: number[], baseline: number, scaleId: string, color: string) {
  return createMark<PlotPoint>(() => ({
    id: "notes",
    channels: {
      x: { scale: "x", values: times },
      y: { scale: scaleId, values: [baseline] },
    },
    render({ scales }) {
      const xScale = scales.x
      const yScale = scales[scaleId]
      if (!xScale || !yScale) return { nodes: [] }
      const cy = yScale.map(baseline)

      return {
        nodes: times.map(time => {
          const cx = xScale.map(time)
          return {
            kind: "area" as const,
            key: `note-${time}`,
            points: [
              [cx, cy - NOTE_RADIUS],
              [cx + NOTE_RADIUS, cy],
              [cx, cy + NOTE_RADIUS],
              [cx - NOTE_RADIUS, cy],
            ],
            style: { fill: color, stroke: "var(--color-surface)", strokeWidth: 1.5 },
          }
        }),
      }
    },
  }))
}

export interface TimeSeriesChartProps extends Omit<ComponentProps<"div">, "children"> {
  data: TimeSeriesPoint[]
  /**
   * The series name, shown in the tooltip. Under `series` it is the chart's accessible name
   * instead; each line carries its own label.
   */
  label: string
  /**
   * The chart's accessible name, where `label` (the series name in the tooltip) says too little
   * on its own: "Clicks over the last 30 days".
   */
  "aria-label"?: string
  /**
   * Series colour; one of the `--color-chart-*` tokens.
   */
  color?: string
  /**
   * Multi-series mode: one line per entry, read from `point.values[key]`, all on the value
   * axis. Draws no gradient and no `previous` line; lists every line in the tooltip, largest
   * first, and a legend of totals above the plot. Meant for up to three lines.
   */
  series?: TimeSeriesSeries[]
  /**
   * Whether the legend sums each line over the range. Off for a metric that does not add up
   * across buckets (a rate, an average duration), where the legend names the lines alone.
   */
  seriesTotals?: boolean
  /**
   * Value-axis tick, usually compact ("5.9K"). The chart builds no formatter of its own: the
   * app supplies every reading, so the axis follows the same locale and time zone as the
   * figures around it.
   */
  formatTick: (value: number) => string
  /**
   * Tooltip value, usually grouped ("5,912").
   */
  formatValue: (value: number) => string
  /**
   * Date-axis tick, usually short ("Sep 6").
   */
  formatDate: (date: Date) => string
  /**
   * A note's day in the tooltip; `formatDate` by default. Set it where `formatDate` follows
   * the bucket size and drops the day on a monthly axis.
   */
  formatNoteDate?: (date: Date) => string
  /**
   * Tooltip heading, usually long ("September 6, 2026").
   */
  formatTooltipDate: (date: Date) => string
  /**
   * A fixed scale (a rate pinned to `[0, 100]`) instead of a rounded top over the data.
   */
  domain?: [number, number]
  /**
   * Line shape: a smooth curve through the points by default, or straight segments between
   * them (`"linear"`) so each bucket reads as a corner.
   */
  curve?: "smooth" | "linear"
  /**
   * The line through `value` (default), or the `bar` series alone (`"bar"`) at full scale on
   * the left axis: a sum per bucket, such as money, rather than a level. As the chart, a
   * compared period (`previous`, in the bar's unit) is a hatched bar beside each one. The bar
   * element is the same either way, so switching morphs the bars instead of redrawing them.
   */
  shape?: "line" | "bar"
  /**
   * The bar series' name (tooltip and legend); shown when any point carries a `bar`.
   */
  barLabel?: string
  /** The outline series' name (tooltip); shown when any point carries an `outline`. */
  outlineLabel?: string
  /**
   * Bar colour; one of the `--color-chart-*` tokens.
   */
  barColor?: string
  /**
   * Bar-axis tick, on the left; `formatTick` by default.
   */
  formatBarTick?: (value: number) => string
  /**
   * Bar tooltip value; `formatValue` by default.
   */
  formatBarValue?: (value: number) => string
  /**
   * Notes pinned to dates; drawn as markers on the baseline of the bucket that holds them and
   * listed in that bucket's tooltip.
   */
  notes?: TimeSeriesNote[]
  /**
   * Marker and tooltip colour for notes; one of the `--color-chart-*` tokens.
   */
  noteColor?: string
  /**
   * The exclusive end of the bucket starting at `date`. Only the trailing bucket needs it,
   * since every other bucket ends where the next begins, and only because a month bucket's
   * width can't be read off the series; without it the last bucket is as wide as the one
   * before.
   */
  bucketEnd?: (date: Date) => Date
  /**
   * Called with the clicked bucket's date and exclusive end. The cursor turns into a pointer
   * when set.
   */
  onPointClick?: (date: Date, end: Date) => void
  /**
   * What a click on the plot does, said at the foot of the tooltip; shown only with
   * `onPointClick`.
   */
  pointClickHint?: string
  /**
   * Draw no value labels, on either side, and let the data run to the plot's edges. The grid
   * stays. For a plot too narrow to give the labels their room.
   */
  hideValueAxis?: boolean
}

/**
 * A value tick with no label. The axis itself stays, because the grid lines follow its ticks.
 */
function formatNoTick() {
  return ""
}

/**
 * The single time series: a smooth gradient area with a right-hand value axis on round grid
 * lines and evenly spaced date ticks along the bottom. A compared period draws as a dashed
 * line in the same hue. Notes pinned to dates mark their bucket on the baseline and list
 * themselves in its tooltip. With `series` set it is several plain lines on that same axis,
 * under a legend of totals.
 */
export function TimeSeriesPlot({
  data,
  label,
  color = DEFAULT_COLOR,
  series,
  seriesTotals = true,
  formatTick,
  formatValue,
  formatDate,
  formatNoteDate = formatDate,
  formatTooltipDate,
  domain,
  curve = "smooth",
  shape = "line",
  barLabel = "",
  outlineLabel = "",
  barColor = BAR_COLOR,
  formatBarTick = formatTick,
  formatBarValue = formatValue,
  notes = [],
  noteColor = NOTE_COLOR,
  bucketEnd,
  onPointClick,
  pointClickHint,
  hideValueAxis = false,
  className,
  "aria-label": accessibleName,
  ...props
}: TimeSeriesChartProps) {
  const asBars = shape === "bar"
  // The compared period's tooltip swatch: a dashed outline in the series' own hue, since a
  // swatch can show neither a hatched bar nor a dashed line.
  const previousColor = `color-mix(in oklab, ${barColor} 45%, transparent)`
  const hatchId = `hatch-${useId()}`
  // Every line with its colour settled, so the plot, the tooltip and the legend agree on it.
  const lines = (series ?? []).map((entry, index) => ({
    ...entry,
    color: entry.color ?? SERIES_COLORS[index % SERIES_COLORS.length] ?? DEFAULT_COLOR,
  }))
  const multi = lines.length > 0
  const compared = !multi && data.some(point => point.previous !== undefined)
  const hasOutline = data.some(isOutlined)
  // An outline rides the bars' scale, so a range that holds refunds and no sales still needs it.
  const hasBars = asBars || hasOutline || data.some(point => (point.bar ?? 0) > 0)
  // The plot mounts one render after the rest of the chart, in a render React can interrupt,
  // so the page's first render does not also build the chart's scene. Its box keeps its
  // height meanwhile, so nothing around it moves.
  const plotted = useDeferredValue(true, false)
  // The plot's width decides how many date labels fit; measured, since the chart fills
  // whatever card it sits in. The value labels sit inside the plot, so it spans the card.
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const plotWidth = useElementWidth(element, { deferred: false }) ?? 0
  // A compared bar chart pairs the earlier bucket's bar with this one inside each bucket.
  const pairs = asBars && compared
  // The data stops short of an edge that carries value labels: the right always, the left
  // only when the bars' own axis sits there. The end buckets sit further in by as far as
  // their bars reach, so the outermost bar, not its middle, lines up with the inset. The
  // bars are sized from the space between buckets, which the reach itself takes from, so it
  // is measured twice.
  const insetLeft = hasBars && !asBars && !hideValueAxis ? PLOT_INSET : 0
  const insetRight = hideValueAxis ? 0 : PLOT_INSET
  const times = data.map(point => point.date.getTime())
  const first = times[0] ?? 0
  const last = times[times.length - 1] ?? first
  // The renderer sizes bars from the closest two buckets, so a short month narrows them all.
  const closest = Math.min(...times.slice(1).map((time, index) => time - (times[index] ?? 0)))
  function reachAt(width: number) {
    if (!hasBars) return 0
    const bandwidth = last > first ? (BAR_SHARE * width * closest) / (last - first) : LONE_BANDWIDTH
    return measureBarReach(bandwidth, pairs)
  }
  const edgeSpan = plotWidth - insetLeft - insetRight
  const reach = reachAt(edgeSpan - reachAt(edgeSpan) * 2)
  const startOffset = insetLeft + reach
  const endOffset = insetRight + reach
  const bucketSpan = plotWidth - startOffset - endOffset
  // Labels are thinned to a pitch that fits the widest they are likely to run, read off the
  // first one: a minute's "30 min ago" needs more room than a day's "Sep 6". The end labels
  // sit under the end buckets, so the span between those holds them all.
  const firstDate = data[0]?.date
  const labelWidth = firstDate
    ? formatDate(firstDate).length * TICK_FONT_SIZE * TICK_CHARACTER_WIDTH
    : 0
  const tickPitch = Math.max(TICK_PITCH, labelWidth * 1.5)
  const tickCount = Math.max(2, Math.floor(bucketSpan / tickPitch) + 1)
  const previousLabel = `${label} (previous)`
  // A tap leaves the chart focused on the bucket it hit, and nothing on a touch screen ever
  // moves off it again, so lifting the finger dismisses the tooltip. After the tap's click
  // has run, which would otherwise focus the bucket again.
  const dismissTooltip = useRef<() => void>(undefined)
  const touched = useRef(false)
  function dismissAfterTouch() {
    if (touched.current) setTimeout(() => dismissTooltip.current?.(), 0)
  }
  function onLift(event: PointerEvent<HTMLDivElement>) {
    touched.current = event.pointerType !== "mouse"
    dismissAfterTouch()
  }

  const lastDate = data[data.length - 1]?.date
  const endOfLast = bucketEnd && lastDate ? bucketEnd(lastDate).getTime() : undefined
  // The tooltip reads a bucket's notes straight off the hovered point's row.
  const bucketed = bucketNotes(times, notes, endOfLast)
  const points: PlotPoint[] = data.map((point, index) => {
    const time = times[index] ?? 0
    // The bucket's end: the next bucket, or for the last one what `bucketEnd` says (else as
    // wide as the one before).
    const end = times[index + 1] ?? endOfLast ?? time + (time - (times[index - 1] ?? time))
    return { ...point, time, end, notes: bucketed.get(time) ?? [] }
  })
  const xTicks = pickTicks(times, Math.min(tickCount, points.length))
  const labels = new Map(xTicks.map(tick => [tick, formatDate(new Date(tick))]))
  // Grid, axis labels and the area's baseline: round lines over the data, or an explicit
  // domain split into equal intervals. Hidden behind the bars, so nothing to fit then. Every
  // line of a multi-series chart shares the one axis, so the scale spans them all.
  const values = asBars
    ? [0]
    : multi
      ? data.flatMap(point => lines.map(line => point.values?.[line.key] ?? 0))
      : data.flatMap(point => [
          point.value,
          ...(point.previous === undefined ? [] : [point.previous]),
        ])
  const max = Math.max(...values, 0)
  const totals = seriesTotals
    ? new Map(lines.map(line => [line.key, seriesTotal(data, line.key)]))
    : undefined
  const yTicks = domain
    ? domainTicks(domain)
    : niceTicks(max, { integer: values.every(Number.isInteger), format: formatTick })
  const [low, top] = domain ?? [0, yTicks[yTicks.length - 1] ?? 1]
  // The bar series rides its own left axis, over the same fixed intervals so both sets of labels
  // sit on the same grid lines. As an overlay its top is scaled to twice the tallest bar so the
  // bars fill about half the plot and read as a backdrop under the line, rather than towering
  // over it; as the main series it is the chart's scale.
  const bars = data.flatMap(point => [
    (point.bar ?? 0) + (point.outline ?? 0),
    ...(asBars && point.previous !== undefined ? [point.previous] : []),
  ])
  const barMax = Math.max(...bars, 0)
  const barTicks = niceTicks(asBars ? barMax : barMax * 2, {
    integer: bars.every(Number.isInteger),
    format: formatBarTick,
  })
  const barTop = barTicks[barTicks.length - 1] ?? 1

  /**
   * The hovered bucket's rows: the chart's own series first, its compared period under it, the
   * outline last, whatever the draw order. Several lines read largest first, so the tooltip's
   * order is the order the lines stack in at that point. A bucket that took no money and lost
   * none has no bar or outline row to report; a bar chart's own series stays whatever its value.
   */
  function tooltipItems(point: PlotPoint): ChartTooltipItem[] {
    const bar = point.bar ?? 0
    const outline = point.outline ?? 0
    const barRow: ChartTooltipItem[] =
      hasBars && (asBars || bar > 0)
        ? [
            {
              key: "bar",
              label: asBars ? label : barLabel,
              value: formatBarValue(bar),
              color: barColor,
            },
          ]
        : []

    if (multi) {
      const rows = lines
        .map(line => ({ line, value: point.values?.[line.key] ?? 0 }))
        .sort((a, b) => b.value - a.value)
        .map(({ line, value }) => ({
          key: line.key,
          label: line.label,
          value: formatValue(value),
          color: line.color,
        }))
      return [...rows, ...barRow]
    }

    const valueRow: ChartTooltipItem[] = asBars
      ? []
      : [{ key: "value", label, value: formatValue(point.value), color }]
    const previousRow: ChartTooltipItem[] =
      compared && point.previous !== undefined
        ? [
            {
              key: "previous",
              label: previousLabel,
              value: (asBars ? formatBarValue : formatValue)(point.previous),
              color: asBars ? previousColor : color,
              indicator: "outline",
            },
          ]
        : []
    const outlineRow: ChartTooltipItem[] =
      hasOutline && outline > 0
        ? [
            {
              key: "outline",
              label: outlineLabel,
              value: formatBarValue(outline),
              color: barColor,
              indicator: "outline",
            },
          ]
        : []

    return asBars
      ? [...barRow, ...previousRow, ...outlineRow]
      : [...valueRow, ...previousRow, ...barRow, ...outlineRow]
  }

  const curveFactory = curve === "smooth" ? curveMonotoneX : curveLinear
  const lineCurve = d3Curve(curveFactory)
  // The partial buckets at either end: the line reaches them dashed, on the same curve as the
  // solid part, and their bars are dashed outlines.
  const running = countRunning(data)
  const leading = countPartialStart(data)
  const split = running + leading > 0 ? splitCurve(curveFactory, running, leading) : undefined
  // The offsets are in pixels, so they are turned into time over the buckets' span.
  const span = Math.max(last - first, 1)
  const msPerPixel = bucketSpan > 0 ? span / bucketSpan : 0
  const timeDomain = [first - startOffset * msPerPixel, first + span + endOffset * msPerPixel]
  const pairLayout = group({
    scale: scaleBand<string>().domain(["previous", "bar"]).padding(PAIR_PADDING),
  })

  // Built on every render: the callers hand the chart fresh rows and formatters each time, so a
  // memo would never hold. A new definition rebuilds the scene, and keyed geometry that did not
  // change does not move.
  const definition = defineChart({
    marks: [
      // The area keeps the whole series' curve, so both parts of a split line run along its edge.
      ...(!asBars && !multi
        ? [
            areaY(points, {
              id: "area",
              x: "time",
              y1: low,
              y2: "value",
              fill: "url(#fill)",
              fillOpacity: 1,
              curve: lineCurve,
            }),
          ]
        : []),
      // The bars sit under the lines, so the line leads where the two cross.
      ...(pairs
        ? [
            barY(points, {
              id: "previous",
              x: "time",
              y1: 0,
              y2: point => point.previous ?? 0,
              z: () => "previous",
              yScale: "bar",
              fill: `url(#${hatchId})`,
              radius: [...BAR_RADIUS],
              maxThickness: BAR_MAX_WIDTH,
              layout: pairLayout,
            }),
          ]
        : []),
      // The outline spans the whole stack from zero, under the bar: the renderer grows a bar from
      // its `y1`, so one starting at the bar's top would float above a bar still in motion.
      ...(hasOutline
        ? [
            barY(points, {
              id: "outline",
              x: "time",
              y1: 0,
              y2: point => (point.bar ?? 0) + (point.outline ?? 0),
              z: () => "bar",
              yScale: "bar",
              fill: barColor,
              fillOpacity: 0.15,
              // The mark keeps every bucket, since it sizes its bars by their spacing, so a bucket
              // with nothing to outline hides its stroke.
              stroke: point => (isOutlined(point) ? barColor : "transparent"),
              strokeOpacity: 0.7,
              strokeDasharray: "3 2",
              strokeWidth: 1,
              // Inset by half the stroke, so the dashes sit inside the bar's width. A bar at its
              // cap is not inset, so the cap shrinks by the whole stroke.
              inset: 0.5,
              radius: [...BAR_RADIUS],
              maxThickness: BAR_MAX_WIDTH - 1,
              ...(pairs && { layout: pairLayout }),
            }),
          ]
        : []),
      ...(hasBars
        ? [
            // The card's colour under every bar, which is translucent, so a bar comes out one
            // colour whatever runs behind it: the area, a grid line, an outline's dashed sides.
            barY(points, {
              id: "bar-mask",
              x: "time",
              y1: 0,
              y2: point => (point.partial ? 0 : (point.bar ?? 0)),
              z: () => "bar",
              yScale: "bar",
              fill: "var(--color-surface)",
              radius: point => (isOutlined(point) ? 0 : [...BAR_RADIUS]),
              maxThickness: BAR_MAX_WIDTH,
              ...(pairs && { layout: pairLayout }),
            }),
            barY(points, {
              id: "bar",
              x: "time",
              y1: 0,
              y2: point => (point.partial ? 0 : (point.bar ?? 0)),
              z: () => "bar",
              yScale: "bar",
              fill: barColor,
              fillOpacity: 0.7,
              // Rounded on top, except where the outline stacks on it and rounds instead.
              radius: point => (isOutlined(point) ? 0 : [...BAR_RADIUS]),
              maxThickness: BAR_MAX_WIDTH,
              ...(pairs && { layout: pairLayout }),
            }),
            // A partial bucket's bar is a dashed outline, drawn as a refund's is, since its figure
            // covers only part of the bucket.
            ...(running + leading > 0
              ? [
                  barY(points, {
                    id: "bar-running",
                    x: "time",
                    y1: 0,
                    y2: point => (point.partial ? (point.bar ?? 0) : 0),
                    z: () => "bar",
                    yScale: "bar",
                    fill: barColor,
                    fillOpacity: 0.15,
                    // A running bucket with nothing in it yet draws nothing: a dashed stub on
                    // the baseline would read as a figure.
                    stroke: point =>
                      point.partial && (point.bar ?? 0) > 0 ? barColor : "transparent",
                    strokeOpacity: 0.7,
                    strokeDasharray: "3 2",
                    strokeWidth: 1,
                    inset: 0.5,
                    radius: [...BAR_RADIUS],
                    maxThickness: BAR_MAX_WIDTH - 1,
                    ...(pairs && { layout: pairLayout }),
                  }),
                ]
              : []),
          ]
        : []),
      ...(compared && !asBars
        ? [
            lineY(points, {
              id: "previous-line",
              x: "time",
              y: point => point.previous,
              stroke: color,
              strokeWidth: 1.5,
              strokeDasharray: "4 3",
              // The same hue behind the solid line, light enough to stay behind it and strong
              // enough to read as a line of its own: 70% keeps it above 3:1 on the card.
              strokeOpacity: 0.7,
              curve: lineCurve,
            }),
          ]
        : []),
      ...(!asBars && !multi
        ? [
            lineY(points, {
              id: "value",
              x: "time",
              y: "value",
              stroke: color,
              strokeWidth: 2,
              curve: split?.complete ?? lineCurve,
            }),
            ...(split
              ? [
                  lineY(points, {
                    id: "value-running",
                    x: "time",
                    y: "value",
                    stroke: color,
                    strokeWidth: 2,
                    strokeDasharray: "4 4",
                    curve: split.running,
                  }),
                ]
              : []),
          ]
        : []),
      ...lines.flatMap(line => [
        lineY(points, {
          id: `series-${line.key}`,
          x: "time",
          y: point => point.values?.[line.key] ?? 0,
          stroke: line.color,
          strokeWidth: 2,
          curve: split?.complete ?? lineCurve,
        }),
        ...(split
          ? [
              lineY(points, {
                id: `series-${line.key}-running`,
                x: "time",
                y: point => point.values?.[line.key] ?? 0,
                stroke: line.color,
                strokeWidth: 2,
                strokeDasharray: "4 4",
                curve: split.running,
              }),
            ]
          : []),
      ]),
      // The hover rule, drawn in mark order: over the lines and bars, under the dots. A
      // `crosshair` paints in a layer above every mark, dots included. The rule and dots jump to
      // the bucket with the tooltip rather than tweening after it.
      focusGuideX(points, {
        id: "rule",
        x: "time",
        y: () => low,
        match: "x",
        // Solid: a focus guide's rule is dashed by default.
        xRule: { stroke: "var(--chart-rule)", strokeOpacity: 1, strokeDasharray: "none" },
        motion: false,
        marker: false,
      }),
      // A dot on every line at the hovered bucket.
      ...(!asBars && !multi
        ? [
            focusGuideX(points, {
              id: "value-marker",
              x: "time",
              y: "value",
              match: "x",
              xRule: false,
              motion: false,
              marker: focusMarker(color),
            }),
          ]
        : []),
      ...(compared && !asBars
        ? [
            focusGuideX(points, {
              id: "previous-marker",
              x: "time",
              y: point => point.previous,
              match: "x",
              xRule: false,
              motion: false,
              marker: focusMarker(color),
            }),
          ]
        : []),
      ...lines.map(line =>
        focusGuideX(points, {
          id: `series-${line.key}-marker`,
          x: "time",
          y: point => point.values?.[line.key] ?? 0,
          match: "x",
          xRule: false,
          motion: false,
          marker: focusMarker(line.color),
        }),
      ),
      // Last, so the markers sit over the area they mark the baseline of. On the axis that
      // is shown: the bars' scale when they are the chart.
      noteMarkers([...bucketed.keys()], asBars ? 0 : low, asBars ? "bar" : "y", noteColor),
    ],
    scales: {
      // A continuous time axis, for bars too: the renderer sizes them from the space between
      // buckets, and a compared pair splits that space between its two bars.
      x: {
        scale: scaleLinear().domain(timeDomain),
        axis: {
          // Labels change place with the range or the shape; they snap there rather than
          // sliding across the plot.
          motion: false,
          line: false,
          ticks: {
            values: xTicks,
            size: 0,
            padding: 12,
            format: (time: number) => labels.get(time) ?? "",
          },
          tickLabels: {
            fontSize: TICK_FONT_SIZE,
            opacity: 1,
            thin: false,
            // With no inset on a side the date there would hang past the plot, so it lines up
            // with where the data starts or stops.
            anchor: ({ value }) => {
              if (value === first && !insetLeft) return "start"
              return value === last && !insetRight ? "end" : "middle"
            },
            dx: ({ value }) => {
              if (value === first && !insetLeft) return -reach
              return value === last && !insetRight ? reach : 0
            },
          },
        },
      },
      // The line's axis; hidden behind the bars, which carry their own on this side.
      y: {
        scale: scaleLinear().domain([low, top > low ? top : low + 1]),
        side: "right",
        grid: asBars ? false : GRID,
        axis: asBars
          ? false
          : {
              motion: false,
              line: false,
              ticks: {
                values: yTicks,
                size: 0,
                padding: 0,
                format: hideValueAxis ? formatNoTick : formatTick,
              },
              tickLabels: {
                fontSize: TICK_FONT_SIZE,
                opacity: 1,
                anchor: "end",
                dy: -LABEL_RISE,
                thin: false,
              },
            },
      },
      ...(hasBars && {
        bar: {
          channel: "y" as const,
          scale: scaleLinear().domain([0, barTop]),
          // Beside a line the bar's own scale sits opposite it; as the chart itself it takes
          // the side every other chart's values are read on.
          side: asBars ? ("right" as const) : ("left" as const),
          grid: asBars ? GRID : false,
          axis: {
            motion: false,
            line: false,
            ticks: {
              values: barTicks,
              size: 0,
              padding: 0,
              format: hideValueAxis ? formatNoTick : formatBarTick,
            },
            tickLabels: {
              fontSize: TICK_FONT_SIZE,
              opacity: 1,
              anchor: asBars ? ("end" as const) : ("start" as const),
              dy: -LABEL_RISE,
              thin: false,
            },
          },
        },
      }),
    },
    gradients: [
      {
        id: "fill",
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: AREA_FADE.map(stop => ({ ...stop, color })),
      },
    ],
    theme: {
      foreground: "var(--color-ink)",
      muted: "var(--color-ink-muted)",
      grid: "var(--color-edge)",
      background: "transparent",
    },
    // The value labels sit inside the plot, so neither side reserves room for them: an
    // authored side replaces the renderer's measured margin. The top leaves room for the
    // highest label, which rises above the top grid line.
    margin: { top: 8 + LABEL_RISE, right: 0, left: 0 },
    focus: "group-x",
    maxFocusDistance: Number.POSITIVE_INFINITY,
    focusRing: false,
    tooltip: {
      use: tooltip,
      // Pinned to the plot's top, a tooltip with notes grows past the card's bottom edge, and
      // the card clips its content. The top layer lets it overhang the card instead.
      portal,
      // A click runs the caller's action, so it never pins the tooltip.
      sticky: false,
      motion: false,
      anchor: { x: "value", y: "plot-top" },
      placement: ["bottom-right", "bottom-left"],
      offset: 12,
    },
  })

  return (
    <div
      ref={setElement}
      className={cn(
        // The hover rule, a quarter of the ink, darkens under a press on a chart that acts on one.
        "flex flex-col [--chart-rule:color-mix(in_oklab,var(--color-ink)_25%,transparent)]",
        onPointClick && "cursor-pointer active:[--chart-rule:var(--color-ink-secondary)]",
        className,
      )}
      {...props}
      onPointerUp={onLift}
      onPointerCancel={onLift}
    >
      {multi && <SeriesLegend series={lines} totals={totals} formatValue={formatValue} />}
      {/* The compared period's bars: diagonal hatching in the bars' colour, which reads as "the
          earlier one" beside a solid bar without a legend. A chart declares gradients but not
          patterns, so the pattern lives in its own empty SVG and the bars reach it by id. */}
      <svg aria-hidden className="absolute size-0">
        <defs>
          <pattern
            id={hatchId}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="5" height="5" fill={barColor} fillOpacity={0.12} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke={barColor}
              strokeWidth="1.5"
              strokeOpacity={0.55}
            />
          </pattern>
        </defs>
      </svg>
      {/* The plot runs to the SVG's edges, so the hovered dot on the first point and the
          note markers on the baseline would be clipped by the SVG box; let them overflow
          into the card's padding instead. The tooltip's own chrome is the panel inside it. */}
      {plotted ? (
        <RendererChart
          definition={definition}
          renderer={RENDERER}
          ariaLabel={accessibleName ?? label}
          height={PLOT_HEIGHT}
          className={cn(
            // A sideways drag scrubs through the buckets; an upright one still scrolls the page.
            "w-full touch-pan-y text-xs [&_svg]:overflow-visible",
            // The plot takes focus on a click as well as a key press, and Chrome then draws the
            // focus ring around all of it. Focus already shows as the guide and the tooltip on
            // the focused bucket, which a key press moves to straight away.
            "[&_svg]:outline-none",
            // Value labels set on even digits, so a column of figures lines up.
            "[&_[data-ts-key^=bar-tick-label]]:tabular-nums [&_[data-ts-key^=y-tick-label]]:tabular-nums",
            // Value labels sit over the plot; a card-coloured outline keeps them legible where
            // the line or a bar passes under them.
            "[&_[data-ts-key^=bar-tick-label]]:stroke-surface [&_[data-ts-key^=bar-tick-label]]:stroke-3 [&_[data-ts-key^=bar-tick-label]]:[paint-order:stroke] [&_[data-ts-key^=y-tick-label]]:stroke-surface [&_[data-ts-key^=y-tick-label]]:stroke-3 [&_[data-ts-key^=y-tick-label]]:[paint-order:stroke]",
            "[--ts-chart-tooltip-background:transparent] [--ts-chart-tooltip-border:none] [--ts-chart-tooltip-max-width:none] [--ts-chart-tooltip-padding:0] [--ts-chart-tooltip-shadow:none]",
          )}
          onSelect={point => {
            dismissAfterTouch()
            if (!point || !onPointClick) return
            onPointClick(point.datum.date, new Date(point.datum.end))
          }}
          renderTooltipBody={({ points: focused, dismiss }) => {
            dismissTooltip.current = dismiss
            const point = focused[0]?.datum
            if (!point) return null
            return (
              <ChartTooltipContent
                title={formatTooltipDate(point.date)}
                items={tooltipItems(point)}
                details={point.details}
                // Bounded rather than fixed: the floor keeps a bucket with no notes from
                // shrinking to its figures, the cap makes a note truncate rather than widen the
                // tooltip over the chart it reports on. Between the two it moves at most 32px
                // from one bucket to the next.
                className="min-w-48 max-w-56"
                footer={
                  <NotesFooter
                    notes={point.notes}
                    bucket={point.time}
                    end={point.end}
                    hint={onPointClick ? pointClickHint : undefined}
                    color={noteColor}
                    formatDate={formatNoteDate}
                  />
                }
              />
            )
          }}
        />
      ) : (
        <div className="w-full" style={{ height: PLOT_HEIGHT }} />
      )}
    </div>
  )
}
