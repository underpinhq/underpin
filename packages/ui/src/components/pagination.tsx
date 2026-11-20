"use client"

import { type ComponentProps, type ReactNode, useId, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "../lib/icons"
import { useLoadMore } from "../lib/load-more"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { ButtonGroup } from "./button-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

/**
 * 1-based row range shown on the current page, e.g. "26–50 of 42" → { from: 26, to: 42 }.
 */
function getPageRange(page: number, perPage: number, total: number) {
  if (total === 0) return { from: 0, to: 0 }
  const to = Math.min(page * perPage, total)
  // A page past the end (a stale link, rows deleted since) reads as the last row, not "51–50".
  return { from: Math.min((page - 1) * perPage + 1, to), to }
}

/**
 * The band under a table's rows: a hairline above, the count at the start, the controls at the
 * end. 48px, so the pager's 28px buttons sit 10px from each edge.
 */
const BAND_CLASSES =
  "flex h-12 shrink-0 items-center justify-between gap-4 border-t border-edge-subtle pr-3 pl-5 text-ink-muted text-xs tabular-nums"

/** Figures in the band are ink, the words around them muted. */
const FIGURE_CLASSES = "text-ink"

/** The figures a count label places, each formatted and styled already. */
export interface PaginationRange {
  from: ReactNode
  to: ReactNode
  total: ReactNode
}

/** The figures of the page label. */
export interface PaginationPage {
  page: ReactNode
  pageCount: ReactNode
}

/**
 * The words of the paged band, each a prop so a product can translate them. A label that holds
 * figures is a function of them, so a language can put them in its own order.
 */
export interface PaginationLabels {
  /** The count: "Showing 26–50 of 1,204". */
  range: (range: PaginationRange) => ReactNode
  /** The count on a phone: "26–50 of 1,204". */
  rangeShort: (range: PaginationRange) => ReactNode
  /** "Page 2 of 49". */
  pageOf: (page: PaginationPage) => ReactNode
  perPage: string
  firstPage: string
  previousPage: string
  nextPage: string
  lastPage: string
}

const PAGINATION_LABELS: PaginationLabels = {
  range: ({ from, to, total }) => (
    <>
      Showing {from}–{to} of {total}
    </>
  ),
  rangeShort: ({ from, to, total }) => (
    <>
      {from}–{to} of {total}
    </>
  ),
  pageOf: ({ page, pageCount }) => (
    <>
      Page {page} of {pageCount}
    </>
  ),
  perPage: "Per page",
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
}

interface PaginationProps extends Omit<ComponentProps<"div">, "children"> {
  page: number
  pageCount: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
  /** The page sizes the reader picks from. Left out, the band has no per-page select. */
  perPageOptions?: number[]
  onPerPageChange?: (perPage: number) => void
  /** While a page loads: every control is disabled, and the caller dims the old rows. */
  loading?: boolean
  /** Formats each figure in the reader's locale. */
  format?: (value: number) => string
  /** The band's words, English by default. */
  labels?: Partial<PaginationLabels>
}

/**
 * The footer band of a paged table: "Showing 26–50 of 1,204", an optional per-page select,
 * "Page 2 of 49" and the joined first, previous, next and last buttons. A single page keeps the
 * count and drops the controls; an empty table has no band. On a phone the count drops
 * "Showing", and the per-page select and the first and last buttons go. Presentational and
 * router-agnostic: the caller wires `onPageChange` to its search params.
 */
export function Pagination({
  page,
  pageCount,
  total,
  perPage,
  onPageChange,
  perPageOptions,
  onPerPageChange,
  loading = false,
  format = String,
  labels: labelsProp,
  className,
  ...props
}: PaginationProps) {
  const perPageLabelId = useId()
  const labels = { ...PAGINATION_LABELS, ...labelsProp }
  if (total === 0) return null

  const { from, to } = getPageRange(page, perPage, total)
  const range = {
    from: <span className={FIGURE_CLASSES}>{format(from)}</span>,
    to: <span className={FIGURE_CLASSES}>{format(to)}</span>,
    total: <span className={FIGURE_CLASSES}>{format(total)}</span>,
  }
  const first = page <= 1
  const last = page >= pageCount

  return (
    <div aria-busy={loading || undefined} className={cn(BAND_CLASSES, className)} {...props}>
      <p className="truncate">
        <span className="max-sm:hidden">{labels.range(range)}</span>
        <span className="sm:hidden">{labels.rangeShort(range)}</span>
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-4">
          {perPageOptions && onPerPageChange && (
            <div className="flex items-center gap-2 max-sm:hidden">
              <span id={perPageLabelId}>{labels.perPage}</span>
              <Select
                value={perPage}
                disabled={loading}
                onValueChange={value => {
                  if (value !== null) onPerPageChange(value)
                }}
              >
                <SelectTrigger size="sm" aria-labelledby={perPageLabelId} className="w-18">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {perPageOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {format(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="whitespace-nowrap">
            {labels.pageOf({
              page: <span className={FIGURE_CLASSES}>{format(page)}</span>,
              pageCount: <span className={FIGURE_CLASSES}>{format(pageCount)}</span>,
            })}
          </p>

          <ButtonGroup>
            <Button
              variant="secondary"
              size="sm"
              aria-label={labels.firstPage}
              prefix={<ChevronsLeftIcon />}
              disabled={loading || first}
              className="max-sm:hidden"
              onClick={() => onPageChange(1)}
            />
            {/* On a phone the first and last buttons are gone, so the inner two take the
                group's ends: their outer corners and the left edge the group drops. Marked
                important, since the group's rules for its members outrank a member's own. */}
            <Button
              variant="secondary"
              size="sm"
              aria-label={labels.previousPage}
              prefix={<ChevronLeftIcon />}
              disabled={loading || first}
              className="max-sm:rounded-l-md! max-sm:border-l!"
              onClick={() => onPageChange(page - 1)}
            />
            <Button
              variant="secondary"
              size="sm"
              aria-label={labels.nextPage}
              prefix={<ChevronRightIcon />}
              disabled={loading || last}
              className="max-sm:rounded-r-md!"
              onClick={() => onPageChange(page + 1)}
            />
            <Button
              variant="secondary"
              size="sm"
              aria-label={labels.lastPage}
              prefix={<ChevronsRightIcon />}
              disabled={loading || last}
              className="max-sm:hidden"
              onClick={() => onPageChange(pageCount)}
            />
          </ButtonGroup>
        </div>
      )}
    </div>
  )
}

interface PaginationInfiniteProps extends Omit<ComponentProps<"div">, "children"> {
  /** The count at the start, formatted by the caller: "120 of 4,300 events". */
  count: ReactNode
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  /** False after a failed page: a sentinel still on screen would ask for it again at once. */
  enabled?: boolean
  /** How far below the viewport the next page starts loading, in pixels. */
  ahead?: number
  loadingLabel?: ReactNode
  endLabel?: ReactNode
}

/**
 * The footer band of a table that loads as it scrolls: the count, then "Loading more…" while the
 * next batch loads and "End of list" once there is none. The band itself is the trigger: the
 * next page loads as it nears the viewport. Pass `onLoadMore` a stable callback.
 */
export function PaginationInfinite({
  count,
  hasMore,
  loading,
  onLoadMore,
  enabled = true,
  ahead,
  loadingLabel = "Loading more…",
  endLabel = "End of list",
  className,
  ...props
}: PaginationInfiniteProps) {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  useLoadMore(sentinel, { enabled: enabled && hasMore && !loading, onLoad: onLoadMore, ahead })

  return (
    <div
      ref={setSentinel}
      aria-busy={loading || undefined}
      className={cn(BAND_CLASSES, className)}
      {...props}
    >
      <p className="truncate">{count}</p>
      <output className="whitespace-nowrap">
        {loading ? loadingLabel : hasMore ? null : endLabel}
      </output>
    </div>
  )
}
