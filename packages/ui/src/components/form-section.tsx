import { useRender } from "@base-ui/react/use-render"
import type { ReactNode } from "react"
import { cn } from "../lib/variants"
import { SectionHeader } from "./section-header"

type FormSectionProps = Omit<useRender.ComponentProps<"section">, "title"> & {
  id?: string
  /**
   * Optional heading. Leave it out when the page header above already names the section.
   */
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /**
   * Right-aligned actions after the rows, e.g. a save button, on the `CardFooter` band.
   */
  footer?: ReactNode
}

/**
 * A block of settings: one padded container whose children (optional heading, the rows,
 * optional footer) stack with hairlines between them. Renders as a `<form>` via `render`
 * when the rows are fields, so the form is the only wrapper.
 */
export function FormSection({
  id,
  title,
  description,
  actions,
  footer,
  className,
  children,
  render,
  ...props
}: FormSectionProps) {
  return useRender({
    render,
    defaultTagName: "section",
    props: {
      id,
      // The container its rows lay themselves out against (see DetailRow's `form` density).
      // Row hairlines stop at the inset; the header's and the footer's run edge to edge, so the
      // row above the footer drops its own.
      className: cn(
        "@container flex flex-col divide-y px-4 md:px-5",
        footer && "[&>:nth-last-child(2)]:border-b-0",
        className,
      ),
      children: (
        <>
          {/* `||`: a `false` or `""` slot counts as missing. */}
          {/* oxlint-disable-next-line typescript/prefer-nullish-coalescing */}
          {(title || actions) && (
            <SectionHeader
              size="panel"
              // Two columns from the same container width the rows split at: the description
              // wraps inside its own column and the action stays at the end of the title line,
              // rather than dropping under a long description on a wide panel. Only the actions
              // hold their width; without them the last child is the description's column.
              className={cn(
                "-mx-4 w-auto px-4 py-4 md:-mx-5 md:px-5 @xl:flex-nowrap",
                actions && "[&>:last-child]:@xl:shrink-0",
              )}
              title={title}
              description={description}
              actions={actions}
            />
          )}

          {children}

          {footer && (
            <div className="-mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-canvas px-4 py-4 md:-mx-5 md:px-5">
              {footer}
            </div>
          )}
        </>
      ),
      ...props,
    },
  })
}
