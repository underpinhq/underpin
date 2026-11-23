"use client"

import { type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from "react"
import { Button, type ButtonProps } from "./button"
import { Callout, CalloutText } from "./callout"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  useDialogValue,
} from "./dialog"
import { DisabledReason } from "./disabled-reason"
import { Input } from "./input"
import { Label } from "./label"

/** The labels a confirmation shows besides its own question, each with an English default. */
interface ConfirmLabels {
  /** The dismissing button's label. */
  cancelLabel?: ReactNode
  /** The warning a typed confirmation shows above its field. */
  irreversibleLabel?: ReactNode
  /** The typed confirmation's field label, given the text to type. */
  formatConfirmTextLabel?: (confirmText: string) => ReactNode
  /** Why the typed confirmation's button is locked, given the text to type. */
  formatConfirmTextReason?: (confirmText: string) => string
}

export interface ConfirmDialogProps extends ConfirmLabels {
  /** Controls the dialog. Leave it out with `trigger`, and the dialog keeps its own state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The element that opens the dialog, for one not driven by `open`. */
  trigger?: ReactElement
  /** A question naming what is about to happen, e.g. "Delete this share link?". */
  title: ReactNode
  description: ReactNode
  /** The confirming button's label, repeating the question, e.g. "Delete share link". */
  action: ReactNode
  /**
   * What has to happen before the action unlocks: a text to type for something that cannot be
   * undone, or a reason it cannot run yet. Leave it out for an ordinary confirmation.
   */
  confirm?: ConfirmOptions
  /** The confirming button's meaning: danger for a loss, neutral for an undoable change. */
  tone?: ButtonProps["tone"]
  isPending?: boolean
  /**
   * More of the dialog's body, under the description, e.g. a note field the action reads. The
   * dialog is already a form, so this renders fields and never a `<form>` of its own.
   */
  children?: ReactNode
  /**
   * Runs the action. A returned promise (a `mutateAsync`) shows the button pending and closes
   * the dialog once it resolves, and the dialog cannot be dismissed until it settles. A rejection
   * leaves the dialog open and reaches `onError`. Anything else leaves closing to the parent,
   * through `open`.
   */
  onConfirm: () => void | Promise<unknown>
  /** Reports a rejected `onConfirm`, e.g. in a toast. Close the dialog here to give up. */
  onError?: (error: unknown) => void
}

/** How typed confirmation text is compared with the text asked for. */
export type ConfirmMatch = "exact" | "loose"

/** What a confirmation asks for before its action unlocks. */
export interface ConfirmOptions<Text = string> {
  /**
   * The text to type, for something that cannot be undone. The dialog says so and adds the
   * field.
   */
  text?: Text
  /**
   * How the typed text must match `text`: `exact` (the default), or `loose`, which ignores case
   * and the spaces around it.
   */
  match?: ConfirmMatch
  /**
   * Reports the typed text on every change, for a server that checks it again: keep the last
   * value and send it from `onConfirm`. Each opening starts the field empty.
   */
  onTextChange?: (typed: string) => void
  /**
   * Why the action cannot run yet, e.g. a required field in `children` is empty: the button
   * stays locked with this reason, and Enter does not submit. A text still to type comes first.
   */
  disabledReason?: string
}

/** A line of the dialog, fixed or worded from the item. */
type ItemText<T> = string | ((item: T) => string)

export interface ConfirmItemDialogProps<T> extends ConfirmLabels {
  /** The list item the confirmation is about; null closes the dialog. */
  item: T | null
  onClose: () => void
  title: ItemText<T>
  description: (item: T) => ReactNode
  action: ItemText<T>
  /** What unlocks the action, as on `ConfirmDialog`, with the text fixed or worded from the item. */
  confirm?: ConfirmOptions<ItemText<T>>
  tone?: ButtonProps["tone"]
  /** Runs the action on the item, typically a `mutateAsync`, as `ConfirmDialog` runs it. */
  onConfirm: (item: T) => Promise<unknown>
  onError?: (error: unknown) => void
}

function formatItemText<T>(text: ItemText<T>, item: T) {
  return typeof text === "function" ? text(item) : text
}

function isTypedMatch(typed: string, confirmText: string, match: ConfirmMatch) {
  if (match === "exact") return typed === confirmText
  return typed.trim().toLowerCase() === confirmText.trim().toLowerCase()
}

function formatDefaultConfirmTextLabel(confirmText: string) {
  return (
    <>
      Type <strong>{confirmText}</strong> to confirm
    </>
  )
}

function formatDefaultConfirmTextReason(confirmText: string) {
  return `Type ${confirmText} to confirm.`
}

/**
 * The one confirmation: a question naming the object, the consequence under it, and a button
 * repeating the question. With `confirm.text` it asks for that text to be typed first, behind a
 * warning that the action cannot be undone.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  action,
  confirm,
  tone,
  isPending = false,
  children,
  onConfirm,
  onError,
  cancelLabel = "Cancel",
  irreversibleLabel = "This cannot be undone.",
  formatConfirmTextLabel = formatDefaultConfirmTextLabel,
  formatConfirmTextReason = formatDefaultConfirmTextReason,
}: ConfirmDialogProps) {
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [ownOpen, setOwnOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [typed, setTyped] = useState("")
  const [shownOpen, setShownOpen] = useState(false)
  const isOpen = open ?? ownOpen
  const confirmText = confirm?.text
  // The typed text comes first: it sits above the fields `children` add.
  const lockedReason =
    confirmText && !isTypedMatch(typed, confirmText, confirm?.match ?? "exact")
      ? formatConfirmTextReason(confirmText)
      : confirm?.disabledReason
  const pending = isPending || isRunning
  // Counts each opening, closing and unmount. An action outlives the opening it started in when
  // the parent closes or unmounts the dialog itself, and must not then close or settle anything.
  const sessionRef = useRef(0)

  // Each opening starts clean, however the last one closed: by a button, or by the parent.
  if (shownOpen !== isOpen) {
    setShownOpen(isOpen)
    if (isOpen) {
      setTyped("")
      setIsRunning(false)
    }
  }

  useEffect(
    () => () => {
      sessionRef.current += 1
    },
    [isOpen],
  )

  function setOpen(next: boolean) {
    if (open === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }

  async function run() {
    const result = onConfirm()
    if (!result) return

    const session = sessionRef.current
    setIsRunning(true)
    try {
      await result
      if (sessionRef.current === session) setOpen(false)
    } catch (error) {
      onError?.(error)
    } finally {
      if (sessionRef.current === session) setIsRunning(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={next => {
        // Escape, Cancel and a press outside wait for the running action.
        if (!next && pending) return
        setOpen(next)
      }}
    >
      {trigger && <DialogTrigger render={trigger} />}

      <DialogContent initialFocus={confirmText ? inputRef : undefined}>
        {/* A form, so Enter in the typed field confirms. A locked button drops its own click, and
            the guard here covers a submit from anywhere else. */}
        <form
          noValidate
          className="contents"
          onSubmit={event => {
            // React bubbles a submit through the portal, so a dialog inside another form would
            // submit that form too.
            event.preventDefault()
            event.stopPropagation()
            if (!lockedReason && !pending) void run()
          }}
        >
          <DialogBody>
            <DialogHeader
              title={title}
              // A name with no spaces must wrap, or it pushes the dialog wider than the screen.
              description={description && <span className="wrap-anywhere">{description}</span>}
            />

            {confirmText && (
              <>
                <Callout tone="danger">
                  <CalloutText>{irreversibleLabel}</CalloutText>
                </Callout>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={fieldId}>{formatConfirmTextLabel(confirmText)}</Label>
                  <Input
                    ref={inputRef}
                    id={fieldId}
                    value={typed}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={event => {
                      setTyped(event.target.value)
                      confirm?.onTextChange?.(event.target.value)
                    }}
                  />
                </div>
              </>
            )}

            {children}
          </DialogBody>

          <DialogFooter>
            <DialogClose>{cancelLabel}</DialogClose>
            {/* The matching text unlocks the button; no validation message, refusing is the guard. */}
            <DisabledReason reason={lockedReason}>
              <Button type="submit" tone={tone ?? "danger"} isPending={pending}>
                {action}
              </Button>
            </DisabledReason>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * `ConfirmDialog` for one item of a list: open while `item` is set, its text worded from the
 * item, which stays on screen through the close animation.
 */
export function ConfirmItemDialog<T>({
  item,
  onClose,
  title,
  description,
  action,
  confirm,
  onConfirm,
  ...props
}: ConfirmItemDialogProps<T>) {
  const shown = useDialogValue(item)

  return (
    <ConfirmDialog
      {...props}
      open={item !== null}
      title={shown === null ? "" : formatItemText(title, shown)}
      description={shown !== null && description(shown)}
      action={shown === null ? "" : formatItemText(action, shown)}
      confirm={
        confirm && {
          ...confirm,
          text: shown === null || !confirm.text ? undefined : formatItemText(confirm.text, shown),
        }
      }
      onOpenChange={open => !open && onClose()}
      onConfirm={() => (item === null ? undefined : onConfirm(item))}
    />
  )
}
