import { describe, expect, test } from "bun:test"
import {
  formatAgo,
  formatDayAgo,
  formatDaysAway,
  formatExactAgo,
  formatMoment,
  formatZonedStamps,
} from "./day"

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const NOW = new Date("2026-09-20T16:58:20.000Z")

/** The instant `offset` milliseconds from `NOW`; negative is the past. */
function at(offset: number) {
  return new Date(NOW.getTime() + offset)
}

describe("formatAgo", () => {
  test("reads as now within ten seconds, then counts in the largest unit", () => {
    const options = { locale: "en-US", now: NOW }

    expect(formatAgo(at(-4 * SECOND), options)).toBe("now")
    expect(formatAgo(at(-45 * SECOND), options)).toBe("45 seconds ago")
    expect(formatAgo(at(-3 * HOUR), options)).toBe("3 hours ago")
    expect(formatAgo(at(-DAY), options)).toBe("1 day ago")
    expect(formatAgo(at(3 * DAY), options)).toBe("in 3 days")
    expect(formatAgo(at(-400 * DAY), options)).toBe("1 year ago")
  })

  test("speaks the language it is given", () => {
    expect(formatAgo(at(-3 * HOUR), { locale: "de", now: NOW })).toBe("vor 3 Stunden")
  })

  test("abbreviates the unit in the short style", () => {
    const options = { locale: "en-US", now: NOW, style: "short" } as const

    expect(formatAgo(at(-4 * SECOND), options)).toBe("now")
    expect(formatAgo(at(-3 * HOUR), options)).toBe("3 hr. ago")
    expect(formatAgo(at(5 * MINUTE), options)).toBe("in 5 min.")
  })

  test("refuses a calendar day, which would read as UTC midnight", () => {
    expect(() => formatAgo("2026-09-20", { now: NOW })).toThrow(/calendar day/)
    expect(formatAgo("2026-09-20T16:58:00.000Z", { locale: "en-US", now: NOW })).toBe(
      "20 seconds ago",
    )
  })
})

describe("formatDayAgo", () => {
  test("counts calendar days, whatever the hour", () => {
    const options = { locale: "en-US", today: "2026-09-20" }

    expect(formatDayAgo("2026-09-20", options)).toBe("today")
    expect(formatDayAgo("2026-09-19", options)).toBe("yesterday")
    expect(formatDayAgo("2026-09-17", options)).toBe("3 days ago")
    expect(formatDayAgo("2026-09-21", options)).toBe("tomorrow")
    expect(formatDayAgo("2026-09-23", options)).toBe("in 3 days")
  })

  test("counts across a month and a daylight saving change", () => {
    expect(formatDayAgo("2026-10-26", { locale: "en-US", today: "2026-11-02" })).toBe("7 days ago")
  })
})

describe("formatDaysAway", () => {
  test("gives the calendar days with no direction", () => {
    const options = { locale: "en-US", today: "2026-09-20" }

    expect(formatDaysAway("2026-09-23", options)).toBe("3 days")
    expect(formatDaysAway("2026-09-21", options)).toBe("1 day")
    expect(formatDaysAway("2026-09-17", options)).toBe("3 days")
  })
})

describe("formatExactAgo", () => {
  test("spells how long ago in its three largest units", () => {
    expect(formatExactAgo(at(0), { now: NOW })).toBe("just now")
    expect(formatExactAgo(at(-45 * SECOND), { now: NOW })).toBe("45 seconds ago")
    expect(formatExactAgo(at(-(3 * HOUR + 48 * MINUTE + 11 * SECOND)), { now: NOW })).toBe(
      "3 hours, 48 minutes, 11 seconds ago",
    )
    expect(formatExactAgo(at(-(HOUR + 2 * SECOND)), { now: NOW })).toBe("1 hour, 2 seconds ago")

    // Every unit down to seconds would run to six of them on anything this old.
    const ancient = formatExactAgo(at(-(1200 * DAY + 5 * HOUR + 9 * MINUTE + 2 * SECOND)), {
      now: NOW,
    })
    expect(ancient).toMatch(/^3 years, /)
    expect(ancient.split(", ")).toHaveLength(3)
  })

  test("an instant ahead of the reader's clock reads as just now", () => {
    // A server stamps the instant, so a clock running behind it sees the span run backwards.
    expect(formatExactAgo(at(3 * SECOND), { now: NOW })).toBe("just now")
    expect(formatExactAgo(at(4 * MINUTE), { now: NOW })).toBe("just now")
  })
})

describe("formatMoment", () => {
  test("prints the full moment on the clock it is given", () => {
    expect(formatMoment(NOW, { locale: "en-US", timeZone: "UTC" })).toBe(
      "September 20, 2026 at 4:58 PM",
    )
    expect(formatMoment(NOW, { locale: "en-US", timeZone: "Asia/Tokyo" })).toBe(
      "September 21, 2026 at 1:58 AM",
    )
    expect(formatMoment(NOW, { locale: "en-US", timeZone: "UTC", hourCycle: "h23" })).toBe(
      "September 20, 2026 at 16:58",
    )
  })
})

describe("formatZonedStamps", () => {
  const reader = new Intl.DateTimeFormat().resolvedOptions().timeZone

  test("reads the instant on UTC, the page's clock and the reader's", () => {
    const stamps = formatZonedStamps(NOW, {
      locale: "en-US",
      timeZone: "Asia/Kolkata",
      hourCycle: "h12",
    })

    expect(stamps[0]).toEqual({ label: "UTC", date: "September 20, 2026", clock: "04:58:20 PM" })
    expect(stamps[1]).toEqual({
      label: "GMT+5:30",
      date: "September 20, 2026",
      clock: "10:28:20 PM",
    })
    // The reader's clock is listed only when it reads differently from both.
    expect(stamps).toHaveLength(["UTC", "Asia/Kolkata"].includes(reader) ? 2 : 3)
  })

  test("reads each clock in the cycle it is given", () => {
    const [utc] = formatZonedStamps(NOW, { locale: "en-US", hourCycle: "h23" })
    expect(utc?.clock).toBe("16:58:20")
  })

  test("leaves out a clock that reads the same as one above it", () => {
    const stamps = formatZonedStamps(NOW, { locale: "en-US", timeZone: reader })

    expect(stamps.map(stamp => stamp.label)[0]).toBe("UTC")
    expect(new Set(stamps.map(stamp => stamp.clock)).size).toBe(stamps.length)
    expect(stamps.length).toBeLessThanOrEqual(2)
  })
})
