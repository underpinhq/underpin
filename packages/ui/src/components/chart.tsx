"use client"

import type { CSSProperties, ReactNode } from "react"
import { tooltipRuleClasses } from "../lib/classes"
import { cn } from "../lib/variants"
import { type TooltipFigure, TooltipFigures, TooltipPanel } from "./tooltip"

/** A series' swatch: a solid square, or a dashed outline for a compared period. */
export type ChartIndicator = "dot" | "outline"

/** One series' row in a chart tooltip: its swatch, its name and its figure, already formatted. */
export interface ChartTooltipItem {
  key: string
  label: ReactNode
  value: ReactNode
  color: string
  indicator?: ChartIndicator
}

interface ChartTooltipContentProps {
  title?: ReactNode
  items: ChartTooltipItem[]
  /**
   * More figures of the same point that no series draws (a bucket's sessions beside its
   * visitors), under a hairline so they read as context rather than as a series.
   */
  details?: TooltipFigure[]
  /**
   * Extra content under the figures, on its own hairline-separated row (a point's notes).
   */
  footer?: ReactNode
  className?: string
}

/**
 * The body of a chart's tooltip: a heading over one labelled figure per series, in the order
 * given. It knows nothing of the chart library; the chart hands it rows it has already resolved.
 */
function ChartTooltipContent({
  title,
  items,
  details,
  footer,
  className,
}: ChartTooltipContentProps) {
  if (!items.length) return null

  return (
    // TanStack Charts renders this panel inside an element with `overflow-wrap: anywhere`, which
    // lets a long label break mid-word. `wrap-break-word` restores breaks between words.
    <TooltipPanel variant="rich" className={cn("wrap-break-word", className)}>
      {/* The same composition a row's tooltip uses, from the same component: a heading over
          labelled figures. A chart point and a breakdown row are the same kind of report, and
          two tooltips side by side that differ in their spacing read as an accident. */}
      <TooltipFigures
        title={title}
        figures={items.map(item => ({
          label: (
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-[2px]",
                  item.indicator === "outline"
                    ? "border border-(--color-bg) border-dashed"
                    : "bg-(--color-bg)",
                )}
                style={{ "--color-bg": item.color } as CSSProperties}
              />
              {item.label}
            </span>
          ),
          value: item.value,
        }))}
      />

      {/* 8px either side of the rule, like the footer's: `pt-0.5` plus the 6px the figures
          keep above themselves. */}
      {!!details?.length && (
        <div className={cn("mt-2 border-t pt-0.5", tooltipRuleClasses)}>
          <TooltipFigures figures={details} />
        </div>
      )}

      {/* `empty:hidden` so a footer that renders nothing (a point with no notes and no hint)
          leaves no stray rule behind: the element is truthy, its output isn't. */}
      {footer && (
        <div className={cn("mt-2 border-t pt-2 empty:hidden", tooltipRuleClasses)}>{footer}</div>
      )}
    </TooltipPanel>
  )
}

export { ChartTooltipContent }
