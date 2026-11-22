"use client"

import { type ComponentProps, type ReactNode, useSyncExternalStore } from "react"
import { formatAgo, formatMoment, type MomentFormatOptions, type ZonedStamp } from "../lib/day"
import { Badge } from "./badge"
import { Tooltip } from "./tooltip"

/** One instant as a single clock reads it. */
export type RelativeTimeStamp = ZonedStamp

export interface RelativeTimeProps extends Omit<ComponentProps<"time">, "dateTime"> {
  /** The instant being reported on; ISO 8601, or a `Date`. */
  date: Date | string
  /**
   * What the hover says: the full date, or how long ago above a list of `stamps`. The full
   * moment on `timeZone`'s clock by default ("September 20, 2026 at 2:58 PM").
   */
  tooltip?: ReactNode
  /** The same instant on several clocks, one row each under `tooltip`. */
  stamps?: RelativeTimeStamp[]
  /** The clock the built-in readings are made on; the reader's own by default. */
  timeZone?: string
  /** The language of the built-in readings; the reader's own by default. */
  locale?: string
  /** The clock's cycle in the built-in readings (`"h23"`, `"h12"`); the language's own by default. */
  hourCycle?: MomentFormatOptions["hourCycle"]
}

interface MomentProps extends Pick<
  RelativeTimeProps,
  "date" | "timeZone" | "locale" | "hourCycle"
> {}

/** The full moment, formatted as the tooltip opens rather than on every render of the page. */
function Moment({ date, timeZone, locale, hourCycle }: MomentProps) {
  return formatMoment(date, { timeZone, locale, hourCycle })
}

const MINUTE_MS = 60_000

const clockListeners = new Set<() => void>()
let clockTimer: ReturnType<typeof setInterval> | undefined

/**
 * One timer for every stamp on the page, running while any is mounted: a page of a hundred
 * stamps wakes once a minute, not a hundred times.
 */
function subscribeClock(listener: () => void) {
  clockListeners.add(listener)
  clockTimer ??= setInterval(() => {
    for (const notify of clockListeners) notify()
  }, MINUTE_MS)

  return () => {
    clockListeners.delete(listener)
    if (clockListeners.size || clockTimer === undefined) return
    clearInterval(clockTimer)
    clockTimer = undefined
  }
}

/** The current minute, which is as often as a reading of how long ago needs to change. */
function readClock(): number | undefined {
  return Math.floor(Date.now() / MINUTE_MS)
}

/** No clock on the server, so a server render and the hydration after it agree. */
function readServerClock(): number | undefined {
  return
}

/**
 * How long ago, once the page runs in the browser, read again every minute so a page left open
 * stays true. A server render, and the hydration that must agree with it, print the full
 * moment instead, on `timeZone` (UTC by default) and in `locale` (US English by default): a
 * reading of how long ago made on the server would be frozen at the moment of the render, a
 * static page's build among them, and in the server's language.
 */
function Ago({ date, timeZone, locale, hourCycle }: MomentProps) {
  const minute = useSyncExternalStore(subscribeClock, readClock, readServerClock)

  if (minute === undefined) {
    return formatMoment(date, {
      locale: locale ?? "en-US",
      timeZone: timeZone ?? "UTC",
      hourCycle,
    })
  }

  return formatAgo(date, { locale })
}

/**
 * A moment printed short, with the exact one on hover. The children are the short reading, how
 * long ago in the reader's language by default ("3 hours ago"); pass your own for another
 * ("14:32:05", "Oct 12"). `tooltip` is the long one. For a stamp that has to stay short on the
 * page (a feed row, a log line), where the exact moment is worth one hover but not one column.
 */
export function RelativeTime({
  date,
  tooltip,
  stamps,
  timeZone,
  locale,
  hourCycle,
  children,
  ...props
}: RelativeTimeProps) {
  const time = (
    <time dateTime={new Date(date).toISOString()} {...props}>
      {children ?? <Ago date={date} timeZone={timeZone} locale={locale} hourCycle={hourCycle} />}
    </time>
  )
  const reading = tooltip ?? (
    <Moment date={date} timeZone={timeZone} locale={locale} hourCycle={hourCycle} />
  )

  if (!stamps?.length) return <Tooltip tooltip={reading}>{time}</Tooltip>

  return (
    <Tooltip
      variant="rich"
      side="right"
      tooltip={
        <>
          {/* The date carries the weight: it is what a reader came for. How long ago frames
              it and the clock qualifies it, so both sit back a shade. */}
          <div className="text-ink-muted">{reading}</div>

          <div className="mt-2.5 flex flex-col gap-1.5">
            {stamps.map(stamp => (
              // The date hangs off its own zone rather than a column the two rows share, so a
              // wider label pushes its date along instead of indenting both. The clocks still
              // end together, which is where a pair of them is read.
              <div key={stamp.label} className="flex items-center gap-2 whitespace-nowrap">
                <Badge size="sm" className="font-mono">
                  {stamp.label}
                </Badge>
                <span>{stamp.date}</span>
                <span className="ml-auto pl-4 font-mono text-ink-muted tabular-nums">
                  {stamp.clock}
                </span>
              </div>
            ))}
          </div>
        </>
      }
      // Wider than a rich tooltip's own ceiling: two zones, two dates and two clocks on one
      // line each, and the longer label must not fold its date onto a second line.
      className="max-w-sm"
    >
      {time}
    </Tooltip>
  )
}
