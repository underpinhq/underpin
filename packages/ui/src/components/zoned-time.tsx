"use client"

import { formatExactAgo, formatZonedStamps } from "../lib/day"
import { RelativeTime, type RelativeTimeProps } from "./relative-time"

export interface ZonedTimeProps extends Omit<RelativeTimeProps, "tooltip" | "stamps"> {
  /**
   * The clock the page prints its stamps on, such as a site's or an account's. The hover lists
   * it between UTC and the reader's own clock.
   */
  timeZone?: string
}

interface ExactAgoProps extends Pick<ZonedTimeProps, "date"> {}

/** How long ago, counted as the tooltip opens, so a page left open still reads true. */
function ExactAgo({ date }: ExactAgoProps) {
  return formatExactAgo(date)
}

/**
 * When something happened, with every clock it is worth reading on under the hover: how long
 * ago to the second ("3 hours, 48 minutes, 11 seconds ago"), then the same instant on UTC, on
 * `timeZone`, and on the reader's own clock, leaving out a clock that reads the same as one
 * above it. For a stamp a reader may need to match against a server log or a colleague in
 * another zone. The children are the short reading, how long ago by default.
 */
export function ZonedTime({ date, timeZone, locale, hourCycle, ...props }: ZonedTimeProps) {
  return (
    <RelativeTime
      date={date}
      timeZone={timeZone}
      locale={locale}
      hourCycle={hourCycle}
      tooltip={<ExactAgo date={date} />}
      stamps={formatZonedStamps(date, { timeZone, locale, hourCycle })}
      {...props}
    />
  )
}
