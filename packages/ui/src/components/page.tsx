import type { ComponentProps } from "react"
import { variants, type VariantProps } from "../lib/variants"

const pageVariants = variants({
  // One rhythm for every workspace page: the header, then each block, 20px apart.
  base: "flex w-full flex-col gap-5",

  variants: {
    width: {
      // Single-column forms and settings. Left off, the page runs full width: dashboards,
      // lists, detail pages.
      narrow: "max-w-3xl",
    },
  },
})

type PageProps = ComponentProps<"div"> & VariantProps<typeof pageVariants>

/**
 * The root of a workspace route: owns the vertical rhythm between the page header and its
 * content, so no page sets its own top margins or gaps.
 */
export function Page({ className, width, ...props }: PageProps) {
  return <div className={pageVariants({ width, className })} {...props} />
}
