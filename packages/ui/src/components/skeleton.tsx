import { useRender } from "@base-ui/react/use-render"
import { cn } from "../lib/variants"

/**
 * Loading stand-in in the fill, the same colour as a `BarList` bar, so every
 * skeleton across a page reads as one thing. Size it with `className`; pass `render` for a
 * different element, e.g. `render={<span />}` inside a paragraph. Hidden from screen readers:
 * the container it stands in for says it is loading with `aria-busy`.
 */
export function Skeleton({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    render,
    defaultTagName: "div",
    props: {
      "aria-hidden": true,
      className: cn("animate-pulse rounded-md bg-fill motion-reduce:animate-none", className),
      ...props,
    },
  })
}
