"use client"

import { Fragment, type ReactNode, type Ref } from "react"
import { chevronTurnClasses } from "../lib/classes"
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "../lib/icons"
import { type Shortcut, useShortcuts } from "../lib/shortcuts"
import { Button } from "./button"
import { ButtonGroup } from "./button-group"
import { DisabledReason } from "./disabled-reason"
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "./menu"
import { ShortcutKeys } from "./shortcut-keys"
import { Tooltip } from "./tooltip"

export interface RangePickerPreset<T extends string | number> {
  /** What the row stands for, handed to `onChange`. Unique across every group. */
  value: T
  label: string
  /**
   * A single key that picks the row from anywhere on the page, printed beside it: `"D"` or
   * `"d"`, matched on the character the key produces.
   */
  shortcut?: string
}

export interface RangePickerStep {
  /** The button's accessible name, and its row in the shortcuts dialog: "Earlier period". */
  label: string
  /** The tooltip: the name of the range a click moves to. */
  target?: ReactNode
  /** Greys the button out and says why, at a bound: "No data before this period." */
  disabledReason?: string
  onStep: () => void
}

export interface RangePickerProps<T extends string | number> {
  /** The picked row, or `undefined` while the range is one no row names. */
  value: T | undefined
  /**
   * The trigger's text: the range's name. Defaults to the picked row's label, so only a range no
   * row names needs one.
   */
  label?: ReactNode
  /** The menu's rows, in the groups a separator divides. */
  presets: RangePickerPreset<T>[][]
  /** Runs on every click of a row, the picked one included, so a row can reopen its own panel. */
  onChange: (value: T) => void
  /** The step back, on `←`. Without it, the control has no arrow buttons. */
  previous?: RangePickerStep
  /** The step forward, on `→`. */
  next?: RangePickerStep
  /** The menu's accessible name, and the section its shortcuts list under. */
  menuLabel?: string
  /** Further shortcuts listed in the same section, after the control's own. */
  shortcuts?: Omit<Shortcut, "group">[]
  /**
   * Rows after the presets: a comparison, a bucket-size switch. Start each group with a
   * `MenuSeparator`.
   */
  children?: ReactNode
  onOpenChange?: (open: boolean) => void
  /** The whole control, arrows included: a panel that opens from a row lines up with it. */
  ref?: Ref<HTMLDivElement>
  className?: string
}

/**
 * A stats page's date range: a menu of preset ranges with optional steps to the previous and
 * next range. It sits in the toolbar under the page header, and the range it picks lives in the
 * URL. Both arrows sit after the label, on the control's fixed right edge: the label changes
 * width on every step, and an arrow before it would drift out from under a cursor clicking
 * repeatedly. An arrow at a bound is greyed out rather than hidden.
 */
export function RangePicker<T extends string | number>({
  value,
  label,
  presets,
  onChange,
  previous,
  next,
  menuLabel = "Date range",
  shortcuts = [],
  children,
  onOpenChange,
  ref,
  className,
}: RangePickerProps<T>) {
  function stepBy(step: RangePickerStep) {
    if (!step.disabledReason) step.onStep()
  }

  useShortcuts(
    [
      ...presets.flat().flatMap(preset =>
        preset.shortcut
          ? [
              {
                keys: preset.shortcut.toLowerCase(),
                label: preset.label,
                handler: () => onChange(preset.value),
              },
            ]
          : [],
      ),
      ...(previous
        ? [{ keys: "left", label: previous.label, handler: () => stepBy(previous) }]
        : []),
      ...(next ? [{ keys: "right", label: next.label, handler: () => stepBy(next) }] : []),
      ...shortcuts,
    ].map(shortcut => ({ ...shortcut, group: menuLabel })),
  )

  function arrow(step: RangePickerStep, direction: "previous" | "next") {
    const Icon = direction === "previous" ? ChevronLeftIcon : ChevronRightIcon
    const button = (
      <Button
        variant="secondary"
        prefix={<Icon />}
        aria-label={step.label}
        disabled={!!step.disabledReason}
        onClick={() => stepBy(step)}
      />
    )

    if (step.disabledReason) {
      return <DisabledReason reason={step.disabledReason}>{button}</DisabledReason>
    }

    if (!step.target) return button

    return (
      <Tooltip
        tooltip={
          <>
            {step.target}
            <span className="opacity-60">{direction === "previous" ? "←" : "→"}</span>
          </>
        }
      >
        {button}
      </Tooltip>
    )
  }

  return (
    <ButtonGroup ref={ref} className={className}>
      <Menu onOpenChange={onOpenChange}>
        <MenuTrigger
          render={
            <Button
              variant="secondary"
              prefix={<CalendarIcon />}
              suffix={<ChevronDownIcon className={chevronTurnClasses} />}
              className="flex-1 tabular-nums"
            />
          }
        >
          {label ?? presets.flat().find(preset => preset.value === value)?.label}
        </MenuTrigger>

        <MenuContent label={menuLabel} align="end">
          {presets.map((group, index) => (
            <Fragment key={index}>
              {index > 0 && <MenuSeparator />}

              {/* Each group checks its own row; one with nothing picked holds a value no row
                  has, which keeps it controlled. */}
              <MenuRadioGroup value={group.some(preset => preset.value === value) ? value : null}>
                {group.map(preset => (
                  <MenuRadioItem
                    key={preset.value}
                    value={preset.value}
                    closeOnClick
                    shortcut={
                      preset.shortcut && (
                        <ShortcutKeys
                          keys={preset.shortcut}
                          variant="plain"
                          className="pointer-coarse:hidden"
                        />
                      )
                    }
                    onClick={() => onChange(preset.value)}
                  >
                    {preset.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </Fragment>
          ))}

          {children}
        </MenuContent>
      </Menu>

      {previous && arrow(previous, "previous")}
      {next && arrow(next, "next")}
    </ButtonGroup>
  )
}
