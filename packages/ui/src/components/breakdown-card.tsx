import type { ComponentProps, ReactNode } from "react"
import { cn } from "../lib/variants"
import { Card, CardHeader, CardPanel } from "./card"

// `title` is omitted before it is redeclared: a `<div>`'s own `title` attribute is a string,
// and the intersection would otherwise narrow the card's heading to one.
export type BreakdownCardProps = Omit<ComponentProps<typeof Card>, "title"> & {
  title: ReactNode
  description?: ReactNode
  /**
   * Header actions, right-aligned beside the title (a menu, a time-range control).
   */
  actions?: ReactNode
  /**
   * A view switcher (e.g. `ViewPicker`) pinned to the top of the body, above the children.
   */
  tabs?: ReactNode
  /**
   * A compact hairline-topped strip under the body, for a "Details" link or a total. It sets
   * the small type scale every footer control and note reads at, so its content passes no
   * size of its own.
   */
  footer?: ReactNode
  /**
   * Drop the body panel's padding, for a body that draws its own edges (a divided row list).
   */
  flush?: boolean
}

/**
 * A dashboard panel: a titled header panel above a flex body panel, hairline-divided, with an
 * optional footer strip. The body grows to fill the card so panels in the same row keep an
 * even height.
 */
export function BreakdownCard({
  title,
  description,
  actions,
  tabs,
  footer,
  flush,
  children,
  ...props
}: BreakdownCardProps) {
  return (
    <Card {...props}>
      <CardPanel size="none" className="px-4 py-3 md:px-5 md:py-3.5">
        <CardHeader
          size="panel"
          // The actions keep the title's line and wrap within the space left beside it, rather
          // than dropping under the title the moment they no longer fit on one row: a card's
          // tab row is the usual actions here, and it has its own wrapping.
          className="flex-nowrap gap-y-0.5 [&>*:first-child]:flex-none"
          title={title}
          description={description}
          actions={actions}
        />
      </CardPanel>

      {/* The header's inset, so row text starts under the title and figures end under the
          actions; `BarList` bleeds its bars past that line. 12px over and under the list. */}
      <CardPanel
        size="none"
        // `md:p-0` alongside `p-0`: the merge treats a variant class as its own group, so
        // `p-0` on its own leaves `md:px-5` standing and a flush body is only flush on a phone.
        className={cn("flex flex-1 flex-col gap-3 px-4 py-3 md:px-5", flush && "p-0 md:p-0")}
      >
        {tabs && <div className={cn("flex", flush && "px-4 pt-4")}>{tabs}</div>}
        {children}
      </CardPanel>

      {/* A fixed band: 12px over a 20px line and 12px under it, whatever the body is showing.
          The line is `text-xs/5`, not the 16px one this size carries by default, so the band
          is 44px for a footer that passes plain text as much as for one that pins its own row. */}
      {footer && (
        <CardPanel size="none" className="px-4 py-3 text-xs/5 md:px-5">
          {footer}
        </CardPanel>
      )}
    </Card>
  )
}
