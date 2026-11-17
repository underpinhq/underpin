import { useRender } from "@base-ui/react/use-render"
import { variants, type VariantProps } from "../lib/variants"

const textLinkVariants = variants({
  // Underlined in every tone, because a link inside a sentence has no shape of its own to mark
  // it: colour alone fails for a reader who cannot separate the two hues. The 1px rule sits 3px
  // down, clear of the descenders, in the link's colour at 40%, and turns solid under the pointer.
  base: "underline decoration-1 underline-offset-3 decoration-current/40 transition-[text-decoration-color] duration-150 ease-out hover:decoration-current",

  variants: {
    tone: {
      brand: "text-brand-ink",
      // Takes the sentence's colour, for fine print that should not draw the eye.
      muted: "",
    },
  },

  defaultVariants: {
    tone: "brand",
  },
})

export interface TextLinkProps
  extends useRender.ComponentProps<"a">, VariantProps<typeof textLinkVariants> {}

/**
 * A link inside running text: a sentence in a description, a callout or an empty state. It
 * sets colour and underline and nothing else, so it wraps with the words around it and reads
 * at their size. A standalone control beside prose is `InlineAction` or `Button` instead.
 */
function TextLink({ className, tone, render, ...props }: TextLinkProps) {
  return useRender({
    render,
    defaultTagName: "a",
    props: { className: textLinkVariants({ tone, className }), ...props },
  })
}

export { TextLink }
