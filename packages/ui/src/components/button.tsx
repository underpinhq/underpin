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
    "group/button inline-flex items-center justify-center font-medium text-start rounded-md hover:z-10",
    "text-control",
    "disabled:opacity-50 aria-disabled:opacity-50 data-pending:disabled:opacity-100",
    "relative transition-[color,background-color,border-color,box-shadow,opacity,translate] duration-150 ease-out-expo",
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
      true: "border border-edge-strong shadow-control aria-expanded:border-edge-solid aria-expanded:shadow-none",
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
      // A press sets the button down: it drops 1px and loses its shadow, as a card does. A fixed
      // 1px, so a wide button moves as far as a small one, and a move rather than a scale, which
      // would re-rasterise the label on every frame. It goes down at twice the speed it comes
      // back. The `::after` strip stays over the row the button left, or a press on its top pixel
      // would release outside it and lose the click. Rides `interactive`: a disabled control does
      // not answer.
      true: "not-disabled:not-aria-disabled:cursor-pointer aria-disabled:cursor-not-allowed active:not-disabled:not-aria-disabled:translate-y-px active:not-disabled:not-aria-disabled:shadow-none active:not-disabled:not-aria-disabled:duration-75 active:not-disabled:not-aria-disabled:after:absolute active:not-disabled:not-aria-disabled:after:inset-x-0 active:not-disabled:not-aria-disabled:after:-top-0.5 active:not-disabled:not-aria-disabled:after:h-0.5",
    },
  },

  compoundVariants: [
    // A disabled primary button goes flat and grey rather than fading: ink at half strength
    // reads as a dimmed slab, while the fill reads as a button that is not ready yet. A pending
    // one keeps its colour, since it is busy rather than unavailable.
    {
      variant: "primary",
      class: [
        "not-data-pending:disabled:bg-fill not-data-pending:disabled:text-ink-muted not-data-pending:disabled:shadow-none not-data-pending:disabled:opacity-100",
        "aria-disabled:bg-fill aria-disabled:text-ink-muted aria-disabled:shadow-none aria-disabled:opacity-100",
      ],
    },
    // Only a button that does something answers the pointer. A reading drawn as a button, with
    // `interactive` off, keeps its resting look under the cursor.
    {
      variant: "primary",
      interactive: true,
      class: "hover:not-aria-disabled:bg-ink/90",
    },
    {
      variant: ["secondary", "ghost"],
      interactive: true,
      class: "hover:not-aria-disabled:bg-fill-subtle hover:not-aria-disabled:text-ink",
    },
    // A bordered button's edge darkens under the pointer, as a field's and a checkbox's do.
    {
      bordered: true,
      interactive: true,
      class: "hover:not-aria-disabled:border-edge-solid",
    },
    {
      variant: "soft",
      interactive: true,
      class: "hover:not-aria-disabled:bg-fill-strong hover:not-aria-disabled:text-ink",
    },
    {
      variant: "primary",
      tone: "danger",
      class:
        "bg-danger text-danger-on hover:not-aria-disabled:bg-danger/90 aria-expanded:bg-danger/90",
    },
    {
      variant: ["secondary", "soft", "ghost"],
      tone: "danger",
      class:
        "text-danger-ink hover:not-aria-disabled:text-danger-ink aria-expanded:text-danger-ink",
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
