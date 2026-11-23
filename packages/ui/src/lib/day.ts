import { isDevelopment } from "./env"
import { assertInstant, DAY_KEY } from "./instant"
import { dateFormat, numberFormat, relativeFormat } from "./intl"

/**
 * A calendar day as "YYYY-MM-DD" — the shape `<input type="date">` uses, and the one a date
 * without a time of day should travel in. Turning it into a `Date` at *local* midnight keeps
 * the day intact: parsing the string directly reads it as UTC, which lands on the day before
 * anywhere west of Greenwich.
 */
export function dayToDate(day: string | undefined): Date | undefined {
  const [year, month, date] = (day ?? "").split("-").map(Number)
  return year && month && date ? new Date(year, month - 1, date) : undefined
}

/** The inverse of `dayToDate`, reading the date's own calendar fields rather than its instant. */
export function dateToDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

// The readings below turn an instant, or a calendar day, into text for a person: how long ago
// it was, the full moment, and the same moment on several clocks. Every one takes the language
// as `locale`, and a reading made on a clock takes that clock as `timeZone` (both the reader's
// own by default).

export interface MomentFormatOptions {
  /** A BCP 47 language tag; the reader's own when left out. */
  locale?: string
  /** An IANA zone ("Europe/Warsaw") the reading is made on; the reader's own when left out. */
  timeZone?: string
  /**
   * The clock's cycle: `"h23"` for a 24-hour clock, `"h12"` for one with AM and PM. The
   * language's own when left out.
   */
  hourCycle?: Intl.DateTimeFormatOptions["hourCycle"]
}

/**
 * How a unit is written: `"long"` spells it out ("3 hours ago"), `"short"` abbreviates it in
 * the language's own way ("3 hr. ago") for a line that shares its width with other text.
 */
export type AgoStyle = "long" | "short"

export interface AgoFormatOptions {
  /** A BCP 47 language tag; the reader's own when left out. */
  locale?: string
  /** The moment the reading is made against; the current one when left out. */
  now?: Date
  /** How the unit is written; spelled out when left out. */
  style?: AgoStyle
}

export interface DayAgoFormatOptions {
  /** A BCP 47 language tag; the reader's own when left out. */
  locale?: string
  /** The day the reading is made on, as "YYYY-MM-DD"; the reader's own today when left out. */
  today?: string
  /** How the unit is written; spelled out when left out. */
  style?: AgoStyle
}

/** One instant as a single clock reads it. */
export interface ZonedStamp {
  /** The clock's name: "UTC", "GMT+2". */
  label: string
  /** The day on that clock: "September 20, 2026". */
  date: string
  /** The time on that clock: "04:58:20 PM", or "16:58:20" on a 24-hour clock. */
  clock: string
}

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Closer to now than this reads as now, since "0 seconds ago" reads as a glitch. */
const NOW_MS = 10 * SECOND_MS

/** Whole calendar days from one day key to another; negative when `to` comes first. */
function countDays(from: string, to: string) {
  if (isDevelopment() && !(DAY_KEY.test(from) && DAY_KEY.test(to))) {
    throw new Error(`Expected two "YYYY-MM-DD" days, got "${from}" and "${to}".`)
  }
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/**
 * The largest unit a span reaches, each counted in whole rounded units: seconds under a minute,
 * minutes under an hour, hours under a day, days under 30, months under 12, then years.
 */
function pickAgoUnit(elapsed: number): [number, Intl.RelativeTimeFormatUnit] {
  const seconds = Math.round(elapsed / SECOND_MS)
  if (Math.abs(seconds) < 60) return [seconds, "second"]
  const minutes = Math.round(elapsed / MINUTE_MS)
  if (Math.abs(minutes) < 60) return [minutes, "minute"]
  const hours = Math.round(elapsed / HOUR_MS)
  if (Math.abs(hours) < 24) return [hours, "hour"]
  const days = Math.round(elapsed / DAY_MS)
  if (Math.abs(days) < 30) return [days, "day"]
  const months = Math.round(elapsed / (DAY_MS * 30.4375))
  if (Math.abs(months) < 12) return [months, "month"]
  return [Math.round(elapsed / (DAY_MS * 365.25)), "year"]
}

/**
 * How far an instant is from now, in its largest unit: "3 hours ago", "in 2 days", or "3 hr.
 * ago" in the short style. Within ten seconds of now it is the language's own word for now.
 * It takes an instant (ISO 8601 with a time, or a `Date`); a calendar day goes through
 * `formatDayAgo`.
 */
export function formatAgo(
  date: Date | string,
  { locale, now = new Date(), style = "long" }: AgoFormatOptions = {},
) {
  assertInstant(date)
  const elapsed = new Date(date).getTime() - now.getTime()

  if (Math.abs(elapsed) < NOW_MS) {
    return relativeFormat(locale, { numeric: "auto", style }).format(0, "second")
  }

  const [value, unit] = pickAgoUnit(elapsed)
  return relativeFormat(locale, { numeric: "always", style }).format(value, unit)
}

/**
 * How far a calendar day ("YYYY-MM-DD") is from today, counted on the calendar: "today",
 * "yesterday", "in 2 days", "3 days ago". For a reading kept by the day, or one printed beside
 * a date, where counting an instant's hours would land a day off around midnight.
 */
export function formatDayAgo(
  day: string,
  { locale, today = dateToDay(new Date()), style = "long" }: DayAgoFormatOptions = {},
) {
  return relativeFormat(locale, { numeric: "auto", style }).format(countDays(today, day), "day")
}

/**
 * How many calendar days a day ("YYYY-MM-DD") is from today, with no direction: "3 days",
 * "1 day". For a "… left" figure, counted like `formatDayAgo` so the two never disagree.
 */
export function formatDaysAway(
  day: string,
  { locale, today = dateToDay(new Date()), style = "long" }: DayAgoFormatOptions = {},
) {
  return numberFormat(locale, { style: "unit", unit: "day", unitDisplay: style }).format(
    Math.abs(countDays(today, day)),
  )
}

/** The full moment on one clock: "September 20, 2026 at 2:58 PM". */
export function formatMoment(
  date: Date | string,
  { locale, timeZone, hourCycle }: MomentFormatOptions = {},
) {
  return dateFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
    hourCycle,
  }).format(new Date(date))
}

/** `date` moved by whole calendar months, held on the last day of a shorter month. */
function addMonths(date: Date, months: number) {
  const moved = new Date(date)
  const day = moved.getDate()
  moved.setDate(1)
  moved.setMonth(moved.getMonth() + months)
  const lastDay = new Date(moved.getFullYear(), moved.getMonth() + 1, 0).getDate()
  moved.setDate(Math.min(day, lastDay))
  return moved
}

/** The whole calendar months from `start` to `end`, which must not come before it. */
function countMonths(start: Date, end: Date) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (addMonths(start, months) > end) months--
  return months
}

/** The local midnight that opens an instant's day, in milliseconds. */
function startOfDay(instant: Date) {
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate()).getTime()
}

/** The units a span is spelled in, largest first, each with its English names. */
const SPAN_UNITS = [
  ["year", "years"],
  ["month", "months"],
  ["day", "days"],
  ["hour", "hours"],
  ["minute", "minutes"],
  ["second", "seconds"],
] as const

/**
 * How long ago, in the three largest units that are not zero: "3 hours, 48 minutes, 11 seconds
 * ago", "4 years, 6 months, 6 days ago". One rounded unit reads alike for a run of stamps
 * seconds apart, and every unit down to seconds is a sentence rather than a reading. Years and
 * months count on the calendar. The sentence is English, like the package's other built-in
 * text, since no `Intl` formatter phrases a span of several units relative to now. An instant
 * under a second ago, or ahead of `now`, reads "just now".
 */
export function formatExactAgo(
  date: Date | string,
  { now = new Date() }: Pick<AgoFormatOptions, "now"> = {},
) {
  const start = new Date(date)
  if (now.getTime() - start.getTime() < SECOND_MS) return "just now"

  const months = countMonths(start, now)
  // Whole days on the calendar, as months are, so a span across a daylight saving change
  // still counts the day it crossed as one.
  const cursor = addMonths(start, months)
  let days = Math.round((startOfDay(now) - startOfDay(cursor)) / DAY_MS)
  cursor.setDate(cursor.getDate() + days)
  if (cursor > now) {
    days--
    cursor.setDate(cursor.getDate() - 1)
  }
  let rest = now.getTime() - cursor.getTime()
  const hours = Math.floor(rest / HOUR_MS)
  rest -= hours * HOUR_MS
  const minutes = Math.floor(rest / MINUTE_MS)
  rest -= minutes * MINUTE_MS
  const counts = [
    Math.floor(months / 12),
    months % 12,
    days,
    hours,
    minutes,
    Math.floor(rest / SECOND_MS),
  ]

  const parts = SPAN_UNITS.flatMap(([one, many], index) => {
    const count = counts[index] ?? 0
    return count ? [`${count} ${count === 1 ? one : many}`] : []
  })

  return `${parts.slice(0, 3).join(", ")} ago`
}

/** A zone as a clock names it, "GMT+2", which is how a stamp says which one it is on. */
function formatZoneLabel(instant: Date, timeZone: string, locale?: string) {
  const parts = dateFormat(locale, {
    timeZoneName: "shortOffset",
    timeZone,
  }).formatToParts(instant)
  return parts.find(part => part.type === "timeZoneName")?.value ?? timeZone
}

/**
 * The clocks an instant is worth reading on: UTC, which every server logs in, `timeZone`, the
 * clock the page prints its stamps on (a site's or an account's), and the reader's own. A clock
 * that would print the same date and time as one already listed is left out, so a reader on the
 * page's own clock sees two rows rather than three saying the same thing, and UTC keeps its name
 * when the page happens to be on it.
 */
export function formatZonedStamps(
  date: Date | string,
  { locale, timeZone, hourCycle }: MomentFormatOptions = {},
): ZonedStamp[] {
  const instant = new Date(date)
  const reader = dateFormat(undefined).resolvedOptions().timeZone
  const zones = [
    { label: "UTC", timeZone: "UTC" },
    ...(timeZone ? [{ label: formatZoneLabel(instant, timeZone, locale), timeZone }] : []),
    { label: formatZoneLabel(instant, reader, locale), timeZone: reader },
  ]

  const stamps: ZonedStamp[] = []
  for (const zone of zones) {
    const stamp = {
      label: zone.label,
      date: dateFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: zone.timeZone,
      }).format(instant),
      clock: dateFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle,
        timeZone: zone.timeZone,
      }).format(instant),
    }
    if (!stamps.some(seen => seen.date === stamp.date && seen.clock === stamp.clock)) {
      stamps.push(stamp)
    }
  }

  return stamps
}
