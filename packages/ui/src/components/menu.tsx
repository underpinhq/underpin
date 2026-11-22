"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import type { ComponentProps, ReactNode } from "react"
import {
  POPUP_SIDE_OFFSET,
  popoverAnimationClasses,
  popupBackdropClasses,
  popupGroupLabelClasses,
  popupItemClasses,
  popupSeparatorClasses,
  popupSurfaceClasses,
} from "../lib/classes"
import { CheckIcon, MoreIcon } from "../lib/icons"
import {
  SEGMENTED_INDICATOR_BOX,
  SEGMENTED_UNMEASURED_KEY,
  segmentedVariants,
  useSegmentedIndicator,
} from "../lib/segmented"
import { findShortcutRow, toHotkey } from "../lib/shortcuts"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { useDisabledReason } from "./disabled-reason"
import { Kbd } from "./kbd"
import { Tooltip } from "./tooltip"

/**
 * Not modal: the page keeps scrolling under an open menu, and one press outside both closes it
 * and reaches what is underneath, so moving to the next control takes one click. Base UI's own
 * default is modal.
 */
function Menu<Payload>(props: MenuPrimitive.Root.Props<Payload>) {
  return <MenuPrimitive.Root modal={false} {...props} />
}

const MenuTrigger = MenuPrimitive.Trigger
const MenuGroup = MenuPrimitive.Group
const MenuRadioGroup = MenuPrimitive.RadioGroup

interface MenuChoiceTrailingProps {
  indicator: ReactNode
  shortcut?: ReactNode
}

/**
 * The end of a checkbox or radio row: a 16px check slot, then the shortcut. Only a checked row
 * takes the slot, so an unchecked label runs up to its shortcut; the shortcuts still line up,
 * since the row ends on them. `pl-4` on top of the row's gap is the floor between the label and
 * the shortcut on the widest row of a menu sized to its content.
 */
function MenuChoiceTrailing({ indicator, shortcut }: MenuChoiceTrailingProps) {
  return (
    <span
      className={cn(
        "ml-auto flex shrink-0 items-center gap-2",
        shortcut ? "pl-4" : "group-data-unchecked/choice:hidden",
      )}
    >
      <span
        aria-hidden
        className="flex size-4 items-center justify-center text-ink-muted group-data-unchecked/choice:hidden [&_svg]:size-4"
      >
        {indicator}
      </span>
      {shortcut}
    </span>
  )
}

/** A row the menu shows but will not run: disabled, or held by a reason. */
const DISABLED_ROW_SELECTOR = '[data-disabled],[aria-disabled="true"]'

interface MenuContentProps
  extends
    MenuPrimitive.Popup.Props,
    Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> {
  /** Names the menu for a screen reader: the popup's accessible name. */
  label?: string
}

/**
 * The menu, hanging off its trigger at every width. A menu is a quick pick, so on a phone it
 * opens where the finger already is instead of rising from the bottom edge; only a dialog, which
 * is a task of its own, becomes a sheet.
 */
function MenuContent({
  className,
  sideOffset = POPUP_SIDE_OFFSET,
  align,
  side,
  label,
  children,
  onKeyDownCapture,
  ...props
}: MenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Backdrop className={popupBackdropClasses} />
      <MenuPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          aria-label={label}
          // As wide as the trigger it hangs off, and wider only if a row needs it: a fixed width
          // leaves dead space after every label and a gulf between a label and its shortcut.
          // The cap keeps a tall menu inside the room the screen has on its side of the trigger.
          className={cn(
            popupSurfaceClasses,
            "flex max-h-(--available-height) min-w-[max(10rem,var(--anchor-width))] flex-col overflow-y-auto overscroll-contain p-1 outline-none",
            popoverAnimationClasses,
            className,
          )}
          // The key printed beside a row picks that row, as a click would, before the typeahead
          // can read it as the first letter of another row's label.
          onKeyDownCapture={event => {
            onKeyDownCapture?.(event)
            const row = findShortcutRow(event.currentTarget, event)
            if (!row) return
            event.preventDefault()
            event.stopPropagation()
            if (!row.matches(DISABLED_ROW_SELECTOR)) row.click()
          }}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

interface MenuItemProps extends MenuPrimitive.Item.Props {
  inset?: boolean
  /** An item that deletes or gives something away, set in the danger tone. */
  danger?: boolean
  /**
   * Why the item cannot run. It stays in the menu, disabled but reachable with the arrow keys,
   * and the reason is read with it and shown in a tooltip, which a tap opens too.
   */
  disabledReason?: string
}

function MenuItem({
  className,
  inset,
  danger,
  disabled,
  disabledReason,
  onPointerUp,
  children,
  ...props
}: MenuItemProps) {
  const reason = useDisabledReason(disabledReason, props["aria-describedby"])

  return (
    // Beside the menu, so it covers no other row; it flips to the other side without room.
    <Tooltip id={reason.triggerId} tooltip={disabledReason} side="left">
      <MenuPrimitive.Item
        // First, so the caller's description and pointer-up merge with the reason's.
        {...props}
        disabled={disabled === true || !!disabledReason}
        aria-describedby={reason.describedBy}
        onPointerUp={event => {
          onPointerUp?.(event)
          reason.onPointerUp(event)
        }}
        className={cn(
          popupItemClasses,
          "relative m-0 gap-2 px-2 [&>svg]:size-4 [&>svg]:shrink-0",
          inset && "pl-8",
          danger && "text-danger-ink focus:text-danger-ink data-highlighted:text-danger-ink",
          className,
        )}
      >
        {children}
        {reason.reasonText}
      </MenuPrimitive.Item>
    </Tooltip>
  )
}

function MenuCheckboxItem({
  className,
  children,
  checked,
  shortcut,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  /** A `MenuShortcut` for the item, drawn after the check slot. */
  shortcut?: ReactNode
}) {
  return (
    <MenuPrimitive.CheckboxItem
      className={cn(popupItemClasses, "group/choice gap-2 px-2 data-checked:text-ink", className)}
      checked={checked}
      {...props}
    >
      {children}
      <MenuChoiceTrailing
        indicator={
          <MenuPrimitive.CheckboxItemIndicator>
            <CheckIcon />
          </MenuPrimitive.CheckboxItemIndicator>
        }
        shortcut={shortcut}
      />
    </MenuPrimitive.CheckboxItem>
  )
}

function MenuRadioItem({
  className,
  children,
  shortcut,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  /** A `MenuShortcut` for the item, drawn after the check slot. */
  shortcut?: ReactNode
}) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(popupItemClasses, "group/choice gap-2 px-2 data-checked:text-ink", className)}
      {...props}
    >
      {children}
      <MenuChoiceTrailing
        indicator={
          <MenuPrimitive.RadioItemIndicator>
            <CheckIcon />
          </MenuPrimitive.RadioItemIndicator>
        }
        shortcut={shortcut}
      />
    </MenuPrimitive.RadioItem>
  )
}

const SEGMENTED = segmentedVariants({ size: "xs" })

/**
 * A few short choices on one line, drawn as a segmented row inside a menu row: a chart's bucket
 * size under its range presets. Its options are radio items of the menu, so the arrow keys reach
 * them like any other row and the menu's opening focus never lands on one, which a plain
 * `SegmentedControl` would take. The pill slides between them as it does in that control.
 */
function MenuSegmentedGroup({ className, children, ...props }: MenuPrimitive.RadioGroup.Props) {
  const ref = useSegmentedIndicator(props.value)

  return (
    <MenuPrimitive.RadioGroup
      ref={ref}
      className={cn(SEGMENTED.root(), SEGMENTED_UNMEASURED_KEY, className)}
      {...props}
    >
      <span aria-hidden className={SEGMENTED.indicator({ className: SEGMENTED_INDICATOR_BOX })} />
      {children}
    </MenuPrimitive.RadioGroup>
  )
}

/** One option in a `MenuSegmentedGroup`; its children are its label. Picking it leaves the menu open. */
function MenuSegmentedItem({ className, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(
        SEGMENTED.item(),
        "cursor-pointer select-none data-checked:text-ink data-highlighted:text-ink",
        className,
      )}
      {...props}
    />
  )
}

interface MenuGroupHeaderProps {
  /** The group's heading, drawn as its `MenuGroupLabel`. */
  label: ReactNode
  /** An icon-only `MenuItem` at the heading's end, the group's own action. */
  action?: ReactNode
}

/**
 * A section's heading, in the secondary ink so it reads above the muted group labels inside it,
 * with an optional action beside it, such as a plus that adds to the section. The action is a
 * real menu item, so arrow keys reach it; the label stays text alone.
 */
function MenuGroupHeader({ label, action }: MenuGroupHeaderProps) {
  return (
    <div className="flex items-center gap-1 pr-1">
      <MenuGroupLabel className="flex-1 text-ink-secondary">{label}</MenuGroupLabel>
      {action}
    </div>
  )
}

function MenuGroupLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(popupGroupLabelClasses, inset && "pl-8", className)}
      {...props}
    />
  )
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return <MenuPrimitive.Separator className={cn(popupSeparatorClasses, className)} {...props} />
}

/**
 * A muted note under a menu's rows, such as what its choices apply to. Capped so a long note
 * wraps instead of widening the menu.
 */
function MenuNote({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("max-w-60 px-2 py-1.5 text-ink-muted text-xs", className)} {...props} />
}

/**
 * A row's shortcut: the letters alone, so a column of them does not outweigh the labels. A key
 * written as text is named in `data-shortcut`, so the open menu picks the row when it is pressed.
 */
function MenuShortcut({ className, children, ...props }: ComponentProps<typeof Kbd>) {
  return (
    <Kbd
      data-shortcut={typeof children === "string" ? toHotkey(children) : undefined}
      variant="plain"
      className={cn("ml-auto pointer-coarse:hidden", className)}
      {...props}
    >
      {children}
    </Kbd>
  )
}

interface ActionsMenuProps {
  /** Names the menu and its trigger for a screen reader: "Actions for figma.com". */
  label: string
  /**
   * Where the menu sits: a list row or a card (`row`, a quiet ghost trigger that grows to finger
   * size on a touch screen), or a page header after the page's primary action (`page`, a
   * secondary button as tall as the actions beside it).
   */
  placement?: "row" | "page"
  /** Classes for the trigger, e.g. its place on a card. */
  className?: string
  children: ReactNode
}

/** The "…" menu of a list row, a card or a page header, aligned to the trigger's end. */
function ActionsMenu({ label, placement = "row", className, children }: ActionsMenuProps) {
  const trigger =
    placement === "row" ? (
      <Button
        aria-label={label}
        variant="ghost"
        size="sm"
        prefix={<MoreIcon />}
        className={cn("text-ink-muted pointer-coarse:size-10", className)}
      />
    ) : (
      <Button aria-label={label} variant="secondary" prefix={<MoreIcon />} className={className} />
    )

  return (
    <Menu>
      <MenuTrigger render={trigger} />
      <MenuContent label={label} align="end">
        {children}
      </MenuContent>
    </Menu>
  )
}

export {
  ActionsMenu,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuGroupHeader,
  MenuGroupLabel,
  MenuNote,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSegmentedGroup,
  MenuSegmentedItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
}
