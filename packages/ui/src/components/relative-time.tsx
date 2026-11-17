"use client"

import type { ComponentProps, ReactNode } from "react"
import { Badge } from "./badge"
import { Tooltip } from "./tooltip"

/** One instant as a single clock reads it. */
export interface RelativeTimeStamp {
  /** The clock's name: "UTC", "GMT+2". */
  label: string
  /** The day on that clock: "September 20, 2026". */
  date: string
  /** The time on that clock: "04:58:20 PM". */
  clock: string
}

export interface RelativeTimeProps extends Omit<ComponentProps<"time">, "dateTime"> {
  /** The instant being reported on; ISO 8601, or a `Date`. */
  date: Date | string
  /** What the hover says: the full date, or how long ago above a list of `stamps`. */
  tooltip: ReactNode
  /** The same instant on several clocks, one row each under `tooltip`. */
  stamps?: RelativeTimeStamp[]
}

/**
 * A moment printed short, with the exact one on hover. The caller formats every string, as this
 * package formats no dates: the children are the short reading ("2 months ago", "14:32:05"), and
 * `tooltip` is the long one. For a stamp that has to stay short on the page (a feed row, a log
 * line), where the exact moment is worth one hover but not one column.
 */
export function RelativeTime({ date, tooltip, stamps, ...props }: RelativeTimeProps) {
  const time = <time dateTime={new Date(date).toISOString()} {...props} />

  if (!stamps?.length) return <Tooltip tooltip={tooltip}>{time}</Tooltip>

  return (
    <Tooltip
      variant="rich"
      side="right"
      tooltip={
        <>
          {/* The date carries the weight: it is what a reader came for. How long ago frames
              it and the clock qualifies it, so both sit back a shade. */}
          <div className="text-ink-muted">{tooltip}</div>

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
