"use client"

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import {
  POPUP_SIDE_OFFSET,
  popoverAnimationClasses,
  popupEmptyClasses,
  popupItemClasses,
  popupSurfaceClasses,
} from "../lib/classes"
import { cn, type VariantProps } from "../lib/variants"
import { inputVariants, passwordManagerAttributes, type PasswordManagerProps } from "./input"

const Autocomplete = AutocompletePrimitive.Root

/**
 * The text field. Styled as the package's Input, so an autocomplete sitting next to a plain
 * field in a form row is the same control with a list behind it.
 */
function AutocompleteInput({
  className,
  interactive,
  size,
  allowPasswordManager,
  ...props
}: AutocompletePrimitive.Input.Props & VariantProps<typeof inputVariants> & PasswordManagerProps) {
  // Merged outside the variants call, unlike everywhere else: Base UI types this part's
  // `className` as a function of its own state too, which `variants` cannot take.
  return (
    <AutocompletePrimitive.Input
      className={cn(inputVariants({ interactive, size }), className)}
      {...passwordManagerAttributes(allowPasswordManager)}
      {...props}
    />
  )
}

/**
 * The popup the matches appear in. Holds an `AutocompleteList` and, optionally, an
 * `AutocompleteEmpty` beside it — `Empty` has to be the list's sibling to know it is empty.
 * Sized to the input rather than to the longest match, so a list of paths can't shove the
 * popup past the form.
 */
function AutocompleteContent({
  className,
  children,
  align,
  side,
  sideOffset = POPUP_SIDE_OFFSET,
  ...props
}: AutocompletePrimitive.Popup.Props &
  Pick<AutocompletePrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="isolate z-50"
      >
        <AutocompletePrimitive.Popup
          className={cn(
            popupSurfaceClasses,
            "relative z-50 isolate max-h-(--available-height) w-(--anchor-width) overflow-hidden outline-none",
            popoverAnimationClasses,
            className,
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

/**
 * The scroller around the items. Takes them as children, or as a function called with each
 * of the root's (filtered) `items` — the second form is what keeps a long list virtual.
 */
function AutocompleteList({ className, ...props }: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      className={cn("max-h-(--available-height) overflow-y-auto overscroll-contain p-1", className)}
      {...props}
    />
  )
}

function AutocompleteItem({ className, children, ...props }: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      className={cn(popupItemClasses, "w-full px-2", className)}
      {...props}
    >
      {/* Truncation belongs on a child: `text-overflow` has no effect on a flex container,
          so the same classes on the item itself clip a long match without an ellipsis. It
          takes the row's width, so children can lay a hint out against the right edge. */}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </AutocompletePrimitive.Item>
  )
}

/** Stands in for the list while nothing matches what's typed; renders nothing when it does. */
function AutocompleteEmpty({ className, ...props }: AutocompletePrimitive.Empty.Props) {
  return <AutocompletePrimitive.Empty className={cn(popupEmptyClasses, className)} {...props} />
}

export {
  Autocomplete,
  AutocompleteInput,
  AutocompleteContent,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
}
