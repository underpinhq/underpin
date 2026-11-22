import { useRender } from "@base-ui/react/use-render"
import type { ReactElement, ReactNode } from "react"
import { descriptionClasses, iconTileClasses } from "../lib/classes"
import { cn } from "../lib/variants"
import { Card, CardFooter, CardPanel } from "./card"
import { Heading } from "./heading"
import { Skeleton } from "./skeleton"

export interface AuthCardProps {
  /** A glyph over the title, for a step reached from a link. */
  icon?: ReactNode
  /** In the icon's place, drawn as it is: the workspace an invite opens, an app's avatar. */
  mark?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** The last submit's failure, as a `Callout`. */
  error?: ReactNode
  /** The sign-in provider buttons, above the form. */
  providers?: ReactNode
  children?: ReactNode
  /** One sentence and a `TextLink` to the neighbouring step, in the band at the bottom. */
  footer?: ReactNode
}

/**
 * The card every signed-out step is: header, error, providers, form, footer band. It is the
 * page's one surface, so it takes the dialog's shadow and stands clear of the page behind it.
 */
export function AuthCard({
  icon,
  mark,
  title,
  description,
  error,
  providers,
  children,
  footer,
}: AuthCardProps) {
  return (
    <Card className="w-full max-w-96 shadow-modal">
      {/* A phone gets 40px buttons and inputs, a finger's width. */}
      <CardPanel
        size="lg"
        className="flex flex-col gap-6 max-md:[&_button]:h-10 max-md:[&_input]:py-3"
      >
        <header className="flex flex-col items-center gap-4 text-center">
          {icon && <div className={cn(iconTileClasses, "size-10")}>{icon}</div>}
          {mark}

          <div className="flex flex-col gap-1">
            <Heading size="h4" as="h1">
              {title}
            </Heading>
            {description && <p className={descriptionClasses}>{description}</p>}
          </div>
        </header>

        {error}
        {providers}
        {children}
      </CardPanel>

      {/*
        The footer's link is ink rather than brand, since the card's submit is the brand action.
        Its weight sets it apart from the sentence, so it shows the underline only on hover.
      */}
      {footer && (
        <CardFooter
          render={<p />}
          className={cn(
            descriptionClasses,
            "block px-6 text-center md:px-8 *:font-medium *:text-ink *:no-underline *:hover:underline",
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

/** An `AuthCard` still loading, each bar inside the line it stands in for. */
export function AuthCardSkeleton() {
  return (
    <AuthCard
      mark={<Skeleton className="size-10 rounded-full" />}
      title={<Skeleton render={<span />} className="inline-block h-5 w-44 align-middle" />}
      description={
        <>
          <Skeleton render={<span />} className="inline-block h-3 w-72 max-w-full align-middle" />
          <br />
          <Skeleton render={<span />} className="inline-block h-3 w-52 max-w-full align-middle" />
        </>
      }
    >
      <Skeleton className="h-control max-md:h-10" />
    </AuthCard>
  )
}

export interface AuthPageProps {
  /** The product's logo, usually a link to its home page. */
  logo: ReactNode
  /**
   * Drawn behind the logo's band and the top of the card, such as a brand pattern. Position it
   * absolutely; the band is its containing block.
   */
  background?: ReactNode
  /** The `AuthCard`, and whatever sits under it. */
  children: ReactNode
  /**
   * The element the card's column renders as, `<main id="main">` by default. Pass `<div />`
   * inside a layout that already has its own `<main>`, so the page keeps one.
   */
  render?: ReactElement
}

/**
 * The signed-out page: the logo alone in a band across the top, then the card and whatever sits
 * under it. The column is anchored to the top rather than centred, so the card's top edge stays
 * put between steps. The main column is positioned, so it paints after the band and stays on
 * top of a background that runs down under the card.
 */
export function AuthPage({ logo, background, children, render }: AuthPageProps) {
  const column = useRender({
    render,
    defaultTagName: "main",
    props: {
      id: render ? undefined : "main",
      className: "relative flex flex-col items-center gap-6 px-4 pt-6 pb-6 md:px-6 md:pt-24",
      children,
    },
  })

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className="relative flex justify-center px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6">
        {background}
        <div className="relative flex">{logo}</div>
      </header>

      {column}
    </div>
  )
}
