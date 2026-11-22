"use client"

import { useRender } from "@base-ui/react/use-render"
import { type ComponentProps, createContext, type ReactElement, type ReactNode, use } from "react"
import { descriptionClasses } from "../lib/classes"
import { ChevronLeftIcon } from "../lib/icons"
import { cn, variants, type VariantProps } from "../lib/variants"
import { Heading, type HeadingProps } from "./heading"
import { InlineAction } from "./inline-action"
import { Stack } from "./stack"

const sectionHeaderVariants = variants({
  base: "flex items-center w-full min-w-0",

  variants: {
    alignment: {
      left: "justify-between text-start",
      center: "justify-center text-center",
    },
    size: {
      // On a phone the actions stay on the title's line and the description runs the full
      // width under both, so a page never spends a row on its actions alone. The body and its
      // column dissolve into this grid there (see `SectionHeaderBody`), and each part names
      // its own area.
      page: [
        "gap-x-6 lg:gap-x-12",
        "max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-3",
        "max-sm:[grid-template-areas:'back_back'_'title_actions'_'description_description']",
      ],
      card: "gap-y-2 gap-x-6 max-sm:flex-col max-sm:items-stretch",
      // The title block keeps its content width in the wrap calculation, so the actions (a
      // card's tab row) drop under it only when the two really cannot share the line.
      panel: "gap-y-2 gap-x-6 [&>*:first-child]:flex-auto",
      hero: "gap-y-3 gap-x-6 lg:gap-x-12",
    },
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
  },

  defaultVariants: {
    alignment: "left",
    wrap: true,
  },
})

type SectionHeaderSize = NonNullable<VariantProps<typeof sectionHeaderVariants>["size"]>

/**
 * The title each header scale gets, alongside the spacing the variant above gives it: `page`
 * for a route heading, `card` for a standalone card, `panel` for a dashboard or list panel,
 * `hero` for the centered auth and callback screens. The `as` entry keeps the heading outline
 * intact: one `<h1>` per route, `<h2>` for everything nested inside it.
 */
const sectionHeaderTitles = {
  page: { size: "h3", as: "h1" },
  card: { size: "h4", as: "h2" },
  panel: { size: "h5", as: "h2" },
  hero: { size: "h2", as: "h1" },
} as const satisfies Record<SectionHeaderSize, { size: HeadingProps["size"]; as: string }>

const SectionHeaderContext = createContext<{ size: SectionHeaderSize; wrap: boolean }>({
  size: "page",
  wrap: true,
})

type SectionHeaderProps = Omit<useRender.ComponentProps<"div">, "title"> &
  Omit<VariantProps<typeof sectionHeaderVariants>, "wrap"> & {
    /**
     * Keep the title block and the actions on one line instead of wrapping them.
     */
    wrap?: boolean
    /**
     * Title block. Given any of `title`/`description`/`leading`/`actions`, the header renders
     * its own `SectionHeaderBody` (empty if there is nothing but actions, so they still sit right);
     * leave them all out to compose the body by hand, e.g. an entity header with dot-joined
     * meta or the dashboard greeting.
     */
    title?: ReactNode
    description?: ReactNode
    actions?: ReactNode
    /**
     * The link back to the list a record belongs to, above its title.
     */
    back?: ReactNode
    /**
     * Leading visual beside the title, e.g. an entity avatar.
     */
    leading?: ReactNode
  }

/**
 * The one header for every surface in the app: pages, cards, list panels, dialogs and settings
 * sections. Pass `title`/`description`/`actions` for the standard block, or compose
 * `SectionHeaderBody` + `SectionHeaderActions` as children when the content is bespoke.
 */
function SectionHeader({
  className,
  alignment = "left",
  size = "page",
  wrap = true,
  title,
  description,
  actions,
  back,
  leading,
  children,
  render,
  ...props
}: SectionHeaderProps) {
  const element = useRender({
    render,
    defaultTagName: "div",
    props: {
      className: sectionHeaderVariants({ alignment, size, wrap, className }),
      children: (
        <>
          {/* `||`: a `false` or `""` slot counts as missing. */}
          {/* oxlint-disable-next-line typescript/prefer-nullish-coalescing */}
          {(title || description || back || leading || actions) && (
            <SectionHeaderBody
              leading={leading}
              className={cn(alignment === "center" && "justify-center")}
            >
              {back && <SectionHeaderBack>{back}</SectionHeaderBack>}
              {title && <SectionHeaderTitle>{title}</SectionHeaderTitle>}
              {description && <SectionHeaderDescription>{description}</SectionHeaderDescription>}
            </SectionHeaderBody>
          )}

          {actions && <SectionHeaderActions>{actions}</SectionHeaderActions>}

          {children}
        </>
      ),
      ...props,
    },
  })

  return <SectionHeaderContext value={{ size, wrap }}>{element}</SectionHeaderContext>
}

/**
 * The page title. Its visual size and semantic level both follow the header's `size`, so a
 * page heading stays the route's single `<h1>` while cards and panels render `<h2>`s. Pass
 * `size`/`as` to override either one on its own.
 */
function SectionHeaderTitle({ size, as, className, ...props }: HeadingProps) {
  const context = use(SectionHeaderContext)
  const preset = sectionHeaderTitles[context.size]

  return (
    <Heading
      size={size ?? preset.size}
      as={as ?? preset.as}
      // A page title steps down to 20px on a phone, where it shares its line with the actions.
      className={cn(
        context.size === "page" && "max-sm:text-xl max-sm:[grid-area:title]",
        className,
      )}
      {...props}
    />
  )
}

/**
 * The link back to the list a record belongs to, over the title: muted, one size on every
 * page. The caller passes the link with its chevron.
 */
function SectionHeaderBack({ className, ...props }: ComponentProps<"div">) {
  const { size } = use(SectionHeaderContext)

  return (
    <div
      className={cn(
        "flex text-copy [&_svg]:size-3.5",
        size === "page" && "max-sm:mb-2 max-sm:[grid-area:back]",
        className,
      )}
      {...props}
    />
  )
}

interface BackLinkProps {
  /** The link to the list, rendered as the control: a router's `<Link to="/users" />`. */
  render: ReactElement
  /** The list's name: "Users". */
  children: ReactNode
}

/**
 * The link back to the list a record belongs to, for the header's `back` slot: a chevron and
 * the list's name, muted, the same on every detail page.
 */
function BackLink({ render, children }: BackLinkProps) {
  return (
    <InlineAction touchTarget className="gap-1" render={render}>
      <ChevronLeftIcon />
      {children}
    </InlineAction>
  )
}

type SectionHeaderBodyProps = ComponentProps<"div"> & {
  /**
   * Leading visual, e.g. an entity avatar.
   */
  leading?: ReactNode
}

/**
 * The one title block for every header in the app (pages, cards, dialogs, settings sections):
 * an optional leading visual beside a column of `SectionHeaderTitle` + `SectionHeaderDescription`. Change the
 * spacing here and it changes everywhere.
 */
function SectionHeaderBody({ leading, children, className, ...props }: SectionHeaderBodyProps) {
  // A page header without a leading visual hands its parts to the header's phone grid.
  const dissolve = use(SectionHeaderContext).size === "page" && !leading

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3",
        dissolve && "max-sm:contents",
        className,
      )}
      {...props}
    >
      {leading}
      <div className={cn("flex min-w-0 flex-col gap-1.5", dissolve && "max-sm:contents")}>
        {children}
      </div>
    </div>
  )
}

/**
 * The muted line under a title. Wraps by default; pass `truncate` for one-line entity meta.
 */
function SectionHeaderDescription({ className, ...props }: ComponentProps<"p">) {
  const { size } = use(SectionHeaderContext)

  return (
    <p
      className={cn(
        descriptionClasses,
        // Two lines at most on a phone, so a long one never pushes the page down.
        size === "page" && "max-sm:mt-2 max-sm:line-clamp-2 max-sm:[grid-area:description]",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Right-aligned actions. Stops shrinking when the header is `wrap={false}`, so a long title
 * truncates instead of squeezing the buttons.
 */
function SectionHeaderActions({ className, ...props }: ComponentProps<typeof Stack>) {
  const { size, wrap } = use(SectionHeaderContext)

  return (
    <Stack
      className={cn(
        "-my-0.5",
        !wrap && "shrink-0",
        // A page's actions sit as close as the toolbar's controls, and on a phone they hold the
        // end of the title's line.
        size === "page" && "flex-nowrap gap-1.5 max-sm:[grid-area:actions]",
        className,
      )}
      {...props}
    />
  )
}

export {
  BackLink,
  SectionHeader,
  SectionHeaderTitle,
  SectionHeaderBack,
  SectionHeaderBody,
  SectionHeaderDescription,
  SectionHeaderActions,
}
