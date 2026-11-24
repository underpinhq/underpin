"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import {
  type ComponentProps,
  cloneElement,
  Fragment,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from "react"
import { ChevronLeftIcon, SearchIcon, SidebarIcon } from "../lib/icons"
import { FROM_LG, useMediaQuery } from "../lib/media"
import { formatAriaKeys, useIsMac } from "../lib/shortcuts"
import { cn } from "../lib/variants"
import { Button, buttonVariants } from "./button"
import { SideDrawer } from "./dialog"
import { inputVariants } from "./input"
import { Nav, NavLabel, NavSeparator } from "./nav"
import { ShortcutKeys } from "./shortcut-keys"
import { Skeleton } from "./skeleton"

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

export interface RailSearchProps extends Omit<ComponentProps<"button">, "children"> {
  /** The words the field shows, such as "Search or jump to…". */
  label: string

  /** The shortcut that opens the same search, such as "mod+k", shown at the field's end. */
  keys?: string

  /** Whether a hairline parts the row from the one above. */
  separator?: boolean
}

/**
 * The rail's search row, under `RailTop`: a button drawn as a borderless search field that opens
 * the product's command menu from `onClick`. It is never a field to type in, so it holds no value.
 * Pass it inside the Shell's `top`, which the phone drawer leaves out: the phone bar puts search
 * in its `header`.
 */
export function RailSearch({
  label,
  keys,
  separator = false,
  className,
  ...props
}: RailSearchProps) {
  const mac = useIsMac()

  return (
    <>
      {separator && <NavSeparator />}

      <div className="px-3 py-2">
        {/* The field's transparent border is 1px of each side's inset, so the icon lands 9px in
            and the key cap 7px from the end. */}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-keyshortcuts={keys && formatAriaKeys(keys, mac)}
          className={inputVariants({
            interactive: true,
            bordered: false,
            className: cn(
              "flex items-center gap-2.25 bg-fill pr-1.5 pl-2 text-left text-ink-muted hover:not-disabled:not-aria-disabled:bg-fill-strong",
              className,
            ),
          })}
          {...props}
        >
          <SearchIcon className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {/* The name is the label alone; `aria-keyshortcuts` announces the shortcut. */}
          {keys && (
            <span aria-hidden className="contents">
              <ShortcutKeys keys={keys} variant="soft" />
            </span>
          )}
        </button>
      </div>
    </>
  )
}

export interface AreaRailProps {
  /** The area's name, such as "Settings", on the back row. */
  label: string

  /**
   * The link the back row renders, such as a router's:
   * `<Link to="/" activeOptions={{ exact: true }} />`. The row's classes, label and accessible
   * name merge onto it. Where it leads is the caller's: the page the reader came from, or the
   * product's home. A TanStack Router link to `/` needs `exact`: it matches every path by
   * prefix and would mark the back row as the current page across the whole area.
   */
  back: ReactElement<ComponentProps<"a">>

  /**
   * The back row's accessible name, which says where it goes. "Leave" and the label by
   * default ("Leave settings"). A name of your own must contain the label, so a reader who
   * speaks the visible word can still reach the row.
   */
  backLabel?: string

  /** The area's groups, each an `AreaRailGroup`. */
  children: ReactNode
}

/**
 * The nav of an area with its own sections, such as settings or an admin panel, in place of
 * the product's rows: a back row, then the area's groups. The back row is the area's name
 * after a 24px muted chip holding a chevron, and the whole row links back. Pass it as the
 * Shell's `nav` and leave `top` out, since the back row takes the switcher's place. The phone
 * drawer shows it too.
 */
export function AreaRail({ label, back, backLabel, children }: AreaRailProps) {
  const props = {
    // The visible word is the area's name; the accessible name says where the link goes.
    "aria-label": backLabel ?? `Leave ${label.toLowerCase()}`,
    className:
      "group flex h-9 items-center gap-2.5 rounded-md px-1 font-medium text-base text-ink tracking-micro",
  }

  return (
    <>
      <div className="px-3 pt-3 pb-2">
        {cloneElement(
          back,
          mergeProps<"a">(props, back.props),
          <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-fill transition-colors group-hover:bg-fill-strong">
            <ChevronLeftIcon className="size-3.5" strokeWidth={2} />
          </span>,
          label,
        )}
      </div>

      {children}
    </>
  )
}

export interface AreaRailGroupProps extends ComponentProps<"nav"> {
  /** The group's accessible name, such as "Site settings". */
  "aria-label": string

  /** The heading over the rows. An area with one group needs none. */
  label?: ReactNode

  /**
   * Whether a hairline parts the group from the back row or the group above. Leave it on
   * unless the row above draws its own edge.
   */
  separator?: boolean
}

/**
 * One group of an area's `NavLink` rows, after a hairline that parts it from the back row or
 * the group above. Each group draws its own line, so a group left out leaves no double line;
 * `separator={false}` drops it.
 */
export function AreaRailGroup({ label, separator = true, children, ...props }: AreaRailGroupProps) {
  return (
    <>
      {separator && <NavSeparator />}

      <Nav {...props}>
        {label && <NavLabel>{label}</NavLabel>}
        {children}
      </Nav>
    </>
  )
}

/** One group of an `AreaRailSkeleton`: its heading, if it has one, and how many rows it holds. */
export interface AreaRailSkeletonGroup {
  label?: string
  rows: number
}

export interface AreaRailSkeletonProps {
  /** The groups the area will show, so the loaded rail lands on the same lines. */
  groups: readonly AreaRailSkeletonGroup[]
}

/**
 * An `AreaRail` while what it lists loads: the back row's outline, then each group's heading
 * over its rows' outlines. The headings are real text, since an area knows its groups before
 * it knows their rows.
 */
export function AreaRailSkeleton({ groups }: AreaRailSkeletonProps) {
  return (
    <>
      <div className="px-3 pt-3 pb-2">
        <Skeleton className="h-9" />
      </div>

      {groups.map(({ label, rows }, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a skeleton's groups never reorder
        <Fragment key={index}>
          <NavSeparator />

          <Nav aria-hidden>
            {label && <NavLabel>{label}</NavLabel>}
            {Array.from({ length: rows }, (_, row) => (
              <Skeleton key={row} className="h-8 pointer-coarse:h-9" />
            ))}
          </Nav>
        </Fragment>
      ))}
    </>
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

  /**
   * Classes for the part of the wide rail that scrolls: `top` and `nav`. It carries
   * `view-transition-name: shell-rail`, and a view transition name must be unique on the page,
   * so a second Shell renames it here (`[view-transition-name:preview-rail]`).
   */
  railBodyClassName?: string

  /** The page, inside `<main>` on the shared content container. */
  children: ReactNode
}

/**
 * The signed-in frame of a dashboard. On a wide screen (`lg`) a 224px rail sits beside the
 * content. Under `lg` the rail gives way to one sticky bar holding the drawer toggle and the
 * `header`. The drawer and its scrim start below the bar and show the rail's rows and footer.
 * A plain click on any link in the drawer closes it, so a row needs no handler of its own.
 * Render one Shell per document: its rail's view transition name must be unique on the page.
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
        {/* The part that steps when the reader enters or leaves an area (`getAreaRailTypes`):
            the switcher and the rows together, so it fills the rail down to the footer in both
            states and the two snapshots match in size. Left out, the switcher would vanish
            alone and drag the area's rows up. */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto [view-transition-name:shell-rail]",
            railBodyClassName,
          )}
        >
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
