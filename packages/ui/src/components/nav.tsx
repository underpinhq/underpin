import { mergeProps } from "@base-ui/react/merge-props"
import { cloneElement, type ComponentProps, type ReactElement, type ReactNode } from "react"
import { eyebrowClasses } from "../lib/classes"
import type { Tone } from "../lib/tone"
import { cn, variants } from "../lib/variants"
import { Button } from "./button"
import { Ping } from "./ping"

export function Nav({ className, ...props }: ComponentProps<"nav">) {
  return <nav className={cn("flex flex-col gap-0.5 px-3 py-2", className)} {...props} />
}

/**
 * Muted group label above a run of nav links, in sentence case. It starts on the rows' own inset,
 * so the label sits over the rows' leading column rather than hanging off it.
 */
export function NavLabel({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("px-2 pt-1.5 pb-1", eyebrowClasses, className)} {...props} />
}

/**
 * The hairline between two runs of nav links. It spans the whole rail, edge to edge, so it
 * reads as a boundary between regions of the rail and meets the rail's own border, as a
 * menu's separator spans its popup.
 */
export function NavSeparator({ className, ...props }: ComponentProps<"hr">) {
  return <hr className={cn("border-t", className)} {...props} />
}

/**
 * Every nav row leads with a 20px column: the 20px avatar of a row that has one, or the 16px
 * icon of a row that does not, centred in the same box. The Button's optical pull-in on the
 * first and last child is zeroed, so the column starts on the row's own inset and every label
 * in the rail begins on one line.
 */
const navAffixClasses = "[&>*:first-child]:ml-0 [&>*:last-child]:mr-0"

/**
 * The one nav row, applied to a `ghost` `Button`: every item starts from the same width, inset
 * and gap, and each variant is the shape on top of it. A `link` or `flat` row is 32px tall; the
 * `outline` row is the 32px control height, so it lines up with the toolbar controls. Both
 * heights are fixed rather than padded, so a row leading with a taller visual keeps its size.
 *
 * `link`: a nav link or a settings tab, muted at rest, the subtle fill on hover, and a raised
 * key with dark text when active. A coarse pointer grows the row to 36px, a finger-sized target
 * that keeps the rail compact.
 * The label is the control size, set here so it survives the merge with the Button's own text
 * class. The active state keys off `aria-current="page"`, which router links set on their own
 * and a plain button sets by hand, so the row a screen reader hears as current is the one that
 * looks it.
 *
 * `outline`: an edged row on a card surface, for a row that leads with its own visual and
 * opens a menu, with the hover of a secondary button.
 *
 * `flat`: the same row without the border or the surface.
 */
export const navItem = variants({
  // A row runs the rail's full width, so the Button's press would read as the layout moving;
  // the fill is the press feedback here.
  base: [
    "w-full justify-start gap-2 px-2 active:not-disabled:not-aria-disabled:translate-y-0 active:not-disabled:not-aria-disabled:bg-fill",
    navAffixClasses,
  ],

  variants: {
    variant: {
      link: [
        "h-8 pointer-coarse:h-9 border border-transparent text-ink-muted hover:text-ink",
        "text-control",
        // A 16px glyph drawn inside the 20px column an avatar fills.
        "[&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:p-0.5",
        // The current page is a raised key, the way a segmented control marks its chosen option,
        // and keeps it under the pointer: the longer selector outranks the ghost hover, so a
        // hovered row never looks current and hovering where you are never looks like leaving it.
        "aria-[current=page]:border-edge-strong aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-ink aria-[current=page]:shadow-control",
        "aria-[current=page]:hover:not-aria-disabled:bg-surface",
      ],
      outline: "h-control py-0 bg-surface",
      flat: "h-8",
    },
  },

  defaultVariants: {
    variant: "link",
  },
})

export interface NavLinkProps extends Omit<ComponentProps<"a">, "prefix"> {
  /**
   * The link element, such as a router's: `<Link to="/sites" />`. The row's props and classes
   * merge onto it. A plain `<a>` by default.
   */
  render?: ReactElement<ComponentProps<"a">>

  /**
   * Marks the row as the current page (`aria-current="page"`), for a router whose link does not
   * set it, such as Next.js's.
   */
  active?: boolean

  /** The 16px glyph that leads the row. */
  icon?: ReactNode

  /**
   * A figure at the row's end, such as the items waiting in a queue. Its text joins the row's
   * accessible name, so a bare number may need a visually hidden word after it.
   */
  count?: ReactNode

  /** A status dot at the row's end, before the count when both are set. */
  dot?: Tone

  /** Pulses the dot, for a status that is live right now. */
  pulse?: boolean
}

/**
 * A rail row that is a link. It renders an `<a>`, or the element `render` passes, such as a
 * router's link: `render={<Link to="/sites" />}`. The current page is the row whose link sets
 * `aria-current="page"`, which TanStack Router's link does on a match and `active` sets
 * for any other.
 */
export function NavLink({
  active,
  icon,
  count,
  dot,
  pulse,
  render,
  className,
  children,
  ...anchorProps
}: NavLinkProps) {
  const props = active ? { ...anchorProps, "aria-current": "page" as const } : anchorProps
  const hasEnd = count !== undefined || dot !== undefined

  return (
    <Button
      variant="ghost"
      size="sm"
      prefix={icon}
      // At the row's end rather than after the label: the rows are one column, and a reading
      // that hangs off the label would sit in a different place on every row.
      suffix={
        hasEnd && (
          <span className="ml-auto flex items-center gap-1.5">
            {dot && <Ping tone={dot} animate={pulse} size="sm" />}
            {count !== undefined && (
              <span className="font-medium text-2xs text-ink-muted tabular-nums">{count}</span>
            )}
          </span>
        )
      }
      className={navItem({ className })}
      // The element's own handlers and classes stay: `mergeProps` chains the handlers and joins
      // the classes rather than letting the row's replace them.
      render={
        render ? cloneElement(render, mergeProps<"a">(props, render.props)) : <a {...props} />
      }
    >
      {children}
    </Button>
  )
}
