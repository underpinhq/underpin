import type { ReactNode } from "react"
import { cn } from "../lib/variants"
import { CopyInput } from "./copy-input"
import { DialogBody, DialogClose, DialogFooter, DialogHeader } from "./dialog"

export interface CopySecretProps {
  title: ReactNode
  description?: ReactNode
  /** The field's accessible name, e.g. "API key". */
  label: string
  value: string
  /** What the reader needs beside the secret to use it, under the field: a base URL, a warning. */
  children?: ReactNode
  /**
   * Fades the secret in. Set it where the secret replaces a form inside a dialog that is
   * already open; a dialog that opens on the secret animates its own entrance.
   */
  replacing?: boolean
  /** The closing button's label. */
  doneLabel?: ReactNode
  /** The copy button's accessible name and tooltip. */
  copyLabel?: string
  /** What the copy button's tooltip reads once the secret is copied. */
  copiedLabel?: ReactNode
  /** What the copy button's tooltip reads when the browser refused the copy. */
  failedLabel?: ReactNode
  /** Runs once the copy button put the secret on the clipboard. */
  onCopied?: () => void
}

/** A short rise over a fade, so the new body reads as the form's next state, not a new page. */
const REPLACE_CLASSES = "animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out-expo"

/**
 * A dialog's body and footer showing a secret the one time it exists in the clear, such as a
 * new API key, with a copy button and Done to close. Put it inside `DialogContent`.
 */
export function CopySecret({
  title,
  description,
  label,
  value,
  children,
  replacing,
  doneLabel = "Done",
  copyLabel,
  copiedLabel,
  failedLabel,
  onCopied,
}: CopySecretProps) {
  return (
    <>
      <DialogBody className={cn(replacing && REPLACE_CLASSES)}>
        <DialogHeader title={title} description={description} />
        <CopyInput
          value={value}
          aria-label={label}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          failedLabel={failedLabel}
          className="font-mono text-xs"
          onCopied={onCopied}
        />
        {children}
      </DialogBody>

      <DialogFooter className={cn(replacing && REPLACE_CLASSES)}>
        <DialogClose variant="primary">{doneLabel}</DialogClose>
      </DialogFooter>
    </>
  )
}
