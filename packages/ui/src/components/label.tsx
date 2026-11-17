"use client"

import type { ComponentProps } from "react"
import { variants, type VariantProps } from "../lib/variants"

const labelVariants = variants({
  base: "self-start text-sm font-medium text-ink [&[for]]:cursor-pointer",

  variants: {
    isRequired: {
      // The empty alternative text after the slash keeps a screen reader from reading the star.
      true: "after:ml-0.5 after:text-danger-ink after:content-['*'_/_'']",
    },
  },
})

type LabelProps = ComponentProps<"label"> & VariantProps<typeof labelVariants>

function Label({ className, isRequired, ...props }: LabelProps) {
  // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor is supplied by callers (e.g. FormLabel)
  return <label className={labelVariants({ isRequired, className })} {...props} />
}

export { Label }
