"use client"

import { type ComponentProps, type ReactNode, useImperativeHandle, useRef } from "react"
import { cn } from "../lib/variants"
import { CopyButton } from "./copy-button"
import { Input } from "./input"

interface CopyInputProps extends Omit<ComponentProps<typeof Input>, "value" | "readOnly"> {
  value: string
  /** A shorter form to show in the field, such as a URL without its protocol. */
  display?: string
  /** The copy button's accessible name and tooltip. */
  copyLabel?: string
  /** What the copy button's tooltip reads once the value is copied. */
  copiedLabel?: ReactNode
  /** What the copy button's tooltip reads when the browser refused the copy. */
  failedLabel?: ReactNode
  /** Runs once the copy button put the value on the clipboard. */
  onCopied?: () => void
}

/**
 * Read-only input with a copy-to-clipboard button pinned to its right edge, 2px in on every
 * side: the 28px button in the 32px field, its `sm` corners concentric with the field's `md`.
 * Props go to the input itself so `ref`, `aria-label` and font classes land on the field. When
 * the browser refuses the copy, the field's text is selected for a copy by hand.
 */
export function CopyInput({
  ref,
  value,
  display,
  copyLabel = "Copy to clipboard",
  copiedLabel,
  failedLabel,
  onCopied,
  className,
  onFocus,
  onCopy,
  ...props
}: CopyInputProps) {
  const shown = display ?? value
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        readOnly
        value={shown}
        className={cn("pr-10", className)}
        onFocus={event => {
          event.currentTarget.select()
          onFocus?.(event)
        }}
        // A copy of the whole shortened field takes the full value, as the button does.
        onCopy={event => {
          const { selectionStart, selectionEnd } = event.currentTarget

          if (shown !== value && selectionStart === 0 && selectionEnd === shown.length) {
            event.preventDefault()
            event.clipboardData.setData("text/plain", value)
          }

          onCopy?.(event)
        }}
        {...props}
      />

      <CopyButton
        value={value}
        variant="ghost"
        aria-label={copyLabel}
        tooltip={copyLabel}
        copiedLabel={copiedLabel}
        failedLabel={failedLabel}
        className="absolute top-1/2 right-0.5 -translate-y-1/2 rounded"
        onCopy={onCopied}
        onCopyError={() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }}
      />
    </div>
  )
}
