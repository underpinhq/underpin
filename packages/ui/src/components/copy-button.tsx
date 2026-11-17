"use client"

import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { CancelIcon, CheckIcon, CopyIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { IconSwap } from "./icon-swap"
import { Tooltip } from "./tooltip"

/** Where a copy stands: nothing to show, or the outcome of the last one for a moment. */
type CopyStatus = "idle" | "copied" | "failed"

/**
 * Copies text to the clipboard and shows how it went for `timeout` ms, then goes back to idle.
 * Resolves to whether the copy took. A tiny local stand-in for `@mantine/hooks`'
 * `useClipboard`, so the package carries no extra hook dependency.
 */
function useClipboard({ timeout = 2000 }: { timeout?: number } = {}) {
  const [status, setStatus] = useState<CopyStatus>("idle")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const copy = useCallback(
    (value: string) => {
      clearTimeout(timer.current)

      function settle(next: CopyStatus) {
        setStatus(next)
        timer.current = setTimeout(() => setStatus("idle"), timeout)
        return next === "copied"
      }

      // Optional chaining, not a bare call: `navigator.clipboard` is undefined outside a
      // secure context (LAN dev over plain http, an old WebView, a sandboxed iframe), and
      // dereferencing it throws synchronously out of the click handler and into the nearest
      // error boundary. A missing clipboard is a failed copy like any other.
      const write =
        navigator.clipboard?.writeText(value) ?? Promise.reject(new Error("No clipboard"))

      return write.then(
        () => settle("copied"),
        () => settle("failed"),
      )
    },
    [timeout],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return { status, copy }
}

/** One label laid over the others, all in the same grid cell. */
const copyLabel = "col-start-1 row-start-1 transition-opacity duration-150 ease-out"

interface CopyLabelProps {
  status: CopyStatus
  labels: Record<CopyStatus, ReactNode>
}

/**
 * The labels stacked, so the button is as wide as the longest of them in every state and never
 * resizes under the pointer that just clicked it. The ones not on show keep their space rather
 * than unmounting, which is also what lets the swap cross-fade.
 */
function CopyLabel({ status, labels }: CopyLabelProps) {
  return (
    <span className="grid">
      {Object.entries<ReactNode>(labels).map(([key, text]) => (
        <span
          key={key}
          aria-hidden={key !== status}
          className={cn(copyLabel, key === status ? "opacity-100" : "opacity-0")}
        >
          {text}
        </span>
      ))}
    </span>
  )
}

interface CopyButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "prefix" | "onClick" | "children"
> {
  value: string
  /**
   * Visible label. Left out, the button is icon-only with a tooltip.
   */
  label?: ReactNode
  /**
   * What the label reads while the copied state is showing.
   */
  copiedLabel?: ReactNode
  /**
   * What the label reads when the browser refused the copy.
   */
  failedLabel?: ReactNode
  tooltip?: ReactNode
  /** Runs once the value is on the clipboard, e.g. to say where to paste it. */
  onCopy?: () => void
  /** Runs when the browser refuses the copy, e.g. to select the text for a copy by hand. */
  onCopyError?: () => void
}

/**
 * Copies `value` to the clipboard and swaps its icon to a check for a couple of seconds, or to a
 * cross with "Copy failed" when the browser refuses. Owns the tooltip so the outcome survives the
 * tooltip closing on click.
 */
export function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  failedLabel = "Copy failed",
  tooltip = label ? undefined : "Copy to clipboard",
  onCopy,
  onCopyError,
  className,
  ...props
}: CopyButtonProps) {
  const clipboard = useClipboard({ timeout: 2000 })
  const outcomes = { copied: copiedLabel, failed: failedLabel }
  const outcome = clipboard.status === "idle" ? undefined : outcomes[clipboard.status]

  return (
    <>
      <Tooltip tooltip={tooltip && (outcome ?? tooltip)}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={label ? undefined : "Copy to clipboard"}
          prefix={
            <IconSwap
              value={clipboard.status}
              marks={{
                idle: <CopyIcon className="size-3.5" />,
                copied: <CheckIcon className="size-3.5 text-success-ink" />,
                failed: <CancelIcon className="size-3.5 text-danger-ink" />,
              }}
            />
          }
          onClick={() => {
            void clipboard.copy(value).then(copied => {
              if (copied) onCopy?.()
              else onCopyError?.()
            })
          }}
          className={cn(!label && "pointer-coarse:size-10", className)}
          {...props}
        >
          {label && <CopyLabel status={clipboard.status} labels={{ idle: label, ...outcomes }} />}
        </Button>
      </Tooltip>

      {/* The icon and label swap only visually; this announces the outcome. */}
      <output className="sr-only">{outcome}</output>
    </>
  )
}
