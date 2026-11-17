"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { createContext, isValidElement, type JSX, memo, use, useState } from "react"
import {
  SEGMENTED_INDICATOR_BOX,
  SEGMENTED_UNMEASURED_KEY,
  type SegmentedStyle,
  segmentedVariants,
  useSegmentedIndicator,
} from "../lib/segmented"
import { cn, type VariantProps } from "../lib/variants"

// The parts below merge `className` outside the variants call, unlike everywhere else: Base UI
// types it as a function of the part's own state too, which `variants` cannot take.

const SegmentedControlContext = createContext<SegmentedStyle>({
  variant: "segmented",
  size: "md",
})

export type SegmentedControlProps<Value> = RadioGroupPrimitive.Props<Value> &
  VariantProps<typeof segmentedVariants>

/**
 * One choice out of a few short options, drawn as a row with a pill behind the chosen one: a
 * theme, a billing interval, the framework a snippet is written for. It is a radio group, so
 * the arrow keys move the choice and a screen reader announces "radio, 2 of 3"; a row whose
 * options each show a panel of their own is `Tabs`.
 *
 * The pill is measured after layout. Until then the checked option paints its own fill, so a
 * server render, or a page before hydration, already shows the choice.
 */
function SegmentedControl<Value>({
  className,
  children,
  variant = "segmented",
  size = "md",
  value,
  defaultValue,
  onValueChange,
  ...props
}: SegmentedControlProps<Value>) {
  // Followed here only to know when to measure again; Base UI still owns the value.
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const ref = useSegmentedIndicator(value ?? uncontrolled)

  const slots = segmentedVariants({ variant, size })

  return (
    <SegmentedControlContext value={{ variant, size }}>
      <RadioGroupPrimitive
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          slots.root(),
          variant === "segmented"
            ? SEGMENTED_UNMEASURED_KEY
            : "[&:not([data-measured])_[data-checked]]:bg-fill",
          className,
        )}
        onValueChange={(next, eventDetails) => {
          setUncontrolled(next)
          onValueChange?.(next, eventDetails)
        }}
        {...props}
      >
        <span aria-hidden className={slots.indicator({ className: SEGMENTED_INDICATOR_BOX })} />
        {children}
      </RadioGroupPrimitive>
    </SegmentedControlContext>
  )
}

export type SegmentedControlItemProps<Value> = RadioPrimitive.Root.Props<Value>

/**
 * One option in a `SegmentedControl`; its children are its label. Memoised, as a row
 * re-renders with its card and its options rarely change with it; `memo` drops the `Value`
 * parameter, so the cast below puts it back.
 */
const SegmentedControlItem = memo(function SegmentedControlItem<Value>({
  className,
  ...props
}: SegmentedControlItemProps<Value>) {
  const { variant, size } = use(SegmentedControlContext)
  // Named by `aria-label` and showing one element: an icon, drawn as a square.
  const icon = Boolean(props["aria-label"]) && isValidElement(props.children)

  return (
    <RadioPrimitive.Root
      className={cn(
        segmentedVariants({ variant, size, icon }).item(),
        "not-data-disabled:cursor-pointer data-disabled:opacity-50 data-checked:text-ink",
        className,
      )}
      {...props}
    />
  )
}) as <Value>(props: SegmentedControlItemProps<Value>) => JSX.Element

export { SegmentedControl, SegmentedControlItem }
