"use client"

import { type ReactNode, useState } from "react"
import { Button } from "./button"
import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog"
import { DetailRow } from "./detail-row"
import { DisabledReason } from "./disabled-reason"
import { ErrorState } from "./error-state"

export interface DangerRowProps extends Pick<
  ConfirmDialogProps,
  | "open"
  | "onOpenChange"
  | "confirmText"
  | "confirmMatch"
  | "onConfirmTextChange"
  | "confirmDisabledReason"
  | "isPending"
  | "onConfirm"
  | "onError"
  | "cancelLabel"
  | "irreversibleLabel"
  | "formatConfirmTextLabel"
  | "formatConfirmTextReason"
> {
  label: ReactNode
  description: ReactNode
  /** The button's label, which opens the confirmation, e.g. "Delete site…". */
  trigger: ReactNode
  /** Why the button cannot run, if it cannot. */
  disabledReason?: string
  /** What the button waits for is still loading: disabled, with no reason to give. */
  isLoading?: boolean
  /** What the button waits for failed to load: the retry takes the button's place. */
  onRetry?: () => void
  /** The line in the button's place when `onRetry` is set. */
  errorTitle?: ReactNode
  /** The retry button's label. */
  retryLabel?: ReactNode
  /** The confirmation's question, e.g. "Delete Acme?". */
  title: ReactNode
  /** The confirmation's consequence, under the question. */
  confirmDescription: ReactNode
  /** The confirming button's label, e.g. "Delete site". */
  action: ReactNode
}

/**
 * A settings row for an action nothing brings back: the danger button on the right, opening a
 * `ConfirmDialog`. Pass `confirmText`, the object's own name, to have it typed before the action
 * unlocks; without it the confirmation asks once, for what can be brought back another way.
 *
 * Return a promise from `onConfirm` (a `mutateAsync`) and the confirmation closes once it
 * resolves. An action that returns nothing (a `mutate` with `isPending`) never closes it: drive
 * the confirmation with `open` and `onOpenChange` and close it on success.
 */
export function DangerRow({
  label,
  description,
  trigger,
  disabledReason,
  isLoading = false,
  onRetry,
  errorTitle,
  retryLabel,
  title,
  confirmDescription,
  action,
  open,
  onOpenChange,
  ...confirm
}: DangerRowProps) {
  const [ownOpen, setOwnOpen] = useState(false)
  const isOpen = open ?? ownOpen

  function setOpen(next: boolean) {
    if (open === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }

  return (
    <DetailRow
      density="form"
      label={label}
      description={description}
      valueClassName="items-start @xl:items-end"
    >
      {onRetry ? (
        <ErrorState title={errorTitle} retryLabel={retryLabel} onRetry={onRetry} />
      ) : (
        <DisabledReason reason={disabledReason}>
          <Button
            variant="secondary"
            tone="danger"
            disabled={isLoading || !!disabledReason}
            onClick={() => setOpen(true)}
          >
            {trigger}
          </Button>
        </DisabledReason>
      )}

      <ConfirmDialog
        open={isOpen}
        title={title}
        description={confirmDescription}
        action={action}
        onOpenChange={setOpen}
        {...confirm}
      />
    </DetailRow>
  )
}
