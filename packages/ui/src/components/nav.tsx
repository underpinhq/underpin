import type { ComponentProps } from "react"
import { eyebrowClasses } from "../lib/classes"
import { cn, variants } from "../lib/variants"

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
