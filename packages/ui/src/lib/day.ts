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
