"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { interactiveVariants } from "../lib/interactive"
import { cn } from "../lib/variants"

/**
 * Base UI renders the switch as a `<span role="switch">`, so a disabled one carries
 * `data-disabled` and never matches `:disabled`: the state and hover rules key off the data
 * attribute, and the shared pointer cursor is set here for the same reason.
 *
 * The knob is a raised key inset 2px in the track, a well with no edge of its own, the way the
 * chosen option of a segmented control sits in its row. Both are pills, so the knob's curve
 * follows the track's at any inset.
 * Off, the track is the well and the knob carries the strong edge, which darkens under the
 * pointer as a checkbox's does. On, the track and the knob's edge take the brand, the track at
 * 80% so it sits a shade lighter than the knob's edge. In dark the knob is the lighter part: mid
 * grey on the well, near white on the brand.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  // Merged outside `variants`, which cannot take Base UI's state-function `className`.
  return (
    <SwitchPrimitive.Root
      className={cn(
        interactiveVariants({ interactive: false }),
        "group/switch inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 shadow-well",
        "data-unchecked:bg-well data-checked:bg-brand/80 aria-invalid:data-unchecked:bg-danger-subtle",
        "not-data-disabled:not-aria-disabled:cursor-pointer",
        "data-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full border border-edge-strong bg-knob shadow-control transition-[translate,border-color,background-color] duration-200 ease-out-expo",
          "group-hover/switch:not-data-checked:not-data-disabled:border-edge-solid",
          "data-checked:translate-x-4 data-checked:border-brand data-checked:bg-knob-on",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
