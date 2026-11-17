"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import {
  POPUP_SIDE_OFFSET,
  popoverAnimationClasses,
  popupBackdropClasses,
  popupSurfaceClasses,
} from "../lib/classes"
import { cn } from "../lib/variants"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger

function PopoverContent({
  className,
  align = "center",
  side,
  sideOffset = POPUP_SIDE_OFFSET,
  anchor,
  collisionAvoidance,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset" | "anchor" | "collisionAvoidance"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Backdrop className={popupBackdropClasses} />
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        collisionAvoidance={collisionAvoidance}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          className={cn(
            popupSurfaceClasses,
            "min-w-72 w-(--anchor-width) p-4 outline-hidden",
            popoverAnimationClasses,
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverContent, PopoverTrigger }
