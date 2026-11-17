import { describe, expect, test } from "bun:test"
import {
  bucketNotes,
  countPartialStart,
  countRunning,
  domainTicks,
  niceTicks,
  seriesTotal,
  type TimeSeriesPoint,
} from "./time-series"

/** A money axis over a series carried in minor units, as the dashboard formats it. */
function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value / 100)
}

/** A duration axis, which reads whole seconds whatever the value carries. */
function seconds(value: number) {
  return `${Math.floor(value)}s`
}

describe("niceTicks", () => {
  test("an empty series is a plain 0–4", () => {
    expect(niceTicks(0)).toEqual([0, 1, 2, 3, 4])
  })

  test("a series with no usable maximum is a plain 0–4", () => {
    expect(niceTicks(Number.NaN)).toEqual([0, 1, 2, 3, 4])
  })

  test("every series gets the same number of lines, whatever its scale", () => {
    for (const max of [1, 7, 440, 4800, 22_000]) {
      expect(niceTicks(max, { integer: true })).toHaveLength(5)
    }
  })

  test("a quiet series keeps whole numbers", () => {
    expect(niceTicks(1, { integer: true })).toEqual([0, 1, 2, 3, 4])
    expect(niceTicks(3, { integer: true })).toEqual([0, 1, 2, 3, 4])
  })

  test("a plain step wins where the data fills the scale it makes", () => {
    expect(niceTicks(100, { integer: true })).toEqual([0, 25, 50, 75, 100])
    expect(niceTicks(1800, { integer: true })).toEqual([0, 500, 1000, 1500, 2000])
  })

  test("a finer step is taken where a plain one leaves the plot a quarter empty", () => {
    // A step of 125 would top out at 500, leaving a tenth of the plot empty.
    expect(niceTicks(440, { integer: true })).toEqual([0, 120, 240, 360, 480])
    expect(niceTicks(22_000, { integer: true })).toEqual([0, 6000, 12_000, 18_000, 24_000])
  })

  test("a whole-number series never gets a fractional step", () => {
    // The 1.5 step that fits 5 best is out; the whole 2 stands, empty top quarter and all.
    expect(niceTicks(5)).toEqual([0, 1.5, 3, 4.5, 6])
    expect(niceTicks(5, { integer: true })).toEqual([0, 2, 4, 6, 8])
  })

  test("a fractional series keeps exact ticks", () => {
    expect(niceTicks(0.4)).toEqual([0, 0.1, 0.2, 0.3, 0.4])
  })

  test("no two ticks render the same label", () => {
    // Unlabelled, a four-cent series would take the 1.2 step its dollar labels collapse onto.
    expect(niceTicks(4, { integer: true, format: money })).toEqual([0, 1, 2, 3, 4])
    expect(niceTicks(4, { integer: true, format: money }).map(money)).toEqual([
      "$0",
      "$0.01",
      "$0.02",
      "$0.03",
      "$0.04",
    ])
  })

  test("where every step repeats a label, the plain one stands", () => {
    // Sub-second, so each tick floors to "0s" whatever the step; nothing to choose between
    // them.
    expect(niceTicks(0.4, { format: seconds })).toEqual([0, 0.1, 0.2, 0.3, 0.4])
  })
})

describe("domainTicks", () => {
  test("splits a fixed scale into four equal intervals", () => {
    expect(domainTicks([0, 100])).toEqual([0, 25, 50, 75, 100])
  })

  test("starts from the scale's own floor", () => {
    expect(domainTicks([20, 60])).toEqual([20, 30, 40, 50, 60])
  })
})

/** A note, written as a local instant so the buckets and the note share a timezone. */
function note(text: string, ...instant: [number, number, number, number?, number?]) {
  const [year, month, day, hour = 0, minute = 0] = instant
  return { date: new Date(year, month, day, hour, minute), text }
}

/** `count` bucket instants `stepMs` apart, from a local start. */
function buckets(start: Date, count: number, stepMs: number) {
  return Array.from({ length: count }, (_, i) => start.getTime() + i * stepMs)
}

/** The bucket at `index`, throwing rather than handing a test `undefined`. */
function at(list: number[], index: number) {
  const bucket = list[index]
  if (bucket === undefined) throw new Error(`No bucket at ${index}`)
  return bucket
}

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

/** Sep 7–13 2026, a Monday to a Sunday. */
const days = buckets(new Date(2026, 8, 7), 7, DAY)
/** Four Mondays from Sep 7 2026. */
const weeks = buckets(new Date(2026, 8, 7), 4, 7 * DAY)
/** Sep 7 2026, hour by hour. */
const hours = buckets(new Date(2026, 8, 7), 24, HOUR)

describe("bucketNotes", () => {
  test("a note on a bucket's own instant lands on it", () => {
    const launched = note("Launched", 2026, 8, 9)
    expect(bucketNotes(days, [launched])).toEqual(new Map([[at(days, 2), [launched]]]))
  })

  test("a note mid-week folds into its week's bucket", () => {
    const thursday = note("Press hit", 2026, 8, 10, 15)
    expect(bucketNotes(weeks, [thursday])).toEqual(new Map([[at(weeks, 0), [thursday]]]))
  })

  test("a note on the following Monday starts the next week's bucket", () => {
    const monday = note("Sale", 2026, 8, 14)
    expect(bucketNotes(weeks, [monday])).toEqual(new Map([[at(weeks, 1), [monday]]]))
  })

  test("on an hourly chart a note keeps to the hour it falls in", () => {
    const midnight = note("Deploy", 2026, 8, 7, 0)
    const afternoon = note("Outage", 2026, 8, 7, 13, 40)
    expect(bucketNotes(hours, [midnight, afternoon])).toEqual(
      new Map([
        [at(hours, 0), [midnight]],
        [at(hours, 13), [afternoon]],
      ]),
    )
  })

  test("a note before the first bucket is dropped", () => {
    expect(bucketNotes(days, [note("Earlier", 2026, 8, 6, 23, 59)])).toEqual(new Map())
  })

  test("the last bucket is as wide as the one before it", () => {
    const inside = note("Inside", 2026, 8, 13, 23)
    const past = note("Past the end", 2026, 8, 14)
    expect(bucketNotes(days, [inside, past])).toEqual(new Map([[at(days, 6), [inside]]]))
  })

  test("a given end sets the last bucket's width, so a 31-day month keeps its 31st", () => {
    // Apr 1 and May 1: the gap before the last bucket is 30 days, May has 31.
    const months = [new Date(2026, 3, 1).getTime(), new Date(2026, 4, 1).getTime()]
    const last = note("Month end", 2026, 4, 31, 12)
    const june = note("Next month", 2026, 5, 1)
    const end = new Date(2026, 5, 1).getTime()
    expect(bucketNotes(months, [last, june])).toEqual(new Map())
    expect(bucketNotes(months, [last, june], end)).toEqual(new Map([[at(months, 1), [last]]]))
  })

  test("two notes on one bucket come back in input order", () => {
    const first = note("Deploy", 2026, 8, 9, 8)
    const second = note("Rollback", 2026, 8, 9, 18)
    expect(bucketNotes(days, [second, first])).toEqual(new Map([[at(days, 2), [second, first]]]))
  })

  test("a single-bucket series takes only a note on its exact instant", () => {
    const exact = note("Launched", 2026, 8, 7)
    const later = note("Later that day", 2026, 8, 7, 6)
    const only = [exact.date.getTime()]
    expect(bucketNotes(only, [exact, later])).toEqual(new Map([[at(only, 0), [exact]]]))
  })

  test("an empty series holds no notes", () => {
    expect(bucketNotes([], [note("Launched", 2026, 8, 7)])).toEqual(new Map())
  })
})

describe("seriesTotal", () => {
  const data: TimeSeriesPoint[] = [
    { date: new Date(2026, 8, 7), value: 0, values: { visitors: 10, pageviews: 25 } },
    { date: new Date(2026, 8, 8), value: 0, values: { visitors: 5, pageviews: 12 } },
    { date: new Date(2026, 8, 9), value: 0, values: { visitors: 7 } },
  ]

  test("sums one series over the range", () => {
    expect(seriesTotal(data, "visitors")).toBe(22)
  })

  test("a point without the key counts as zero", () => {
    expect(seriesTotal(data, "pageviews")).toBe(37)
  })

  test("an unknown series totals zero", () => {
    expect(seriesTotal(data, "sessions")).toBe(0)
  })

  test("a single-series point has no values to sum", () => {
    expect(seriesTotal([{ date: new Date(2026, 8, 7), value: 9 }], "visitors")).toBe(0)
  })
})

describe("countRunning", () => {
  function point(day: number, partial?: boolean): TimeSeriesPoint {
    return { date: new Date(2026, 8, day), value: day, partial }
  }

  test("counts the running buckets at the end of the series", () => {
    expect(countRunning([point(7), point(8), point(9, true)])).toBe(1)
    expect(countRunning([point(7), point(8, true), point(9, true)])).toBe(2)
  })

  test("a series that ends on a finished bucket has none running", () => {
    expect(countRunning([point(7), point(8, true), point(9)])).toBe(0)
  })

  test("a series where every bucket runs counts them all", () => {
    expect(countRunning([point(7, true), point(8, true)])).toBe(2)
  })

  test("an empty series has none running", () => {
    expect(countRunning([])).toBe(0)
  })
})

describe("countPartialStart", () => {
  function point(day: number, partial?: boolean): TimeSeriesPoint {
    return { date: new Date(2026, 8, day), value: day, partial }
  }

  test("counts the partial buckets at the start of the series", () => {
    expect(countPartialStart([point(7, true), point(8), point(9, true)])).toBe(1)
    expect(countPartialStart([point(7), point(8), point(9, true)])).toBe(0)
  })

  test("leaves the running buckets at the end to countRunning", () => {
    expect(countPartialStart([point(7, true), point(8, true)])).toBe(0)
  })
})
