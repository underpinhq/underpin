import type { ChartCurve } from "@tanstack/charts"
import { d3Curve } from "@tanstack/charts/d3/shape"
import { type CurveFactory, line } from "d3-shape"

type Point = readonly [number, number]

/** A coordinate as d3 writes it into a path: three decimals. */
function round(value: number) {
  return Math.round(value * 1000) / 1000
}

/**
 * The path of a line through every point, as `factory` bends it, keeping only the segments `keep`
 * accepts: the segment from point `index` to the next is `index`, out of `count`. A run of kept
 * segments starts where its first segment starts, so it carries the tangents the whole line has
 * there rather than bending as a line of its own would.
 */
function drawSegments(
  points: readonly Point[],
  factory: CurveFactory,
  keep: (index: number, count: number) => boolean,
) {
  const count = Math.max(points.length - 1, 0)
  let path = ""
  let index = 0
  let open = false
  // Where the last segment ended, which is where the next one starts.
  let currentX = 0
  let currentY = 0

  function draw(command: string, endX: number, endY: number) {
    if (keep(index, count)) {
      if (!open) path += `M${round(currentX)},${round(currentY)}`
      path += command
      open = true
    } else {
      open = false
    }
    index += 1
    currentX = endX
    currentY = endY
  }

  // A canvas context in shape only: the curve draws into it, and it writes the path's commands.
  const context = {
    moveTo(toX: number, toY: number) {
      currentX = toX
      currentY = toY
      open = false
    },
    lineTo(toX: number, toY: number) {
      draw(`L${round(toX)},${round(toY)}`, toX, toY)
    },
    bezierCurveTo(x1: number, y1: number, x2: number, y2: number, toX: number, toY: number) {
      const values = [x1, y1, x2, y2, toX, toY].map(round).join(",")
      draw(`C${values}`, toX, toY)
    },
    closePath() {},
  }

  line<Point>()
    .x(point => point[0])
    .y(point => point[1])
    .curve(factory)
    .context(context as unknown as CanvasRenderingContext2D)(points)

  return path
}

/**
 * One curve split around a series' partial buckets: `complete` draws the line between the
 * finished buckets, and `running` the first `leadingBuckets` segments and the last
 * `runningBuckets`. Both trace the curve the whole series makes, so the parts meet on one
 * tangent and run along the edge of an area drawn under the whole series; parts drawn as series
 * of their own would each bend on their own. The area of both is the whole series' area.
 */
export function splitCurve(
  factory: CurveFactory,
  runningBuckets: number,
  leadingBuckets = 0,
): { complete: ChartCurve; running: ChartCurve } {
  const whole = d3Curve(factory)

  function isComplete(index: number, count: number) {
    return index >= leadingBuckets && index < count - runningBuckets
  }

  return {
    complete: {
      line: points => drawSegments(points, factory, isComplete),
      area: whole.area,
    },
    running: {
      line: points => drawSegments(points, factory, (index, count) => !isComplete(index, count)),
      area: whole.area,
    },
  }
}
