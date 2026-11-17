"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import type { ReactNode } from "react"
import {
  POPUP_SIDE_OFFSET,
  popoverAnimationClasses,
  popupBackdropClasses,
  popupGroupLabelClasses,
  popupItemClasses,
  popupSeparatorClasses,
  popupSurfaceClasses,
} from "../lib/classes"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from "../lib/icons"
import { cn, variants, type VariantProps } from "../lib/variants"
import { useDisabledReason } from "./disabled-reason"
import { inputVariants } from "./input"
import { Tooltip } from "./tooltip"

/** Not modal, as a menu is. Base UI's own default is modal. */
function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>,
) {
  return <SelectPrimitive.Root modal={false} {...props} />
}

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

function SelectTrigger({
  children,
  className,
  interactive = true,
  size,
  ...props
}: SelectPrimitive.Trigger.Props & VariantProps<typeof inputVariants>) {
  return (
    <SelectPrimitive.Trigger
      className={inputVariants({
        interactive,
        size,
        className: cn(
          "flex items-center justify-between",
          "data-popup-open:border-edge-solid data-popup-open:bg-fill-subtle",
          interactive && "active:not-disabled:bg-fill-subtle",
          className,
        ),
      })}
      {...props}
    >
      <span className="truncate">{children}</span>

      <SelectPrimitive.Icon
        render={<ChevronsUpDownIcon className="ml-1 size-3.5 shrink-0 text-ink-muted" />}
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectScrollUpButton({ className, ...props }: SelectPrimitive.ScrollUpArrow.Props) {
  return (
    <SelectPrimitive.ScrollUpArrow
      className={cn("flex cursor-pointer items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({ className, ...props }: SelectPrimitive.ScrollDownArrow.Props) {
  return (
    <SelectPrimitive.ScrollDownArrow
      className={cn("flex cursor-pointer items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

const selectScrollButtonVariants = variants({
  base: "absolute inset-x-0 z-10 bg-overlay animate-in fade-in-0 duration-150 ease-out",
  variants: {
    position: {
      top: "top-0 mask-b-from-0",
      bottom: "bottom-0 mask-t-from-0",
    },
  },
})

function SelectContent({
  className,
  children,
  align,
  side,
  sideOffset = POPUP_SIDE_OFFSET,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Backdrop className={popupBackdropClasses} />
      <SelectPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          className={cn(
            popupSurfaceClasses,
            "relative z-50 isolate max-h-(--available-height) min-w-(--anchor-width) overflow-hidden outline-none",
            !alignItemWithTrigger && popoverAnimationClasses,
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton className={selectScrollButtonVariants({ position: "top" })} />
          {/* The list is the scroller (not the popup), so the scroll arrows can overlay it. */}
          <SelectPrimitive.List className="max-h-(--available-height) overflow-y-auto overscroll-contain p-1">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton className={selectScrollButtonVariants({ position: "bottom" })} />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return <SelectPrimitive.GroupLabel className={cn(popupGroupLabelClasses, className)} {...props} />
}

interface SelectItemProps extends Omit<SelectPrimitive.Item.Props, "prefix"> {
  prefix?: ReactNode
  /**
   * Why the option cannot be chosen. It stays in the list, disabled but reachable with the arrow
   * keys, and the reason is read with it and shown in a tooltip, which a tap opens too.
   */
  disabledReason?: string
}

/**
 * One option. The check ends the row in muted ink, as in a menu, so the label keeps the row's
 * inset whether or not the option carries a leading glyph.
 */
function SelectItem({
  className,
  children,
  label,
  prefix,
  disabled,
  disabledReason,
  onPointerUp,
  ...props
}: SelectItemProps) {
  const reason = useDisabledReason(disabledReason, props["aria-describedby"])

  return (
    <Tooltip id={reason.triggerId} tooltip={disabledReason} side="left">
      <SelectPrimitive.Item
        // First, so the caller's description and pointer-up merge with the reason's.
        {...props}
        label={label ?? (typeof children === "string" ? children : undefined)}
        disabled={disabled === true || !!disabledReason}
        aria-describedby={reason.describedBy}
        onPointerUp={event => {
          onPointerUp?.(event)
          reason.onPointerUp(event)
        }}
        className={cn(
          popupItemClasses,
          "group/choice w-full gap-2 px-2 data-selected:text-ink",
          className,
        )}
      >
        {prefix != null && (
          <span className="flex shrink-0 text-ink-muted [&>svg]:size-4">{prefix}</span>
        )}

        <SelectPrimitive.ItemText className="truncate">{children}</SelectPrimitive.ItemText>

        {/* Only the selected row carries the check, so the others give its width to the label;
            `pl-4` on top of the row's gap keeps a floor between the label and the check. */}
        <span
          aria-hidden
          className="ml-auto hidden shrink-0 pl-4 text-ink-muted group-data-selected/choice:flex"
        >
          <SelectPrimitive.ItemIndicator>
            <CheckIcon className="size-4" />
          </SelectPrimitive.ItemIndicator>
        </span>

        {reason.reasonText}
      </SelectPrimitive.Item>
    </Tooltip>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return <SelectPrimitive.Separator className={cn(popupSeparatorClasses, className)} {...props} />
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
