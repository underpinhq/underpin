import { mergeProps } from "@base-ui/react"
import { useRender } from "@base-ui/react/use-render"
import type { ReactNode } from "react"
import { slot } from "../lib/slot"
import { variants, type VariantProps } from "../lib/variants"

/**
 * Three independent axes, as most design systems split a badge: `tone` is what it means (the
 * `Tone` vocabulary plus the brand), `variant` how loud it is, `size` how big. Soft is a tinted
 * fill alone, outline adds an edge in the tone, solid fills with the tone itself for a count or
 * a "New". A badge rendered as a link or a button answers the pointer.
 */
const badgeVariants = variants({
  // Every badge has a 1px border, clear unless the variant draws an edge, so soft, outline and
  // solid badges of one size stand the same height: 16, 20 and 24px, the step's own line plus
  // the border, and 1px of padding above and below from md up. Counts take tabular figures.
  base: "inline-flex items-center rounded-sm border border-transparent font-display font-medium whitespace-nowrap tabular-nums",

  variants: {
    tone: {
      neutral: "",
      brand: "",
      success: "",
      warning: "",
      danger: "",
    },
    variant: {
      soft: "",
      outline: "",
      solid: "",
    },
    size: {
      sm: "px-1 gap-1 text-2xs",
      md: "px-1.5 py-px gap-1.5 text-xs",
      lg: "px-2 py-px gap-2 text-sm rounded-md",
    },
  },

  compoundVariants: [
    // A soft or outline neutral badge takes the text colour around it.
    { tone: "neutral", variant: "soft", class: "bg-fill hover:[&[href],&[type]]:bg-fill-strong" },
    {
      tone: "neutral",
      variant: "outline",
      class: "border-edge bg-canvas hover:[&[href],&[type]]:bg-fill-subtle",
    },
    {
      tone: "neutral",
      variant: "solid",
      class: "bg-ink text-ink-inverse hover:[&[href],&[type]]:opacity-90",
    },
    // An outline edge is the tone's ink at 20%, so the edge and the label draw one colour.
    {
      tone: "brand",
      variant: "soft",
      class: "bg-brand-subtle text-brand-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "brand",
      variant: "outline",
      class:
        "border border-brand-edge bg-brand-subtle text-brand-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "brand",
      variant: "solid",
      class: "bg-brand text-brand-on hover:[&[href],&[type]]:opacity-90",
    },
    {
      tone: "success",
      variant: "soft",
      class: "bg-success-subtle text-success-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "success",
      variant: "outline",
      class:
        "border border-success-edge bg-success-subtle text-success-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "success",
      variant: "solid",
      class: "bg-success text-success-on hover:[&[href],&[type]]:opacity-90",
    },
    {
      tone: "warning",
      variant: "soft",
      class: "bg-warning-subtle text-warning-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "warning",
      variant: "outline",
      class:
        "border border-warning-edge bg-warning-subtle text-warning-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "warning",
      variant: "solid",
      class: "bg-warning text-warning-on hover:[&[href],&[type]]:opacity-90",
    },
    {
      tone: "danger",
      variant: "soft",
      class: "bg-danger-subtle text-danger-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "danger",
      variant: "outline",
      class:
        "border border-danger-edge bg-danger-subtle text-danger-ink hover:[&[href],&[type]]:opacity-75",
    },
    {
      tone: "danger",
      variant: "solid",
      class: "bg-danger text-danger-on hover:[&[href],&[type]]:opacity-90",
    },
  ],

  defaultVariants: {
    tone: "neutral",
    variant: "soft",
    size: "md",
  },
})

const badgeAffixClasses = "shrink-0 size-[1.1em]"

interface BadgeProps
  extends Omit<useRender.ComponentProps<"span">, "prefix">, VariantProps<typeof badgeVariants> {
  /** The slot to be rendered before the label. */
  prefix?: ReactNode

  /** The slot to be rendered after the label. */
  suffix?: ReactNode
}

function Badge({
  children,
  className,
  render,
  tone,
  variant,
  size,
  prefix,
  suffix,
  ...rest
}: BadgeProps) {
  const props = mergeProps<"span">(
    {
      className: badgeVariants({ tone, variant, size, className }),
      children: (
        <>
          {slot(prefix, { className: badgeAffixClasses })}
          {children}
          {slot(suffix, { className: badgeAffixClasses })}
        </>
      ),
    },
    rest,
  )

  return useRender({ defaultTagName: "span", render, props })
}

export { Badge, badgeVariants }
