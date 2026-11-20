"use client"

import type { ComponentProps, ReactNode } from "react"
import { CancelIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { Button } from "./button"

interface BulkActionBarProps extends Omit<ComponentProps<"section">, "children"> {
  /** How many rows are selected. The bar shows while there is at least one. */
  count: number
  /** The selection as text, formatted by the caller. */
  label?: ReactNode
  onClear: () => void
  clearLabel?: string
  /**
   * The actions for the selection: small ghost buttons, the destructive one last with
   * `tone="danger"`.
   */
  children: ReactNode
}

/**
 * Floats at the bottom centre of the page while rows are selected: "N selected" with a cross
 * that clears the selection, then the actions for it. It owns the selection count, so the
 * footer band never shows one. A selection covers the current page only.
 */
export function BulkActionBar({
  count,
  label = `${count} selected`,
  onClear,
  clearLabel = "Clear selection",
  "aria-label": ariaLabel = "Selection",
  className,
  children,
  ...props
}: BulkActionBarProps) {
  return (
    <>
      {/* Mounted while nothing is selected too: a screen reader skips the text a live region
          is born with, so the first selection would go unannounced. */}
      <span aria-live="polite" className="sr-only">
        {count > 0 ? label : ""}
      </span>
      {count > 0 && (
        <section
          aria-label={ariaLabel}
          className={cn(
            "fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-edge-float bg-overlay p-1.5 shadow-popup",
            "fade-in-0 slide-in-from-bottom-2 animate-in duration-150 ease-out-expo",
            className,
          )}
          {...props}
        >
          <span className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-edge border-dashed pr-0.5 pl-2.5 font-medium text-control text-ink tabular-nums">
            {label}
            <Button
              variant="ghost"
              size="xs"
              aria-label={clearLabel}
              prefix={<CancelIcon />}
              onClick={onClear}
            />
          </span>
          <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">{children}</div>
        </section>
      )}
    </>
  )
}
