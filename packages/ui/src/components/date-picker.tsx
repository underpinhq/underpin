"use client"

import { useState } from "react"
import { dateToDay, dayToDate } from "../lib/day"
import { Button } from "./button"
import { Calendar, useCalendarFocus } from "./calendar"
import { DatePickerTrigger } from "./date-picker-trigger"
import { DisabledReason } from "./disabled-reason"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export interface DatePickerProps {
  /** The selected day as "YYYY-MM-DD", or empty for none. */
  value?: string

  onChange: (value: string) => void

  /** Earliest and latest selectable day, both "YYYY-MM-DD" and both inclusive. */
  min?: string
  max?: string

  /** Shown on the trigger while nothing is selected. */
  placeholder?: string

  /**
   * Names the selected "YYYY-MM-DD" day on the trigger. The app supplies it, so the day reads
   * in the app's own locale and time zone like every other date beside it.
   */
  formatDay: (day: string) => string

  /**
   * Lets the reader remove the date: a second click on the selected day, or the Clear button
   * under the calendar. Set it on an optional date; a required one only ever changes.
   */
  clearable?: boolean

  id?: string
  disabled?: boolean
  /** Why the date cannot be changed: the trigger stays focusable, reads it, and never opens. */
  disabledReason?: string
  className?: string

  /** Labels the trigger for screen readers, for a field with no visible `<label>`. */
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  "aria-required"?: boolean
  onBlur?: () => void
}

/**
 * A single date, picked from a calendar in a popover. Replaces `<input type="date">`, whose
 * widget every browser draws its own way and none of them on brand.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder,
  formatDay,
  clearable = false,
  id,
  disabled,
  disabledReason,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const { ref: calendarRef, initialFocus } = useCalendarFocus()
  const selected = dayToDate(value)
  const before = dayToDate(min)
  const after = dayToDate(max)

  function pick(date: Date | undefined) {
    onChange(date ? dateToDay(date) : "")
    setOpen(false)
  }

  return (
    // A trigger under a reason takes the pointer, so a request to open is dropped here too.
    <Popover open={open} onOpenChange={next => setOpen(next && !disabledReason)}>
      <DisabledReason reason={disabledReason}>
        <PopoverTrigger
          id={id}
          {...props}
          render={
            <DatePickerTrigger
              value={value}
              placeholder={placeholder}
              formatDay={formatDay}
              disabled={disabled}
              className={className}
            />
          }
        />
      </DisabledReason>

      <PopoverContent
        ref={calendarRef}
        align="start"
        initialFocus={initialFocus}
        className="w-auto min-w-0 p-4"
      >
        <Calendar
          mode="single"
          required={!clearable}
          // Not the DOM attribute: it seeds react-day-picker's own focused day, which its arrow
          // keys move from. `initialFocus` on the popup puts the browser's focus on that same
          // day; Base UI would otherwise take it to the back arrow and the two would disagree.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          // react-day-picker opens on today unless told otherwise; it does not read `selected`.
          defaultMonth={selected}
          selected={selected}
          startMonth={before}
          endMonth={after}
          disabled={[...(before ? [{ before }] : []), ...(after ? [{ after }] : [])]}
          onSelect={pick}
        />

        {clearable && selected && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => pick(undefined)}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
