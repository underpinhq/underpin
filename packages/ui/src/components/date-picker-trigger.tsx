"use client"

import type { ComponentProps } from "react"
import { CalendarIcon } from "../lib/icons"
import { cn, type VariantProps } from "../lib/variants"
import type { DatePickerProps } from "./date-picker"
import { inputVariants } from "./input"

export type DatePickerTriggerProps = Omit<ComponentProps<"button">, "value" | "children"> &
  Pick<VariantProps<typeof inputVariants>, "size"> &
  Pick<DatePickerProps, "value" | "placeholder" | "formatDay">

/**
 * The date picker's trigger, kept apart from the calendar so a form can show it while the
 * picker itself still loads. It holds a value, so it is a field like a select's trigger, with
 * the field's ground and edge, rather than a button: in a form it sits flush with the inputs
 * around it. A toolbar's period picker runs a command instead and stays a `Button`.
 */
export function DatePickerTrigger({
  value,
  placeholder = "Pick a date",
  formatDay,
  size,
  className,
  ...props
}: DatePickerTriggerProps) {
  return (
    <button
      type="button"
      className={inputVariants({
        interactive: true,
        size,
        className: cn(
          "flex items-center gap-2 text-start tabular-nums",
          "data-popup-open:border-edge-solid data-popup-open:bg-fill-subtle active:not-disabled:bg-fill-subtle",
          className,
        ),
      })}
      {...props}
    >
      <CalendarIcon className="size-3.5 shrink-0 text-ink-muted" />
      <span className={cn("truncate", !value && "text-ink-muted")}>
        {value ? formatDay(value) : placeholder}
      </span>
    </button>
  )
}
