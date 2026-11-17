"use client"

import {
  SegmentedControl,
  SegmentedControlItem,
  type SegmentedControlProps,
} from "./segmented-control"

export interface ViewPickerProps<T extends string> extends Omit<
  SegmentedControlProps<T>,
  "value" | "defaultValue" | "onValueChange" | "onChange"
> {
  value: T
  /**
   * The view that maps to no `?view=` param, so the URL stays clean on the default view.
   */
  defaultValue: T
  options: { value: T; label: string }[]
  onChange: (view: T | undefined) => void
}

/**
 * View switcher bound to a route's `view` search param: `segmented` (default) for a header,
 * `plain` inside a card. Emits `undefined` for the default view so the route can drop it from
 * the URL instead of writing `?view=<default>`. It is a radio group, so each arrow key writes
 * the next view to the URL as it moves.
 */
export function ViewPicker<T extends string>({
  value,
  defaultValue,
  options,
  onChange,
  ...props
}: ViewPickerProps<T>) {
  return (
    <SegmentedControl
      value={value}
      onValueChange={(next: T) => onChange(next === defaultValue ? undefined : next)}
      {...props}
    >
      {options.map(option => (
        <SegmentedControlItem key={option.value} value={option.value}>
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
