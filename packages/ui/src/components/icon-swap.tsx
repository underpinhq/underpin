import type { ReactNode } from "react"
import { cn } from "../lib/variants"

interface IconSwapProps<T extends string> {
  /** The key of the mark on show. */
  value: T
  marks: Record<T, ReactNode>
  className?: string
}

const swap = [
  "col-start-1 row-start-1 grid place-items-center",
  "transition-[opacity,filter,scale] duration-200 ease-swap",
  "motion-reduce:transition-[opacity] motion-reduce:scale-100 motion-reduce:blur-none",
]
const shown = "scale-100 opacity-100 blur-none"
const hidden = "scale-[0.25] opacity-0 blur-[4px]"

/**
 * Marks that share one spot and cross-fade with a state, all mounted so leaving a state animates
 * as well as entering it. `value` names the mark on show, and the spot is as large as the
 * largest mark. Reduced motion drops the travel and keeps the crossfade: the mark still changes,
 * it just no longer grows into place.
 */
export function IconSwap<T extends string>({ value, marks, className }: IconSwapProps<T>) {
  return (
    <span className={cn("grid place-items-center", className)}>
      {Object.entries<ReactNode>(marks).map(([key, mark]) => (
        <span
          key={key}
          aria-hidden={key !== value}
          className={cn(swap, key === value ? shown : hidden)}
        >
          {mark}
        </span>
      ))}
    </span>
  )
}
