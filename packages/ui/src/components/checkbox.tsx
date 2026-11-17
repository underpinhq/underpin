"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, DashIcon } from "../lib/icons"
import { interactiveVariants } from "../lib/interactive"
import { cn } from "../lib/variants"

/**
 * A checkbox with a mixed state (`indeterminate`), for a matrix of settings, for the row that
 * stands for several others (`role="switch"` has no mixed state), and for an option of a
 * one-off action inside a dialog. A lone setting that stays on or off is a `Switch`.
 *
 * Unchecked, it is a raised box on the strong edge, a step above the plain one, which is too
 * faint to find a 16px box by; under the pointer the edge darkens a step. Checked or mixed, it
 * fills with the brand at 80%, a shade lighter than its edge, as a switch's track does. Base UI
 * renders a `<span role="checkbox">` beside a hidden input, so a disabled one carries
 * `data-disabled` rather than matching `:disabled`, as with `Switch`. Wrap it in a `<label>` with
 * its text, or point `aria-labelledby` at the text.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  // Merged outside `variants`, which cannot take Base UI's state-function `className`.
  return (
    <CheckboxPrimitive.Root
      className={cn(
        interactiveVariants({ interactive: false }),
        "inline-flex size-4 shrink-0 items-center justify-center rounded-xs border border-edge-strong bg-surface text-brand-on shadow-control",
        "data-checked:border-brand data-checked:bg-brand/80",
        "data-indeterminate:border-brand data-indeterminate:bg-brand/80",
        "not-data-disabled:cursor-pointer",
        "hover:not-data-disabled:not-data-checked:not-data-indeterminate:border-edge-solid",
        "data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex">
        <CheckIcon
          size={12}
          strokeWidth={2}
          absoluteStrokeWidth
          className="in-data-indeterminate:hidden"
        />
        <DashIcon
          size={12}
          strokeWidth={2}
          absoluteStrokeWidth
          className="hidden in-data-indeterminate:block"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
