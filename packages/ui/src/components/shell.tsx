"use client"

import { type ComponentProps, type MouseEvent, type ReactNode, useEffect, useState } from "react"
import { SidebarIcon } from "../lib/icons"
import { FROM_LG, useMediaQuery } from "../lib/media"
import { cn } from "../lib/variants"
import { Button, buttonVariants } from "./button"
import { SideDrawer } from "./dialog"
import { Nav } from "./nav"

/**
 * The phone bar's own height, which the drawer under it starts from. The bar's
 * `h-[calc(3rem+env(safe-area-inset-top))]` class spells the same value out for Tailwind, which
 * reads class names from the source; change the two together.
 */
const HEADER_HEIGHT = "calc(3rem + env(safe-area-inset-top))"

interface DrawerToggleProps extends ComponentProps<typeof Button> {
  open: boolean
}

/**
 * The one 40px drawer toggle, in the bar in both states: its glyph grows the panel's bar into
 * a filled pane as the drawer opens, and it takes the fill while the drawer is open. The -11px
 * is the space between the square's edge and the glyph's ink: 9px of centring the 22px icon in
 * 40px, plus the 2px the panel sits inside its box. It lines the ink up with the content's inset.
 */
function DrawerToggle({ open, ...props }: DrawerToggleProps) {
  return (
    <Button
      variant="ghost"
      aria-label={open ? "Close the menu" : "Open the menu"}
      aria-expanded={open}
      className={cn("-ml-[11px] size-10 shrink-0 p-0", open && "bg-fill text-ink")}
      {...props}
    >
      <span className="flex justify-center">
        <SidebarIcon open={open} className="size-5.5" />
      </span>
    </Button>
  )
}

/**
 * The rail's top row, which holds the product's switcher (a site, a workspace). Give it the
 * name a screen reader announces, such as `aria-label="Current workspace"`.
 */
export function RailTop({ className, ...props }: ComponentProps<typeof Nav>) {
  return <Nav className={cn("pt-3 pb-1", className)} {...props} />
}

/**
 * The rail's bottom row, which holds the user menu's trigger. Its bottom inset grows by what a
 * phone's home indicator needs, so the row clears it in the drawer.
 */
export function RailBottom({ className, ...props }: ComponentProps<typeof Nav>) {
  return (
    <Nav className={cn("pb-[calc(0.75rem+env(safe-area-inset-bottom))]", className)} {...props} />
  )
}

export interface ShellProps {
  /**
   * The rail's top on a wide screen, usually a `RailTop` holding the switcher. The drawer leaves
   * it out, because the phone bar holds the switcher.
   */
  top?: ReactNode

  /** The rail's groups of `NavLink` rows. The rail and the phone drawer both show them. */
  nav: ReactNode

  /**
   * What stays pinned under the rows while they scroll, usually a `RailBottom` holding the user
   * menu's trigger, with any notice above it. The rail and the drawer both show it.
   */
  footer?: ReactNode

  /** The phone bar after the drawer toggle, usually the switcher. It fills the bar's width. */
  header?: ReactNode

  /** The phone bar's end, after `header`, such as a live count. */
  headerEnd?: ReactNode

  /**
   * A value that changes on every navigation, such as the router's current URL (TanStack
   * Router's `location.href`, Next.js's `usePathname()`). A change closes the drawer, which
   * covers a navigation that did not start from a link inside it.
   */
  navigationKey?: string

  /**
   * Whether the phone drawer is open, for a product that closes it from an action that is not
   * a link, such as a menu item that opens a dialog. The shell keeps its own state without it.
   */
  open?: boolean

  /** Runs when the drawer opens or closes, from the toggle, a link or `navigationKey`. */
  onOpenChange?: (open: boolean) => void

  /** Classes for the part of the wide rail that scrolls: `top` and `nav`. */
  railBodyClassName?: string

  /** The page, inside `<main>` on the shared content container. */
  children: ReactNode
}

/**
 * The signed-in frame of a dashboard. On a wide screen (`lg`) a 224px rail sits beside the
 * content. Under `lg` the rail gives way to one sticky bar holding the drawer toggle and the
 * `header`. The drawer and its scrim start below the bar and show the rail's rows and footer.
 * A plain click on any link in the drawer closes it, so a row needs no handler of its own.
 */
export function Shell({
  top,
  nav,
  footer,
  header,
  headerEnd,
  navigationKey,
  open: openProp,
  onOpenChange,
  railBodyClassName,
  children,
}: ShellProps) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = openProp ?? ownOpen
  const wide = useMediaQuery(FROM_LG)

  function setOpen(next: boolean) {
    if (openProp === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }

  // A navigation that did not start in the drawer closes it, and so does a screen that grows
  // past `lg` (a tablet turned to landscape), where the rail takes the drawer's place. The own
  // state closes during this render; a caller holding `open` hears it from the effect below,
  // since a parent's state cannot change while this component renders.
  const [seen, setSeen] = useState({ navigationKey, wide, closes: 0 })
  if (seen.navigationKey !== navigationKey || seen.wide !== wide) {
    const closes = open && (seen.navigationKey !== navigationKey || wide)
    setSeen({ navigationKey, wide, closes: seen.closes + (closes ? 1 : 0) })
    if (closes) setOwnOpen(false)
  }

  useEffect(() => {
    if (seen.closes > 0) onOpenChange?.(false)
  }, [seen.closes])

  // Only a link the drawer's own DOM holds closes it. A menu opened from the drawer renders in a
  // portal, whose clicks still bubble here through React, and it closes itself. A link that
  // opens elsewhere (a modifier held, a `target` other than `_self`, a download) leaves the
  // reader here.
  function closeOnLink(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element
    const link = target.closest("a[href]")
    if (!link || !event.currentTarget.contains(link)) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (link.hasAttribute("download")) return
    const linkTarget = link.getAttribute("target")
    if (linkTarget && linkTarget !== "_self") return
    setOpen(false)
  }

  return (
    <div className="flex min-h-dvh max-lg:flex-col">
      {/* The rail comes before the content in the source, so the first Tab of a fresh page
          offers the way past it. `absolute` restates what `sr-only` sets, since the button's
          own `relative` would otherwise win and leave a 1px flex item in the row. */}
      <a
        href="#main"
        className={buttonVariants({
          variant: "secondary",
          className:
            "sr-only absolute focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50",
        })}
      >
        Skip to content
      </a>

      {/* The content's inset (`page-container`), so the bar's contents line up with the page. The
          height is `HEADER_HEIGHT`, written out as a class. */}
      <header className="page-container sticky top-0 z-50 flex h-[calc(3rem+env(safe-area-inset-top))] items-center gap-2 border-b bg-canvas pt-[env(safe-area-inset-top)] lg:hidden">
        <SideDrawer
          // Never shown beside the rail, even for the frame before the effect above closes it.
          open={open && !wide}
          offset={HEADER_HEIGHT}
          trigger={<DrawerToggle open={open} />}
          className="w-70"
          onOpenChange={setOpen}
        >
          {/* `contents` keeps the rows and the footer laid out by the drawer, while one listener
              hears a click on a link in either. */}
          {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the links inside take the keyboard, and Enter on a link fires this click too */}
          <div className="contents" onClick={closeOnLink}>
            {/* Only the rows scroll, so the footer stays in reach on a short screen, as it does
                in the rail. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              {nav}
            </div>

            {footer}
          </div>
        </SideDrawer>

        <div className="min-w-0 flex-1">{header}</div>

        {headerEnd}
      </header>

      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-canvas lg:flex">
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", railBodyClassName)}>
          {top}
          {nav}
        </div>

        {footer}
      </aside>

      {/* Top and bottom stay on the grid's 20px gap at every width, so the first and last
          card sit as far from the viewport edge as they do from each other. */}
      <main id="main" className="page-container min-w-0 flex-1 py-5">
        {children}
      </main>
    </div>
  )
}
