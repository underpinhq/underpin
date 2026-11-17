import type { ComponentProps } from "react"
import { cn } from "../lib/variants"

interface CollapseProps extends ComponentProps<"div"> {
  open: boolean
}

/**
 * Content grown to its own height or folded to nothing, animated both ways. It stays mounted
 * so closing animates too, and the `0fr`/`1fr` grid row is what makes an unknown height
 * animatable at all. It is `inert` while folded, since zero height hides it from the eye and
 * nothing else. Reduced motion keeps the fade and snaps the height. The clipping box reaches
 * one pixel past the content on every side, since a focus outline is drawn past a control's box
 * and a flush clip would cut it off.
 */
export function Collapse({ open, className, children, ...props }: CollapseProps) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-250 ease-out-expo",
        "motion-reduce:transition-[opacity] motion-reduce:duration-150",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
      {...props}
    >
      <div className="-m-px min-h-0 overflow-hidden p-px">{children}</div>
    </div>
  )
}
