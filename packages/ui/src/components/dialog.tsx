"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Drawer } from "@base-ui/react/drawer"
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  use,
  useState,
} from "react"
import { CancelIcon } from "../lib/icons"
import { usePopupSheet } from "../lib/media"
import { cn, variants, type VariantProps } from "../lib/variants"
import { Button } from "./button"
import {
  SectionHeader,
  SectionHeaderBody,
  SectionHeaderDescription,
  SectionHeaderTitle,
} from "./section-header"

/**
 * Whether this dialog is open as the phone bottom sheet: a Base UI Drawer popup, with the
 * swipe-down-to-dismiss and rubber-banding a sheet is expected to have. `DialogContent` decides
 * it as the dialog opens and holds it until the dialog closes; every part inside reads it.
 */
const SheetContext = createContext(false)

/**
 * Whether the dialog this sits in is open as the phone bottom sheet, for content that differs
 * between the two shapes. It follows the dialog, not the viewport, so it holds while open.
 */
function useDialogSheet() {
  return use(SheetContext)
}

/** The drawer root's props less the swipe and snap ones, which only the sheet could use. */
type DialogProps = Omit<
  Drawer.Root.Props,
  | "swipeDirection"
  | "snapPoints"
  | "snapPoint"
  | "defaultSnapPoint"
  | "onSnapPointChange"
  | "snapToSequentialPoints"
>

/**
 * The root is a Base UI Drawer at every width. A drawer is a dialog with swipe parts added, so
 * its root drives the dialog's own popup as well as the sheet. With one root type for both
 * shapes, nothing above the popup changes when the viewport crosses `sm`.
 */
function Dialog(props: DialogProps) {
  return <Drawer.Root {...props} />
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger {...props} />
}

/** `hideClose` from `DialogContent`, read by `DialogHeader` so its own X follows suit. */
const DialogCloseContext = createContext(false)

/** The one X: a ghost button in the header row when there is a header, else pinned to the corner. */
function DialogX({ className, ...props }: ComponentProps<"button">) {
  return (
    <DialogPrimitive.Close
      render={<Button variant="ghost" aria-label="Close" prefix={<CancelIcon />} />}
      className={className}
      {...props}
    />
  )
}

function DialogTitle(props: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title {...props} />
}

function DialogDescription(props: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description {...props} />
}

/**
 * The dialog's own timing, pinned rather than left to `tailwindcss-animate`'s 150ms on the
 * browser default `ease`: a modal is the system's slowest move, so it enters on the one motion
 * curve over 200ms and leaves faster and plainer, having nothing left to announce. The backdrop
 * rides the same numbers so ink and panel arrive together. The exit holds its last frame, as the
 * popups' does, so the panel cannot flash back before it unmounts.
 */
const dialogAnimationClasses = [
  "data-open:duration-200 data-open:animate-in data-open:ease-out-expo",
  "data-closed:duration-150 data-closed:animate-out data-closed:fill-mode-forwards data-closed:ease-out",
]

const dialogOverlayAnimationClasses = [
  ...dialogAnimationClasses,
  "data-open:fade-in-0 data-closed:fade-out-0",
]

/**
 * A sheet or side panel for a reader who asks for reduced motion: it fades where it stands
 * instead of travelling. The stylesheet's reduced-motion rule already turns the transform
 * transition into an opacity one, so the popup only has to keep its place (its off-screen
 * transforms are `motion-safe:`) and go transparent. A swipe still follows the finger, and a
 * dismissed popup fades from where the finger left it. The backdrop takes the same timing, so
 * ink and panel still leave together.
 */
const drawerReducedTimingClasses =
  "motion-reduce:duration-200 motion-reduce:data-ending-style:duration-150"

const drawerReducedFadeClasses = [
  drawerReducedTimingClasses,
  "motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0",
]

/**
 * How a drawer's backdrop comes and goes: a transition, not a keyframe animation. The drawer
 * stays mounted for its own longer close, and a `fade-out` animation would end early and hand
 * the backdrop back at full strength for the rest of it. This also lets the backdrop thin out
 * under the finger, and leave on the curve the swipe's own momentum sets.
 */
const drawerBackdropClasses = [
  "opacity-[calc(1-var(--drawer-swipe-progress,0))]",
  "transition-opacity duration-[450ms] ease-drawer data-swiping:duration-0",
  "data-starting-style:opacity-0 data-ending-style:opacity-0",
  "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
  drawerReducedTimingClasses,
]

/** The scrim behind the dialog. Rendered by `DialogContent`. */
function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  const sheet = useDialogSheet()
  const Backdrop = sheet ? Drawer.Backdrop : DialogPrimitive.Backdrop

  return (
    <Backdrop
      // Base UI renders no backdrop for a dialog opened from inside another one. Each dialog
      // draws its own, so a stack reads as a stack: the one underneath sits behind a dim of
      // its own rather than staying as crisp as the dialog on top of it.
      forceRender
      className={cn(
        "fixed inset-0 z-50 bg-scrim",
        sheet ? drawerBackdropClasses : dialogOverlayAnimationClasses,
        className,
      )}
      {...props}
    />
  )
}

const dialogContentVariants = variants({
  // The shape of a dialog opened from `sm` up; one opened under it is a drawer (`sheetPopup`).
  // The popup carries no padding of its own: every section owns its own band, a `DialogBody`
  // for the padded block, a `DialogHeader` and `DialogFooter` for the ones with a hairline.
  base: [
    "fixed left-1/2 z-50 grid w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-xl border bg-surface shadow-modal outline-none",
    // The corner X is the fallback for a dialog with no header; a header hosts its own. Matched
    // on the content rather than as the header's sibling, so a header wrapped in a `contents`
    // form still retires it instead of leaving two X's stacked in the corner.
    "has-[[data-slot=dialog-header]]:[&>[data-slot=dialog-corner-close]]:hidden",
    ...dialogAnimationClasses,
    "data-open:fade-in-0 data-closed:fade-out-0",
    "data-open:zoom-in-98 data-closed:zoom-out-98",
    "data-open:slide-in-from-bottom-4 data-closed:slide-out-to-bottom-4",
  ],

  variants: {
    size: {
      xs: "max-w-xs",
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      "5xl": "max-w-5xl",
    },

    /**
     * Pin the dialog near the top of the viewport instead of centering it, so its height can
     * change without the whole thing jumping. A dialog opened from inside another one carries
     * Base UI's `data-nested` and sits a little lower, so the stack is visible as a stack. Each
     * portal is its own subtree, so no sibling selector can see the one underneath.
     */
    fixed: {
      true: "top-[10dvh] max-h-[calc(90dvh-2rem)] data-nested:top-[calc(10dvh+2.5rem)] data-nested:max-h-[calc(90dvh-4.5rem)]",
      false: "top-1/2 max-h-[calc(100dvh-2rem)] -translate-y-1/2",
    },
  },

  defaultVariants: {
    size: "md",
    fixed: true,
  },
})

/**
 * The sheet itself: full width against the bottom edge, following the finger down and then
 * either springing back or riding the swipe's own momentum out. `touch-none` hands vertical
 * drags to the drawer; the body inside takes them back with `touch-auto` and only gives them
 * up once it is scrolled to the top, so a swipe on a scrolled list scrolls it.
 */
const sheetPopup = [
  "flex max-h-[calc(100dvh-3rem)] w-full touch-none flex-col overflow-hidden rounded-t-xl border border-b-0 bg-surface shadow-modal outline-none",
  "[transform:translateY(var(--drawer-swipe-movement-y))]",
  "transition-transform duration-[450ms] ease-drawer",
  "data-swiping:select-none data-swiping:duration-0",
  "motion-safe:data-starting-style:[transform:translateY(100%)] motion-safe:data-ending-style:[transform:translateY(100%)]",
  "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
  ...drawerReducedFadeClasses,
]

const sheetContent = [
  // `relative` anchors the corner X, as `fixed` does on the dialog's own popup.
  "relative grid min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain",
  // As on the dialog: a header brings its own X, so the corner fallback stands down.
  "has-[[data-slot=dialog-header]]:[&>[data-slot=dialog-corner-close]]:hidden",
  // Room past the home indicator under whatever section sits last; the grabber covers the top.
  // A footer band cancels this padding with a negative margin and carries the inset itself, so
  // its fill reaches the sheet's bottom edge instead of stopping short of it.
  "pb-[env(safe-area-inset-bottom)]",
]

interface DialogContentProps
  extends
    Omit<DialogPrimitive.Popup.Props, "className" | "render" | "style">,
    VariantProps<typeof dialogContentVariants> {
  className?: string
  style?: CSSProperties

  /** The element the popup renders as, such as a form, in either shape. */
  render?: ReactElement

  /**
   * Hide the close button in the top right corner, for a dialog that must be dismissed
   * through one of its own actions.
   */
  hideClose?: boolean

  /** Open and close at once, for a dialog a shortcut summons. A sheet still slides. */
  instant?: boolean
}

/**
 * The popup in the shape the viewport had when the dialog opened. It mounts inside the portal,
 * which mounts as the dialog opens and unmounts once it has closed, so the shape is read then
 * and held: crossing `sm` with the dialog open leaves it, and the form in it, as it is.
 */
function DialogSurface({
  className,
  children,
  size,
  fixed,
  hideClose,
  instant,
  ...props
}: DialogContentProps) {
  const sheet = usePopupSheet()
  // Important, because `tailwindcss-animate` emits `animate-in` after `animate-none`.
  const instantClasses = instant ? "data-open:animate-none! data-closed:animate-none!" : undefined

  const body = (
    <>
      <DialogCloseContext value={!!hideClose}>{children}</DialogCloseContext>

      {/* Corner fallback for a dialog without a `DialogHeader`, which hosts the X itself. */}
      {!hideClose && (
        <DialogX
          data-slot="dialog-corner-close"
          className="absolute top-3 right-3 z-20 pointer-coarse:top-1.5 pointer-coarse:right-1.5"
        />
      )}
    </>
  )

  // A sheet spans the phone's width, so `size` has nothing to constrain and is dropped.
  if (sheet) {
    return (
      <SheetContext value>
        <DialogOverlay />

        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className={cn(sheetPopup)} {...props}>
            {/* The grabber: says the sheet pulls down, and is the one part always in reach. A
                raised key rather than a line, and a tap on it closes the sheet. Its `::before`
                spills past the 24px band to a 44px target. Out of the tab order, since the
                header's X is the keyboard's way out. */}
            <Drawer.Close
              aria-label="Close"
              tabIndex={-1}
              className="group/grabber relative mx-auto flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center outline-none before:absolute before:inset-x-0 before:-inset-y-2.5"
            >
              <span className="h-1.25 w-9 rounded-full border bg-surface shadow-control transition-[scale,box-shadow] duration-150 ease-out-expo group-active/grabber:scale-x-94 group-active/grabber:shadow-none" />
            </Drawer.Close>

            <Drawer.Content className={cn(sheetContent, className)}>{body}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </SheetContext>
    )
  }

  return (
    <>
      <DialogOverlay className={instantClasses} />

      <DialogPrimitive.Popup
        className={dialogContentVariants({ size, fixed, className: cn(instantClasses, className) })}
        {...props}
      >
        {body}
      </DialogPrimitive.Popup>
    </>
  )
}

function DialogContent(props: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogSurface {...props} />
    </DialogPrimitive.Portal>
  )
}

/**
 * What a dialog is showing, kept alive through its close animation. A dialog driven by
 * `open={!!row}` loses `row` the instant it closes, so its body unmounts and the popup fades
 * out as an empty box with a stray footer. Render what this returns instead of the state
 * itself, and the last row stays on screen until the animation ends.
 */
export function useDialogValue<T>(value: T | null | undefined): T | null {
  // Adjusting state while rendering, which React supports for exactly this (deriving from a
  // value that changed), and which a ref written during render would only fake.
  const [last, setLast] = useState<T | null>(value ?? null)

  if (value != null && value !== last) {
    setLast(value)
  }

  return value ?? last
}

/**
 * The padded block a dialog's content sits in, holding its own header when that header has no
 * hairline of its own. A dialog whose body scrolls or splits into panes lays out those regions
 * itself instead, so the column names and the panes reach the popup's edges.
 */
function DialogBody({ className, ...props }: ComponentProps<"div">) {
  const sheet = useDialogSheet()

  return (
    // `first:pt-3` closes the gap under the sheet's grabber, which stands in for the top
    // padding whenever the body is the sheet's first section.
    <div className={cn("flex flex-col gap-6 p-6", sheet && "first:pt-3", className)} {...props} />
  )
}

const dialogHeaderVariants = variants({
  // `relative` anchors the X, which leaves the row under `sm` where the card header stacks.
  base: "relative",

  variants: {
    /**
     * Give the header its own band: a hairline and the padding to sit on. It belongs to a
     * dialog that owns its body as a region: one that scrolls under the header, or splits
     * into panes. A dialog whose body is a single `DialogBody` block holds its header inside
     * that block instead, with nothing drawn under it.
     */
    bordered: {
      true: "border-b px-6 py-5",
    },
  },
})

type DialogHeaderProps = Omit<ComponentProps<typeof SectionHeader>, "title" | "description"> &
  VariantProps<typeof dialogHeaderVariants> & {
    title: ReactNode
    description?: ReactNode
  }

/**
 * The standard dialog heading: a card-scale `SectionHeader` whose title and description are wired to
 * Base UI's `DialogTitle` / `DialogDescription` for accessibility. Extra children render after
 * them, and the dialog's X sits at the end of the row, centred on the title line.
 */
function DialogHeader({
  title,
  description,
  bordered,
  className,
  children,
  ...props
}: DialogHeaderProps) {
  const hideClose = use(DialogCloseContext)

  return (
    <SectionHeader
      size="card"
      data-slot="dialog-header"
      className={dialogHeaderVariants({ bordered, className })}
      {...props}
    >
      <SectionHeaderBody>
        {/* A step smaller in the bottom sheet, where the title is a row label, not a page
            heading. */}
        <DialogTitle render={<SectionHeaderTitle className="max-sm:text-base" />}>
          {title}
        </DialogTitle>

        {description && (
          <DialogDescription render={<SectionHeaderDescription />}>{description}</DialogDescription>
        )}
      </SectionHeaderBody>

      {children}

      {!hideClose && (
        // A box the height of the title line (28px, 24px in the sheet), so the X centres on the
        // title whatever sits under it; pulled out by 6px so the glyph's edge sits on the same
        // inset as the title's. Under `sm` the card header stacks into a column, so the box
        // leaves the flow and pins itself to the title line instead.
        <div
          className={cn(
            "-mr-1.5 flex h-7 shrink-0 items-center self-start max-sm:absolute max-sm:mr-0 max-sm:h-6",
            bordered ? "max-sm:top-5 max-sm:right-4.5" : "max-sm:top-0 max-sm:-right-1.5",
          )}
        >
          <DialogX />
        </div>
      )}
    </SectionHeader>
  )
}

/**
 * The band a dialog's actions sit in: a hairline, the canvas fill that sets it apart from the
 * white body above, and room past the home indicator on a bottom sheet. Every dialog with
 * actions wears it, whether or not its header has a hairline of its own.
 */
function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  const sheet = useDialogSheet()

  return (
    <div
      className={cn(
        "flex flex-col flex-wrap gap-2 border-t bg-canvas px-6 py-4 sm:flex-row sm:justify-end",
        // A long dialog scrolls under its actions rather than taking them out of view.
        !sheet && "sticky bottom-0 z-10",
        // The control type scale, as on a card's footer, so an `InlineAction` lines up with
        // the buttons beside it.
        "text-control",
        // On a sheet the band runs to the bottom edge: the negative margin swallows the
        // scroll container's home-indicator inset, and the padding gives that room back
        // inside the fill. The stack keeps the row's order, so the primary sits nearest the thumb.
        sheet && "-mb-[env(safe-area-inset-bottom)] pb-[calc(1.75rem+env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  )
}

function DialogClose(props: ComponentProps<typeof Button>) {
  return <DialogPrimitive.Close render={<Button variant="secondary" {...props} />} />
}

/**
 * The side panel: pinned to the left edge at full height, following the finger left and then
 * either springing back or riding the swipe's own momentum out, as the sheet does downward.
 * `shadow-drawer` is the modal shadow cast sideways, with the edge first: that edge is the
 * panel's right hairline, so the panel carries no border of its own.
 */
const sidePopup = [
  "flex h-full w-70 touch-none flex-col border-r bg-canvas shadow-drawer outline-none",
  "[transform:translateX(var(--drawer-swipe-movement-x))]",
  "transition-transform duration-[450ms] ease-drawer",
  "data-swiping:select-none data-swiping:duration-0",
  "motion-safe:data-starting-style:[transform:translateX(-100%)] motion-safe:data-ending-style:[transform:translateX(-100%)]",
  "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
  ...drawerReducedFadeClasses,
]

type SideDrawerProps = Omit<Drawer.Root.Props, "children"> & {
  /**
   * The element that opens the panel, and closes it while it is open. It stays outside the
   * panel, so a shell whose bar owns the toggle keeps one button for both states.
   */
  trigger: ReactElement

  /**
   * Where the panel and its scrim start, measured from the top of the viewport: a CSS length
   * for a shell with a sticky bar that stays above them. They span the full height by default.
   */
  offset?: string

  /** Classes for the panel itself. */
  className?: string
  children: ReactNode
}

/**
 * A panel sliding in from the left edge over a scrim: the phone's navigation drawer. Escape,
 * a tap on the scrim, a swipe to the left and a press on the trigger all close it.
 */
function SideDrawer({ trigger, offset, className, children, ...props }: SideDrawerProps) {
  // The scrim and the panel hang below whatever the shell keeps above them, so the bar holding
  // the trigger is never dimmed and stays in reach.
  const inset = { top: offset }

  return (
    <Drawer.Root swipeDirection="left" {...props}>
      <Drawer.Trigger render={trigger} />

      <Drawer.Portal>
        <Drawer.Backdrop
          style={inset}
          className={cn("fixed inset-0 z-50 bg-scrim", drawerBackdropClasses)}
        />

        <Drawer.Viewport style={inset} className="fixed inset-0 z-50 flex">
          <Drawer.Popup className={cn(sidePopup, className)}>
            <Drawer.Content className="flex min-h-0 flex-1 touch-auto flex-col overflow-y-auto overscroll-contain">
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  SideDrawer,
  useDialogSheet,
}
