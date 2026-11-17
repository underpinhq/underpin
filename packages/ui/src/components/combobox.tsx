"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import type { ReactNode } from "react"
import {
  POPUP_SIDE_OFFSET,
  popoverAnimationClasses,
  popupEmptyClasses,
  popupGroupLabelClasses,
  popupItemClasses,
  popupSeparatorClasses,
  popupSurfaceClasses,
} from "../lib/classes"
import { CheckIcon, ChevronsUpDownIcon } from "../lib/icons"
import { cn, type VariantProps } from "../lib/variants"
import { inputVariants, passwordManagerAttributes, type PasswordManagerProps } from "./input"

/**
 * A text field that filters a list of options. Use a Combobox when the committed value has to
 * be one of the items and typing only narrows them down; use an Autocomplete when the value is
 * whatever the user typed and the list merely suggests completions.
 *
 * The parts cover two layouts. In the popup layout `ComboboxContent` portals the list and
 * anchors it under the input. In the inline layout the list is already inside someone else's
 * surface (a Popover, a Dialog), so `ComboboxContent` is left out and `ComboboxList` follows
 * `ComboboxInput` directly.
 */
const Combobox = ComboboxPrimitive.Root
const ComboboxGroup = ComboboxPrimitive.Group
const ComboboxCollection = ComboboxPrimitive.Collection

interface ComboboxTriggerProps
  extends ComboboxPrimitive.Trigger.Props, Pick<VariantProps<typeof inputVariants>, "size"> {}

/**
 * The button that opens the list, for a searchable select: the field lives inside the popup and
 * the trigger shows the committed value. Styled as the package's Select trigger, so the two read
 * as one control with and without search.
 */
function ComboboxTrigger({ children, className, size, ...props }: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn(
        inputVariants({ interactive: true, size }),
        "flex items-center justify-between",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2 truncate">{children}</span>
      <ComboboxPrimitive.Icon
        render={<ChevronsUpDownIcon className="ml-1 size-3.5 shrink-0 text-ink-muted" />}
      />
    </ComboboxPrimitive.Trigger>
  )
}

/**
 * The text field. Styled as the package's Input, so a combobox sitting next to a plain field in
 * a form row is the same control with a list behind it. The native `size` attribute is dropped
 * in favour of the Input's size variant: a character count is meaningless on a control this
 * package always stretches to its container.
 */
function ComboboxInput({
  className,
  interactive,
  size,
  allowPasswordManager,
  ...props
}: Omit<ComboboxPrimitive.Input.Props, "size"> &
  VariantProps<typeof inputVariants> &
  PasswordManagerProps) {
  return (
    <ComboboxPrimitive.Input
      // Merged outside `variants`, which cannot take Base UI's state-function `className`.
      className={cn(inputVariants({ interactive, size }), className)}
      {...passwordManagerAttributes(allowPasswordManager)}
      {...props}
    />
  )
}

/**
 * The popup the options appear in, for the popup layout only. Holds a `ComboboxList` and,
 * optionally, a `ComboboxEmpty` or `ComboboxStatus` beside it. Both have to be the list's sibling
 * to know whether it is empty. Sized to at least its anchor, so the popup lines up with
 * the control that opened it but a long label still gets the width it needs.
 */
function ComboboxContent({
  className,
  children,
  align,
  side,
  sideOffset = POPUP_SIDE_OFFSET,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          className={cn(
            popupSurfaceClasses,
            "relative z-50 isolate max-h-(--available-height) min-w-(--anchor-width) overflow-hidden outline-none",
            popoverAnimationClasses,
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

/**
 * The scroller around the items. Takes them as children, or as a function called with each of
 * the root's (filtered) `items`. The second form is what keeps a long list virtual.
 *
 * Renders standalone as well as inside a `ComboboxContent`: with no positioner above it the list
 * registers itself as the anchor, which is how the inline layout works without a `Popup` or a
 * `Positioner`. Nothing sets `--available-height` in that layout, so the height falls back to a
 * fixed cap that keeps the list scrolling inside whatever surface holds it. A Popover's own
 * positioner does set the variable, and it reaches a list inside the popover: give that list a
 * `max-h` of its own, or it grows to the whole room and the popover overflows it by the height
 * of everything else it holds.
 */
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      className={cn(
        "max-h-[var(--available-height,18rem)] overflow-y-auto overscroll-contain p-1",
        className,
      )}
      {...props}
    />
  )
}

/**
 * One option. `prefix` leads the label with a glyph that tells the row apart at a glance;
 * `suffix` fills the trailing edge, for the count or shortcut that belongs to the row rather
 * than to its label. The selected option ends in a check, as in a `Select`.
 */
function ComboboxItem({
  className,
  children,
  prefix,
  suffix,
  ...props
}: Omit<ComboboxPrimitive.Item.Props, "prefix"> & {
  prefix?: ReactNode
  suffix?: ReactNode
}) {
  return (
    <ComboboxPrimitive.Item
      className={cn(popupItemClasses, "group/choice w-full gap-2 px-2", className)}
      {...props}
    >
      {prefix != null && (
        <span className="flex shrink-0 text-ink-muted [&>svg]:size-4">{prefix}</span>
      )}
      {/* Truncation belongs on a child: `text-overflow` has no effect on a flex container,
          so the same classes on the item itself clip a long label without an ellipsis. */}
      <span className="truncate">{children}</span>
      {suffix != null && <span className="ml-auto text-ink-muted tabular-nums">{suffix}</span>}
      <span
        aria-hidden
        className="ml-auto hidden shrink-0 pl-4 text-ink-muted group-data-selected/choice:flex"
      >
        <ComboboxPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ComboboxPrimitive.ItemIndicator>
      </span>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroupLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel className={cn(popupGroupLabelClasses, className)} {...props} />
  )
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return <ComboboxPrimitive.Separator className={cn(popupSeparatorClasses, className)} {...props} />
}

/** Stands in for the list while nothing matches the query; renders nothing when something does. */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty className={cn(popupEmptyClasses, className)} {...props} />
}

/**
 * A line for the state of an asynchronously loaded list, announced politely as it changes. Its
 * element has to stay mounted for screen readers to catch that change, so render it
 * unconditionally and vary its children instead; it collapses to nothing while it has none.
 */
function ComboboxStatus({ className, ...props }: ComboboxPrimitive.Status.Props) {
  return <ComboboxPrimitive.Status className={cn(popupEmptyClasses, className)} {...props} />
}

export {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxStatus,
  ComboboxTrigger,
}
