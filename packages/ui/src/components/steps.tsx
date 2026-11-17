import type { ComponentProps } from "react"
import { cn } from "../lib/variants"

type StepsProps = ComponentProps<"div"> & {
  /**
   * The step in progress, 1-based. Past `total` every bar reads as done, which is the state
   * a flow ends on: nothing is in progress any more.
   */
  current: number

  /**
   * The total number of steps.
   */
  total: number
}

/**
 * Segmented progress bars for multi-step flows: a done step is the page's ink, the step in
 * progress is a shade lighter and animates in, and the ones ahead are the hairline colour.
 * Screen readers get "Step n of m", announced again whenever the step changes.
 */
export function Steps({ className, current, total, ...props }: StepsProps) {
  return (
    <div className={cn("flex gap-1.5", className)} {...props}>
      <p aria-live="polite" className="sr-only">
        {current > total ? "All steps complete" : `Step ${current} of ${total}`}
      </p>

      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300 ease-out-expo",
            index < current - 1 && "bg-ink",
            index === current - 1 &&
              "origin-left animate-fill-bar bg-ink-muted motion-reduce:animate-none",
            index > current - 1 && "bg-edge",
          )}
        />
      ))}
    </div>
  )
}
