"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { type ComponentProps, Fragment, type ReactElement, type ReactNode } from "react"
import { tooltipAnimationClasses, tooltipLabelClasses, tooltipSurfaceClasses } from "../lib/classes"
import { cn } from "../lib/variants"

export interface TooltipFigure {
  label: ReactNode
  value: ReactNode
}

/**
 * A heading over a small table of labelled figures: what a tooltip holds when it reports on
 * something rather than explaining a control. One component so every such tooltip in the app
 * is composed the same way, whichever surface raised it: a breakdown row, a point on a chart.
 * The figures right-align as a block against the labels, so the numbers read down a column.
 */
export function TooltipFigures({
  title,
  figures,
}: {
  title?: ReactNode
  figures: TooltipFigure[]
}) {
  return (
    <>
      {title && <div className="font-medium break-words">{title}</div>}
      {figures.length > 0 && (
        <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          {figures.map((figure, index) => (
            <Fragment key={index}>
              <span className={tooltipLabelClasses}>{figure.label}</span>
              {/* The figures carry the weight and the labels are muted, so the eye runs down
                  the numbers and reads a label only where it stops. A figure never wraps: the
                  label beside it gives way instead. */}
              <span className="text-right font-medium tabular-nums whitespace-nowrap">
                {figure.value}
              </span>
            </Fragment>
          ))}
        </div>
      )}
    </>
  )
}

const TooltipRoot = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * `default` is one line beside its anchor. Its ceiling sits far above a label's length, so a
 * sentence of explanation stays on one line too, and text that does run past it wraps
 * left-aligned: a centred ragged block reads as a mistake. `rich` is a small panel: roomier,
 * for a stack of labelled figures rather than a sentence. The panel has a floor as well as a
 * ceiling on its width, so a short report ("Russia", four figures) gets the same room as a
 * long one and the two never read as different tooltips.
 */
type TooltipVariant = "default" | "rich"

const tooltipVariantClasses: Record<TooltipVariant, string> = {
  default:
    "max-w-[min(32rem,calc(100vw-2rem))] inline-flex items-center gap-2 px-3 py-1.5 text-start",
  rich: "pointer-events-none block min-w-44 max-w-72 px-3 py-2 text-start",
}

/** The tooltip surface with a variant's shape: what every tooltip panel in the app is made of. */
function tooltipPanelClasses(variant: TooltipVariant) {
  return cn(tooltipSurfaceClasses, tooltipVariantClasses[variant])
}

/**
 * A tooltip's panel on its own, for a surface something other than the tooltip primitive
 * positions: a chart's hover card, a map's. It looks exactly like `TooltipContent`, which
 * it shares its classes with, so a report reads the same wherever it pops up.
 */
function TooltipPanel({
  variant = "default",
  className,
  ...props
}: ComponentProps<"div"> & { variant?: TooltipVariant }) {
  return <div className={cn(tooltipPanelClasses(variant), className)} {...props} />
}

/**
 * The pointer from the popup to its anchor: a 12×6 window on a square of the popup's own fill
 * stood on its corner, so what shows is a wide shallow triangle rather than the steep notch a
 * whole corner cuts. The window clips the half that would fall inside the panel, which is what
 * leaves the hairline running down both slopes and open across the base where the two meet.
 * Base UI places the window along the anchor and says which side the popup is on.
 */
function TooltipArrow() {
  return (
    <TooltipPrimitive.Arrow
      className={cn(
        "tooltip-arrow relative block h-[6px] w-3 overflow-clip",
        // The offsets are measured from inside the panel's border, so pulling the window its own
        // depth lands it over that border: the fill opens the line across the mouth and the
        // slopes start where the line stops, not a pixel inside or outside it.
        "data-[side=bottom]:-top-[6px]",
        "data-[side=top]:-bottom-[6px] data-[side=top]:rotate-180",
        "data-[side=left]:-right-[9px] data-[side=left]:rotate-90",
        "data-[side=right]:-left-[9px] data-[side=right]:-rotate-90",
      )}
    >
      {/* The corner that ends up as the tip is rounded, so the point reads as drawn rather
          than as a shard of the panel. */}
      <div className="absolute bottom-0 left-1/2 size-[calc(0.375rem*1.4142)] -translate-x-1/2 translate-y-1/2 rotate-45 rounded-tl-[3px] border border-edge-float bg-overlay" />
    </TooltipPrimitive.Arrow>
  )
}

/**
 * The offset is measured to the panel's edge, and the arrow hangs 6px beyond it. Eight leaves a
 * 2px gap between the arrow's tip and the anchor, so the tip never touches what it points at.
 */
function TooltipContent({
  className,
  sideOffset = 8,
  side,
  align,
  variant = "default",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "sideOffset" | "side" | "align"> & {
    variant?: TooltipVariant
  }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        sideOffset={sideOffset}
        side={side}
        align={align}
        className="tooltip-positioner isolate z-50"
      >
        <TooltipPrimitive.Popup
          className={cn(
            "relative z-50",
            tooltipPanelClasses(variant),
            tooltipAnimationClasses,
            className,
          )}
          {...props}
        >
          <TooltipArrow />
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

/**
 * What a trigger hands the shared popup: its content and the shape to draw it in. Base UI keeps
 * the payload of whichever trigger is active, so the panel re-reads all of it on every move and
 * a plain tooltip can hand over to a rich one without closing.
 */
interface TooltipPayload {
  content: ReactNode
  variant: TooltipVariant
  side: TooltipPrimitive.Positioner.Props["side"]
  align: TooltipPrimitive.Positioner.Props["align"]
  /** Classes for the panel, e.g. a width a variant's own ceiling is too low for. */
  className?: string
}

const tooltipHandle = TooltipPrimitive.createHandle<TooltipPayload>()

/**
 * The shared delay for every tooltip, and the single popup they all share. One popup means the
 * pointer moving from one trigger to the next slides the panel over rather than closing it and
 * opening another in place, which is why each `Tooltip` renders a trigger and nothing else.
 */
function TooltipProvider({ children, ...props }: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider {...props}>
      {children}

      {/* A tooltip explains or reports; nothing in it is clicked, so it closes the moment the
          pointer leaves the trigger rather than lingering while the pointer crosses the popup. */}
      <TooltipRoot handle={tooltipHandle} disableHoverablePopup>
        {({ payload }) => (
          <TooltipContent
            side={payload?.side}
            align={payload?.align}
            variant={payload?.variant ?? "default"}
            className={payload?.className}
          >
            {payload?.content}
          </TooltipContent>
        )}
      </TooltipRoot>
    </TooltipPrimitive.Provider>
  )
}

interface TooltipProps extends Pick<TooltipPrimitive.Positioner.Props, "side" | "align"> {
  /** Names the trigger for `showTooltip`. The element keeps an id of its own, if it has one. */
  id?: string
  children: ReactElement
  tooltip: ReactNode
  variant?: TooltipVariant
  /** Classes for the panel, e.g. a width a variant's own ceiling is too low for. */
  className?: string
}

function Tooltip({
  id,
  children,
  tooltip,
  side,
  align,
  variant = "default",
  className,
}: TooltipProps) {
  if (!tooltip) return children

  return (
    <TooltipTrigger
      id={id}
      handle={tooltipHandle}
      payload={{ content: tooltip, variant, side, align, className }}
      render={children}
    />
  )
}

/**
 * Opens the tooltip of the trigger with this `id`. A tooltip opens on hover and keyboard focus
 * alone, so a tap on a touch screen needs this to show one.
 */
function showTooltip(triggerId: string) {
  tooltipHandle.open(triggerId)
}

export {
  showTooltip,
  Tooltip,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipPanel,
  TooltipProvider,
}
