import { isDevelopment } from "./env"

/** A calendar day as "YYYY-MM-DD", with no time of day. */
export const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Throws in development on a bare "YYYY-MM-DD": a reading of how long ago takes an instant,
 * and a day key parses as UTC midnight, which miscounts the day for every reader away from
 * Greenwich near midnight. A day goes through `formatDayAgo` instead.
 */
export function assertInstant(date: Date | string) {
  if (typeof date !== "string" || !DAY_KEY.test(date) || !isDevelopment()) return
  throw new Error(`"${date}" is a calendar day, not an instant: read it with formatDayAgo.`)
}
