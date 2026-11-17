import { useRender } from "@base-ui/react/use-render"
import { variants, type VariantProps } from "../lib/variants"

const inlineActionVariants = variants({
  // The label carries the weight, so a control reads as one against the plain text beside it
  // at the same size. Size and colour are the surrounding strip's, never this component's.
  base: "flex w-fit items-center gap-1.5 font-medium text-ink-muted hover:text-ink",

  variants: {
    /**
     * Grow the label's line into a 40px touch target on a coarse pointer. The padding bleeds
     * into the surrounding strip's own, and the negative margin keeps the strip's height; a
     * control whose neighbours sit tight against it leaves this off.
     */
    touchTarget: {
      true: "pointer-coarse:-my-2.5 pointer-coarse:py-2.5",
    },
  },
})

export type InlineActionProps = useRender.ComponentProps<"button"> &
  VariantProps<typeof inlineActionVariants>

/**
 * A control styled as text rather than as a button: a card's footer trigger, a breadcrumb, a
 * link to the page a panel summarises. It inherits the type scale around it and sets only
 * what marks it as interactive, so a new one matches the rest without restating any of it.
 * Pass `render` for a link or a library trigger. A link inside a sentence is `TextLink`.
 */
function InlineAction({ className, render, touchTarget, ...props }: InlineActionProps) {
  // Never a form's submit, as with `Button`; only on a real `<button>`.
  return useRender({
    render,
    defaultTagName: "button",
    props: {
      className: inlineActionVariants({ touchTarget, className }),
      ...(!render && { type: "button" as const }),
      ...props,
    },
  })
}

export { InlineAction }
