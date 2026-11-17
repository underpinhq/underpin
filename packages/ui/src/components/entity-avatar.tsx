import type { ComponentProps, ReactNode } from "react"
import { variants, type VariantProps } from "../lib/variants"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"

/**
 * The initials standing in for a missing image: a name of two characters or less as it is,
 * otherwise the first letter of each of its first two words. Counted by code point, so an emoji
 * stays whole.
 */
function formatInitials(name: string) {
  const value = name.trim()

  if (Array.from(value).length <= 2) {
    return value.toUpperCase()
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => Array.from(word)[0]?.toUpperCase() ?? "")
    .join("")
}

// Radius lives on the root, which clips its children, and grows with the box (`sm`, `lg`, `xl`). The
// edge is an inset outline rather than a border, so it draws over the artwork instead of shrinking
// the box it sits in. Initials are two letters at most, in 500, about 40% of the box.
const entityAvatar = variants({
  slots: {
    root: "outline outline-edge-subtle -outline-offset-1",
    image: "p-[7.5%]",
    fallback: "font-medium text-ink-secondary",
  },

  variants: {
    size: {
      // 20px: the identity mark of a nav row or menu item, flush.
      sm: {
        root: "size-5 rounded-sm",
        image: "p-0",
        fallback: "text-2xs",
      },
      // 36px: list rows and cards.
      md: { root: "size-9 rounded-lg", fallback: "text-control" },
      // 56px: the logo field.
      lg: { root: "size-14 rounded-xl", fallback: "text-xl" },
    },
    /**
     * Drop the inset around the image, for artwork that already fills its square (a favicon).
     */
    flush: {
      true: { image: "p-0" },
    },
  },
})

type EntityAvatarProps = Omit<ComponentProps<typeof Avatar>, "className"> &
  VariantProps<typeof entityAvatar> & {
    className?: string

    /**
     * The image source (e.g. a favicon URL). When absent, only the fallback renders.
     */
    src?: string | null

    /**
     * The entity's display name; its initials are the default fallback.
     */
    name: string

    /**
     * Overrides the initials derived from `name`.
     */
    fallback?: ReactNode

    /**
     * Names the avatar for a screen reader, for one with no visible name beside it. Without it
     * the avatar is hidden from assistive tech, since the initials would only repeat the name.
     */
    label?: string
  }

export function EntityAvatar({
  src,
  name,
  fallback,
  size,
  flush,
  label,
  className,
  ...props
}: EntityAvatarProps) {
  const styles = entityAvatar({ size, flush })
  const named = label ? ({ role: "img", "aria-label": label } as const) : { "aria-hidden": true }

  return (
    <Avatar className={styles.root({ className })} {...named} {...props}>
      {src && <AvatarImage src={src} alt="" className={styles.image()} />}

      <AvatarFallback className={styles.fallback()}>
        {fallback ?? formatInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
