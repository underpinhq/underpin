import type { ComponentProps, ReactNode } from "react"
import { cn, type VariantProps } from "../lib/variants"
import { Button } from "./button"
import { EntityAvatar } from "./entity-avatar"
import { navItem } from "./nav"
import { Skeleton } from "./skeleton"

type NavButtonVariant = Exclude<NonNullable<VariantProps<typeof navItem>["variant"]>, "link">

type NavButtonShellProps = Omit<ComponentProps<typeof Button>, "variant"> & {
  leading: ReactNode
  variant?: NavButtonVariant
}

/**
 * The nav trigger's frame around any leading mark, for a row that is not an entity. The mark
 * sits in a 20px box, so a 16px glyph and a 20px avatar start the label on the same line.
 */
function NavButtonShell({
  leading,
  variant = "flat",
  children,
  className,
  ...props
}: NavButtonShellProps) {
  return (
    <Button
      size={variant === "outline" ? "md" : "sm"}
      variant="ghost"
      bordered={variant === "outline"}
      prefix={
        <span className="flex size-5 items-center justify-center [&>svg]:size-4">{leading}</span>
      }
      className={navItem({ variant, className })}
      {...props}
    >
      <span className="font-medium text-control">{children}</span>
    </Button>
  )
}

type NavButtonProps = NavButtonShellProps & {
  /** The row's text, and the name its avatar takes initials from. */
  label: string
  avatar?: string
}

/**
 * Compact nav trigger: a 20px avatar, one line of text and whatever `suffix` the caller
 * passes (usually a chevron). Secondary text belongs in the menu it opens.
 */
function NavButton({ avatar, label, ...props }: Omit<NavButtonProps, "leading" | "children">) {
  return (
    <NavButtonShell leading={<EntityAvatar size="sm" src={avatar} name={label} />} {...props}>
      {label}
    </NavButtonShell>
  )
}

function NavButtonSkeleton({
  variant,
  ...props
}: Omit<NavButtonShellProps, "leading" | "children">) {
  return (
    <NavButtonShell
      disabled
      variant={variant}
      leading={<Skeleton className="size-5 rounded-sm" />}
      {...props}
    >
      <Skeleton className="w-28">&nbsp;</Skeleton>
    </NavButtonShell>
  )
}

type NavIdentityProps = ComponentProps<"div"> & {
  name: ReactNode

  /**
   * The muted second line under the name: an email, a workspace slug.
   */
  detail: ReactNode
}

/**
 * Name over a muted detail line — the identity stack a nav menu's items and headers share.
 */
function NavIdentity({ name, detail, className, ...props }: NavIdentityProps) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)} {...props}>
      <span className="truncate font-medium text-control">{name}</span>
      <span className="truncate text-ink-muted text-xs">{detail}</span>
    </div>
  )
}

export { NavButton, NavButtonShell, NavButtonSkeleton, NavIdentity }
