import type { ReactNode } from "react"
import { RefreshIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { EmptyState } from "./empty-state"
import { Heading } from "./heading"
import { TableMessage } from "./table"

const LOAD_ERROR_TITLE = "Couldn’t load this data"
const PAGE_ERROR_TITLE = "Something went wrong"
const RETRY_LABEL = "Try again"

interface RetryButtonProps {
  label: ReactNode
  onRetry: () => void
}

function RetryButton({ label, onRetry }: RetryButtonProps) {
  return (
    <Button variant="secondary" size="sm" prefix={<RefreshIcon />} onClick={onRetry}>
      {label}
    </Button>
  )
}

export interface ErrorStateProps {
  /**
   * `inline`: a card, a section or a dialog that could not load its data, one muted line.
   * `page`: a route that failed to render, a heading and a sentence at the page's start, for an
   * app's router error boundary.
   */
  variant?: "inline" | "page"
  /** Defaults to "Couldn’t load this data" inline and "Something went wrong" on a page. */
  title?: ReactNode
  /** What happened and what to do next, for the `page` variant. */
  description?: ReactNode
  /** The retry button's label. */
  retryLabel?: ReactNode
  /** Loads the data again. Left out, the state has no button. */
  onRetry?: () => void
  className?: string
}

/**
 * What a card, a section, a dialog or a whole route shows in place of what it failed to load.
 * Only the page variant is an alert: several cards can fail at once, and an alert from each
 * would interrupt the reader as many times.
 */
export function ErrorState({
  variant = "inline",
  title,
  description,
  retryLabel = RETRY_LABEL,
  onRetry,
  className,
}: ErrorStateProps) {
  const retry = onRetry && <RetryButton label={retryLabel} onRetry={onRetry} />

  if (variant === "page") {
    return (
      <div role="alert" className={cn("flex flex-col items-start gap-3 p-6", className)}>
        <div className="flex flex-col gap-1">
          <Heading size="h5" as="h1">
            {title ?? PAGE_ERROR_TITLE}
          </Heading>
          {description && <p className="text-ink-muted text-sm">{description}</p>}
        </div>
        {retry}
      </div>
    )
  }

  return (
    <EmptyState
      variant="inline"
      title={title ?? LOAD_ERROR_TITLE}
      description={description}
      className={cn("my-auto text-center", className)}
      action={retry}
    />
  )
}

export interface TableErrorStateProps {
  title?: ReactNode
  retryLabel?: ReactNode
  onRetry: () => void
}

/** What a table shows in place of the rows it could not load, under its column names. */
export function TableErrorState({
  title = LOAD_ERROR_TITLE,
  retryLabel = RETRY_LABEL,
  onRetry,
}: TableErrorStateProps) {
  return <TableMessage kind="error" title={title} retryLabel={retryLabel} onRetry={onRetry} />
}
