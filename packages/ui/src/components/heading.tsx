import { useRender } from "@base-ui/react/use-render"
import type { ElementType, JSX } from "react"
import { variants, type VariantProps } from "../lib/variants"

const headingVariants = variants({
  base: "font-display font-medium",

  variants: {
    size: {
      // Balanced: an even last line beats a ragged edge. `h5`/`h6` are label-sized and fit
      // one line, so they skip the cost.
      h1: "text-3xl text-balance font-semibold md:text-4xl",
      h2: "text-2xl text-balance font-semibold md:text-3xl",
      h3: "text-2xl text-balance",
      h4: "text-xl text-balance",
      h5: "text-base font-medium tracking-micro",
      h6: "text-sm font-medium",
    },
  },

  defaultVariants: {
    size: "h3",
  },
})

export type HeadingProps = Omit<useRender.ComponentProps<"h2">, "size"> &
  VariantProps<typeof headingVariants> & {
    /**
     * Render as a different element type (h1–h6, span, ...).
     */
    as?: ElementType
  }

function Heading({ className, as, render, size, ...props }: HeadingProps) {
  return useRender({
    render,
    defaultTagName: (as ?? size ?? "h2") as keyof JSX.IntrinsicElements,
    props: { className: headingVariants({ size, className }), ...props },
  })
}

function H5(props: HeadingProps) {
  return <Heading size="h5" {...props} />
}

function H6(props: HeadingProps) {
  return <Heading size="h6" {...props} />
}

export { H5, H6, Heading }
