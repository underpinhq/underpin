import type { ComponentProps } from "react"
import { cn } from "../lib/variants"

/**
 * Buttons joined into one control. Each member keeps its own border and the group draws
 * nothing: every member after the first drops its left border, so the edge of the one before it
 * is the divider. Edges are translucent, so two borders laid over each other would draw a darker
 * seam. The inner corners square off. Meant for bordered (`secondary`) buttons. A hovered, open
 * or focused member is lifted above its neighbours, so its focus outline runs round all four
 * sides. A pressed member stays in line, since a 1px drop would step it out of the group, and
 * darkens instead.
 *
 * The ends are found among the members, not the children: an open popup trigger gets
 * focus-guard and `aria-owns` spans rendered beside it, a member under `DisabledReason` a
 * `hidden` reason, and `:first-child` would move off the button onto one of those. A guard is
 * matched by its `data-base-ui-focus-guard` attribute, not `aria-hidden`: in Safari, Base UI
 * gives it `role="button"` in place of `aria-hidden`, for VoiceOver.
 */
export function ButtonGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex [&>*]:relative [&>*]:rounded-none",
        "[&>*]:active:translate-y-0! [&>:not([aria-disabled=true])]:active:bg-fill!",
        "[&>*:hover]:z-10 [&>*:focus-visible]:z-10 [&>*[data-popup-open]]:z-10",
        "[&>:nth-child(1_of_:not([data-base-ui-focus-guard]):not([aria-owns]):not([hidden]))]:rounded-l-md",
        "[&>:nth-last-child(1_of_:not([data-base-ui-focus-guard]):not([aria-owns]):not([hidden]))]:rounded-r-md",
        "[&>:not(:nth-child(1_of_:not([data-base-ui-focus-guard]):not([aria-owns]):not([hidden])))]:border-l-0",
        className,
      )}
      {...props}
    />
  )
}
