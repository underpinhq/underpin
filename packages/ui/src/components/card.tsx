import { useRender } from "@base-ui/react/use-render"
import type { ComponentProps } from "react"
import { cn, variants, type VariantProps } from "../lib/variants"
import { SectionHeader } from "./section-header"

/**
 * The one raised surface in the app: a white panel on the canvas, `lg` corners, clipping whatever
 * sits in its corners, with a 1px border and `shadow-card` under it. A card that links somewhere
 * lifts to `shadow-card-hover` under the pointer and sinks onto the page under a press. Every
 * card, list card and stat strip is this recipe; change it here and it changes everywhere.
 */
export const cardSurfaceClasses = "overflow-clip rounded-lg border bg-surface shadow-card"

/**
 * A card with one link across it, pressed: it drops 1px and loses its shadow. The link carries
 * `data-press-target`, so a press on a button inside the card leaves the card alone. A fixed 1px
 * rather than a scale, since a card's text would re-rasterise in a scale. While held, the link's
 * target reaches past the card's top edge, or a press on its first row would release off the link
 * and lose the click. The card stops clipping for that moment, or the target would be cut off.
 */
export const cardPressClasses =
  "transition-[box-shadow,translate] duration-150 ease-out-expo has-[[data-press-target]:active]:translate-y-px has-[[data-press-target]:active]:shadow-none has-[[data-press-target]:active]:duration-75 has-[[data-press-target]:active]:overflow-visible has-[[data-press-target]:active]:[&_[data-press-target]]:after:-top-0.5"

const cardVariants = variants({
  base: [
    cardSurfaceClasses,
    "relative flex flex-col transition-[box-shadow,translate] duration-150 ease-out-expo hover:[&[href]]:z-10 hover:[&[href]]:shadow-card-hover active:[&[href]]:translate-y-px active:[&[href]]:shadow-none active:[&[href]]:duration-75",
  ],

  variants: {
    /**
     * Separate the children with hairlines, for a card whose body is a run of rows or panels.
     */
    divided: {
      true: "divide-y",
    },
  },
})

const cardPanelVariants = variants({
  base: "border-t first:border-t-0",

  variants: {
    size: {
      /** No padding of its own, for a panel that sets an inset per side. */
      none: "",
      md: "p-4 md:p-5",
      lg: "p-6 md:p-8",
    },
  },

  defaultVariants: {
    size: "md",
  },
})

/**
 * The card heading: `SectionHeader` preset to the card scale (an `h4` title, tight spacing). Pass
 * `size="panel"` for the smaller dashboard-panel scale.
 */
function CardHeader(props: ComponentProps<typeof SectionHeader>) {
  return <SectionHeader size="card" {...props} />
}

export type CardProps = useRender.ComponentProps<"div"> & VariantProps<typeof cardVariants>

function Card({ render, className, divided, ...props }: CardProps) {
  return useRender({
    render,
    defaultTagName: "div",
    props: { className: cardVariants({ divided, className }), ...props },
  })
}

/**
 * The action band under a card's body: hairline above, the canvas colour rather than the
 * card's, and the buttons right-aligned with the secondary before the primary. Every card
 * that carries the actions for its own body wears it, so the controls never float loose
 * under the surface they belong to. Content before the buttons takes `mr-auto` to stay left.
 *
 * The band sets the control type scale, which the buttons in it already carry: it is there so
 * an `InlineAction`, which takes its size from the strip around it, lines up with them.
 */
function CardFooter({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    render,
    defaultTagName: "div",
    props: {
      className: cn(
        "flex flex-wrap items-center justify-end gap-2 border-t bg-canvas p-4 md:px-5",
        "text-control",
        className,
      ),
      ...props,
    },
  })
}

export type CardPanelProps = useRender.ComponentProps<"div"> &
  VariantProps<typeof cardPanelVariants>

function CardPanel({ className, render, size, ...props }: CardPanelProps) {
  return useRender({
    render,
    defaultTagName: "div",
    props: {
      className: cardPanelVariants({ size, className }),
      ...props,
    },
  })
}

export { Card, CardFooter, CardHeader, CardPanel }
