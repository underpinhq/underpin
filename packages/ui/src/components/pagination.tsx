"use client"

import type { ComponentProps } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { Button } from "./button"

/**
 * 1-based row range shown on the current page, e.g. "26–50 of 42" → { from: 26, to: 42 }.
 */
function pageRange(page: number, perPage: number, total: number) {
  if (total === 0) return { from: 0, to: 0 }
  return { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, total) }
}

type PaginationProps = ComponentProps<"div"> & {
  page: number
  pageCount: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

/**
 * Offset-pagination controls for a list: a "Showing from–to of total" label and prev/next
 * buttons. Presentational and router-agnostic — the caller wires `onPageChange` to its search
 * params. Renders nothing when there's a single page.
 */
export function Pagination({
  page,
  pageCount,
  total,
  perPage,
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  if (pageCount <= 1) return null

  const { from, to } = pageRange(page, perPage, total)

  return (
    <div className={cn("flex items-center justify-between gap-4 pt-1", className)} {...props}>
      <p className="text-ink-muted text-xs tabular-nums">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Previous page"
          prefix={<ChevronLeftIcon />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />

        <Button
          variant="secondary"
          size="sm"
          aria-label="Next page"
          prefix={<ChevronRightIcon />}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  )
}
