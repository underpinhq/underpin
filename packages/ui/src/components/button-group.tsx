import type { ComponentProps } from "react"
import { cn } from "../lib/variants"

/**
 * Buttons joined into one control, meant for bordered (`secondary`) buttons. The group only
 * shapes its members: every member after the first drops its left border, so the edge of the one
 * before it is the divider, and the inner corners square off. Edges are translucent, so two
 * borders laid over each other would draw a darker seam. Each member paints its fill inside its
 * border, over the group's surface, so every edge lies on the same colour, and a hovered or
 * pressed fill cannot darken three of a member's edges and not the fourth, which its neighbour
 * draws. The group's corners are a medium button's.
 *
 * Each member's states stay its own, and `Button` keeps them inside its box when it sits in a
 * group (the `ui-standalone` variant in `styles.css`): no darker edge on hover, no drop on press,
 * a disabled member keeps its edge.
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
      data-slot="button-group"
      className={cn(
        "inline-flex rounded-md bg-surface [&>*]:bg-clip-padding",
        "[&>:not(:nth-child(1_of_:not([data-base-ui-focus-guard]):not([aria-owns]):not([hidden])))]:rounded-l-none",
        "[&>:not(:nth-child(1_of_:not([data-base-ui-focus-guard]):not([aria-owns]):not([hidden])))]:border-l-0",
        "[&>:not(:nth-last-child(1_of_:not([data-base-ui-focus-guard]):not([aria-owns]):not([hidden])))]:rounded-r-none",
        className,
      )}
      {...props}
    />
  )
}
