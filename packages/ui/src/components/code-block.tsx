import type { ComponentProps } from "react"
import { variants, type VariantProps } from "../lib/variants"

const codeBlockVariants = variants({
  base: "rounded-lg bg-fill-subtle p-4 font-mono text-xs text-ink-secondary",

  variants: {
    /**
     * Wrap long lines rather than scroll them: for a snippet read and copied whole, where a line
     * running off the edge hides part of what is copied, or one that would widen its dialog.
     * `wrap-anywhere` rather than `break-words`: only it lets a grid or flex parent shrink the
     * block below its longest unbroken run, such as a URL.
     */
    wrap: {
      true: "whitespace-pre-wrap wrap-anywhere",
      false: "overflow-x-auto",
    },
  },

  defaultVariants: {
    wrap: false,
  },
})

interface CodeBlockProps extends ComponentProps<"pre">, VariantProps<typeof codeBlockVariants> {}

/**
 * A block of code to read and copy, in the fill. A block that scrolls sideways
 * takes focus, so a keyboard can scroll it too.
 */
export function CodeBlock({ wrap, className, ...props }: CodeBlockProps) {
  return (
    <pre
      tabIndex={wrap ? undefined : 0}
      className={codeBlockVariants({ wrap, className })}
      {...props}
    />
  )
}
