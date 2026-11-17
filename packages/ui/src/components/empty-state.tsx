import type { ComponentProps, ReactNode } from "react"
import { descriptionClasses, iconTileClasses } from "../lib/classes"
import { cn, variants, type VariantProps } from "../lib/variants"

const emptyStateVariants = variants({
  slots: {
    root: "",
    icon: [iconTileClasses, "size-10"],
    content: "space-y-2",
    title: "text-balance",
    description: descriptionClasses,
    action: "",
  },

  variants: {
    variant: {
      block: {
        root: "flex flex-col items-center gap-3 px-6 py-12 text-center",
        title: "font-medium text-sm",
        description: "mx-auto max-w-80",
        action: "mt-1",
      },
      inline: {
        // No horizontal padding: an inline state always sits inside a panel, card or dialog
        // that already pads its own content, and a second inset reads as an indent.
        root: "py-5",
        title: "text-ink-muted text-sm",
        action: "mt-3",
      },
    },
    size: {
      md: {},
      sm: {},
    },
  },

  compoundVariants: [
    // The block at the scale of a short list: a 36px tile with an 18px glyph, a wider sentence.
    {
      variant: "block",
      size: "sm",
      class: { root: "py-7", icon: "size-9 [&_svg]:size-4.5", description: "max-w-md" },
    },
  ],

  defaultVariants: {
    variant: "block",
    size: "md",
  },
})

type EmptyStateProps = Omit<ComponentProps<"div">, "title"> &
  VariantProps<typeof emptyStateVariants> & {
    icon?: ReactNode
    title: ReactNode
    description?: ReactNode
    action?: ReactNode
  }

/**
 * The one empty state. `block` fills a card or list with a centered icon, title and
 * description, `sm` for one inside a short list; `inline` is a single muted line inside a
 * form section.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant,
  size,
  className,
  ...props
}: EmptyStateProps) {
  const styles = emptyStateVariants({ variant, size })

  return (
    <div className={cn(styles.root(), className)} {...props}>
      {icon && <div className={styles.icon()}>{icon}</div>}

      <div className={styles.content()}>
        <p className={styles.title()}>{title}</p>
        {description && <p className={styles.description()}>{description}</p>}
      </div>

      {action && <div className={styles.action()}>{action}</div>}
    </div>
  )
}
