"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { type ReactNode, useId } from "react"
import { formatIdList } from "../lib/aria"
import { descriptionClasses } from "../lib/classes"
import { interactiveVariants } from "../lib/interactive"
import { cn } from "../lib/variants"
import { useDisabledReason } from "./disabled-reason"
import { showTooltip, Tooltip } from "./tooltip"

/**
 * One choice out of a few, each shown at once with what it means. Arrow keys move the choice,
 * as in any radio group. A choice between two states is a `Switch`; a longer list is a
 * `Select`.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return <RadioGroupPrimitive className={cn("flex flex-col gap-2", className)} {...props} />
}

/**
 * The 16px round control, raised on `Checkbox`'s strong edge and filled with the brand once
 * chosen. A `RadioCard` keeps its own lighter card edge around it. Base UI renders a
 * `<span role="radio">` beside a hidden input, so a disabled one carries `data-disabled` rather
 * than matching `:disabled`, as with `Checkbox`.
 */
function Radio({ className, ...props }: RadioPrimitive.Root.Props) {
  // Merged outside `variants`, which cannot take Base UI's state-function `className`.
  return (
    <RadioPrimitive.Root
      className={cn(
        interactiveVariants({ interactive: false }),
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-surface shadow-control",
        "data-checked:border-brand data-checked:bg-brand/80",
        "hover:not-data-disabled:not-data-checked:border-edge-solid",
        "not-data-disabled:cursor-pointer data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-1.5 rounded-full bg-brand-on" />
    </RadioPrimitive.Root>
  )
}

interface RadioCardProps extends Omit<RadioPrimitive.Root.Props, "children"> {
  label: ReactNode
  /** What the choice means, under the label. */
  description?: ReactNode
  /** Beside the label, e.g. a "Default" badge. */
  badge?: ReactNode
  /**
   * Why the choice cannot be made. The radio turns read-only rather than disabled, so the arrow
   * keys still reach it, which they skip on a disabled one; the reason is read with it and shown
   * in a tooltip, which a tap opens too.
   */
  disabledReason?: string
}

/**
 * A choice as a card: the radio, then its label and what it means. The whole card is the
 * `<label>`, so a click anywhere on it picks the choice; the chosen card takes the fill.
 */
function RadioCard({
  label,
  description,
  badge,
  disabledReason,
  readOnly,
  className,
  ...props
}: RadioCardProps) {
  const id = useId()
  const descriptionId = `${id}-description`
  const reason = useDisabledReason(
    disabledReason,
    formatIdList(!!description && descriptionId, props["aria-describedby"]),
  )

  return (
    <Tooltip id={reason.triggerId} tooltip={disabledReason} side="top">
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- the radio inside takes the keyboard; the click only opens the reason for a tap */}
      <label
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-surface px-3.5 py-3 transition-colors duration-75",
          "has-data-checked:bg-fill",
          "has-data-disabled:pointer-events-none has-data-disabled:opacity-50",
          disabledReason
            ? "cursor-not-allowed opacity-50"
            : "hover:not-has-data-checked:bg-fill-subtle",
          className,
        )}
        onClick={disabledReason ? () => showTooltip(reason.triggerId) : undefined}
      >
        {/* The card dims as a whole, so the radio does not dim a second time inside it. */}
        <Radio
          // First, so the caller's description merges with the card's own and the reason's.
          {...props}
          aria-labelledby={id}
          aria-describedby={reason.describedBy}
          readOnly={readOnly === true || !!disabledReason}
          className={cn("mt-0.5 data-disabled:opacity-100", disabledReason && "cursor-not-allowed")}
        />

        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 font-medium text-sm">
            <span id={id}>{label}</span>
            {badge}
          </span>
          {description && (
            <span id={descriptionId} className={descriptionClasses}>
              {description}
            </span>
          )}
        </span>

        {reason.reasonText}
      </label>
    </Tooltip>
  )
}

export { Radio, RadioCard, RadioGroup }
