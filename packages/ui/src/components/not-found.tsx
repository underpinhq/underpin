import type { ReactNode } from "react"
import { Card } from "./card"
import { EmptyState } from "./empty-state"

export interface NotFoundProps {
  /** A glyph over the title, such as a page or file icon. */
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  /**
   * The way out, usually a `Button` rendering the router's link to the home page. The part
   * imports no router, so the app hands its own link over.
   */
  action?: ReactNode
  className?: string
}

/**
 * The page for a URL no route matches: a card with the icon, the title, a sentence and the way
 * back. An app reports the miss to its analytics in its own not-found route, around this.
 */
export function NotFound({
  icon,
  title = "Page not found",
  description = "This URL does not match any page.",
  action,
  className,
}: NotFoundProps) {
  return (
    <Card className={className}>
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </Card>
  )
}
