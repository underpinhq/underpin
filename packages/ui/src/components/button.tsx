import { mergeProps } from "@base-ui/react"
import { useRender } from "@base-ui/react/use-render"
import { Children, isValidElement, type ReactNode } from "react"
import { LoadingIcon } from "../lib/icons"
import { interactiveVariants } from "../lib/interactive"
import { slot } from "../lib/slot"
import { cn, variants, type VariantProps } from "../lib/variants"

// The shared chrome without its edge or cursor, which the button gates on its own variants.
const buttonInteractiveClasses = interactiveVariants({ interactive: false })

const buttonVariants = variants({
  base: [
    buttonInteractiveClasses,
    // Lifted while hovered or focused, so its focus outline runs over a neighbour's edge in a
    // `ButtonGroup` or a toolbar.
    "group/button inline-flex items-center justify-center font-medium text-start rounded-md hover:z-10 focus-visible:z-10",
    "text-control",
    "relative transition-[color,background-color,border-color,box-shadow,translate] duration-150 ease-out-expo",
  ],

  variants: {
    variant: {
      // The open look holds while the button's menu or popover is open (Base UI sets the
      // trigger's `aria-expanded`), so the trigger reads as the thing that opened it. Not
      // `data-popup-open`: a tooltip sets that too, and a button would look open under its tooltip.
      // The same look on hover rides `interactive`, below.
      primary:
        "bg-ink text-ink-inverse shadow-control aria-expanded:bg-ink/90 aria-expanded:shadow-none",
      secondary:
        "bg-surface text-ink-secondary aria-expanded:bg-fill-subtle aria-expanded:text-ink",
      soft: "bg-fill text-ink-secondary aria-expanded:bg-fill-strong aria-expanded:text-ink",
      ghost: "text-ink-secondary aria-expanded:bg-fill-subtle aria-expanded:text-ink",
    },
    // What the action means, apart from how loud it is. Danger is for a loss: a primary danger
    // button confirms one, a secondary danger button starts one from a page.
    tone: {
      neutral: "",
      danger: "",
    },
    bordered: {
      true: "border border-edge-strong shadow-control aria-expanded:ui-standalone:border-edge-solid aria-expanded:ui-standalone:shadow-none",
    },
    // A fixed height and no vertical padding, so a button lines up with the inputs, pickers
    // and triggers beside it whatever it holds: the control scale in `styles.css`.
    size: {
      xs: "h-6 px-2 gap-1 text-xs rounded",
      sm: "h-7 px-2 gap-1.5",
      md: "h-control px-3 gap-1.5",
      lg: "h-9 px-3.5 gap-2 text-sm rounded-lg",
    },
    interactive: {
      // A press sets the button down: it loses its shadow and drops 1px, as a card does. A fixed
      // 1px, so a wide button moves as far as a small one, and a move rather than a scale, which
      // would re-rasterise the label on every frame. It goes down at twice the speed it comes
      // back. The `::after` strip stays over the row the button left, or a press on its top pixel
      // would release outside it and lose the click. A member of a `ButtonGroup` stays in line with
      // its shadow, since either would step it out of the group's outline. Rides `interactive`: a
      // disabled control does not answer.
      true: [
        "not-disabled:not-aria-disabled:cursor-pointer aria-disabled:cursor-not-allowed",
        "ui-pressed:duration-75 ui-pressed:ui-standalone:shadow-none ui-pressed:ui-standalone:translate-y-px",
        "ui-pressed:ui-standalone:after:absolute ui-pressed:ui-standalone:after:inset-x-0 ui-pressed:ui-standalone:after:-top-0.5 ui-pressed:ui-standalone:after:h-0.5",
      ],
    },
  },

  compoundVariants: [
    // A disabled button fades its label and icons to half strength but keeps its fill and edge, so
    // a disabled member of a `ButtonGroup` still draws its part of the outline. On its own it also
    // goes flat. A pending button keeps its colour, since it is busy rather than unavailable.
    {
      variant: ["secondary", "soft", "ghost"],
      class: [
        "not-data-pending:disabled:*:opacity-50 not-data-pending:disabled:ui-standalone:shadow-none",
        "aria-disabled:*:opacity-50 aria-disabled:ui-standalone:shadow-none",
      ],
    },
    // A disabled primary button goes flat and grey instead: ink at half strength reads as a
    // dimmed slab, while the fill reads as a button that is not ready yet.
    {
      variant: "primary",
      class: [
        "not-data-pending:disabled:bg-fill not-data-pending:disabled:text-ink-muted not-data-pending:disabled:shadow-none",
        "aria-disabled:bg-fill aria-disabled:text-ink-muted aria-disabled:shadow-none",
      ],
    },
    // Only a button that does something answers the pointer. A reading drawn as a button, with
    // `interactive` off, keeps its resting look under the cursor. Each variant darkens one step
    // past its hover when pressed, which is the whole press of a `ButtonGroup` member.
    {
      variant: "primary",
      interactive: true,
      class: "hover:not-disabled:not-aria-disabled:bg-ink/90 ui-pressed:bg-ink/80",
    },
    {
      variant: ["secondary", "ghost"],
      interactive: true,
      class:
        "hover:not-disabled:not-aria-disabled:bg-fill-subtle hover:not-disabled:not-aria-disabled:text-ink ui-pressed:bg-fill",
    },
    // A bordered button's edge darkens under the pointer, as a field's and a checkbox's do. Not in
    // a `ButtonGroup`, where a member shares its left edge with the one before it, so a darker
    // edge would stop short on that side: a member answers with its fill alone.
    {
      bordered: true,
      interactive: true,
      class: "hover:ui-standalone:not-disabled:not-aria-disabled:border-edge-solid",
    },
    {
      variant: "soft",
      interactive: true,
      // The fill has no step past `fill-strong`, so a pressed soft button keeps its hover fill.
      class:
        "hover:not-disabled:not-aria-disabled:bg-fill-strong hover:not-disabled:not-aria-disabled:text-ink ui-pressed:bg-fill-strong",
    },
    {
      variant: "primary",
      tone: "danger",
      class:
        "bg-danger text-danger-on hover:not-disabled:not-aria-disabled:bg-danger/90 aria-expanded:bg-danger/90",
    },
    {
      variant: "primary",
      tone: "danger",
      interactive: true,
      class: "ui-pressed:bg-danger/80",
    },
    {
      variant: ["secondary", "soft", "ghost"],
      tone: "danger",
      class:
        "text-danger-ink hover:not-disabled:not-aria-disabled:text-danger-ink aria-expanded:text-danger-ink",
    },
  ],

  defaultVariants: {
    variant: "primary",
    tone: "neutral",
    size: "md",
    interactive: true,
  },
})

// A 14px icon, drawn 2px closer to the edge than the text is.
const buttonAffixClasses = "shrink-0 first:-ml-0.5 last:-mr-0.5 [svg]:size-3.5"
// Nothing but an icon: a square of the button's height, the icon centred in it.
const buttonSquareClasses = "px-0 aspect-square"
const buttonSquareAffixClasses = "shrink-0 [svg]:size-3.5"

/**
 * Hidden while a button with no leading icon is pending, so only the spinner reads as content. A
 * button with one keeps its label, since the spinner takes the icon's place.
 */
const buttonPendingClasses = "group-data-pending/button:text-transparent"

export type ButtonProps = Omit<useRender.ComponentProps<"button">, "size" | "prefix"> &
  VariantProps<typeof buttonVariants> & {
    /**
     * If set to `true`, the button will be rendered in the pending state.
     */
    isPending?: boolean

    /** The slot to be rendered before the label. */
    prefix?: ReactNode

    /** The slot to be rendered after the label. */
    suffix?: ReactNode
  }

function Button({
  children,
  className,
  disabled = false,
  render,
  isPending,
  prefix,
  suffix,
  variant,
  tone,
  size,
  interactive = true,
  bordered,
  ...rest
}: ButtonProps) {
  // `toArray` drops `false` and `null`, so a label hidden with `{wide && "Label"}` leaves an
  // icon-only button, square and with nothing beside its icon.
  const square = Children.toArray(children).length === 0
  const affixClasses = square ? buttonSquareAffixClasses : buttonAffixClasses
  const props = mergeProps<"button">(
    {
      disabled: disabled || isPending,
      "aria-busy": isPending ? true : undefined,
      className: buttonVariants({
        variant,
        tone,
        size,
        interactive,
        bordered: bordered ?? variant === "secondary",
        className: cn(square && buttonSquareClasses, className),
      }),
      children: (
        <>
          {slot(prefix && isPending ? <LoadingIcon className="animate-spin" /> : prefix, {
            className: affixClasses,
          })}

          {/* Beside an affix the label fills the row and pushes the suffix to the end. Alone it
              keeps its own width, so the button's `justify-*` places it: centred by default,
              at the start for a `justify-start` row. */}
          {!square &&
            slot(isValidElement(children) ? children : <span>{children}</span>, {
              className: cn(
                "flex-1 truncate only:flex-initial has-[div]:contents",
                !prefix && buttonPendingClasses,
              ),
            })}

          {slot(suffix, { className: cn(affixClasses, buttonPendingClasses) })}

          {!prefix && !!isPending && (
            <LoadingIcon className="absolute size-[1.25em] animate-spin" />
          )}
        </>
      ),
    },
    rest,
  )

  // `data-pending` drives the label and suffix fade; it sits outside `mergeProps`, whose
  // button props type has no room for a custom data attribute.
  //
  // `type` defaults to "button", not HTML's "submit": a Button inside a <form> that never
  // meant to submit it (a dialog's X, a search field's clear) otherwise does. Callers that
  // want a submit still say so: `props` spreads last and wins. Only applied when the
  // element really is a <button>, since `type` means something else on an <a> or a <label>.
  const isButton = !render

  return useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-pending": isPending ? true : undefined,
      "data-pressable": interactive ? "" : undefined,
      ...(isButton && { type: "button" }),
      ...props,
    },
  })
}

export { Button, buttonVariants }
