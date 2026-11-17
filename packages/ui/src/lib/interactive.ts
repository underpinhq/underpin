import { variants } from "./variants"

/**
 * Shared chrome for every interactive surface (buttons, inputs, select triggers, switches,
 * tabs): a snappy colour transition, a pointer cursor when `interactive`, and, when `bordered`,
 * the strong 1px border, which darkens under the pointer, plus the subtle fill when the control
 * is clicked rather than typed into. Components layer their own fill and text colours on top
 * with `cn`. An `aria-disabled` control keeps the pointer for its reason's tooltip, so it shows
 * the not-allowed cursor and no hover fill or edge.
 *
 * Focus is not a variant: every focusable element gets the one focus ring from `styles.css`
 * (`:focus-visible`), so there is nothing to opt into here. An invalid control
 * (`aria-invalid`, set by a form field with an error) turns its border to the danger tone and
 * keeps it while focused, so the field the message belongs to reads at a glance.
 */
export const interactiveVariants = variants({
  base: "transition-[color,background-color,border-color,box-shadow,opacity,filter] duration-75 ease-out aria-invalid:border-danger aria-invalid:focus:border-danger",

  variants: {
    interactive: {
      true: "not-disabled:not-aria-disabled:cursor-pointer aria-disabled:cursor-not-allowed",
    },
    bordered: {
      true: "border border-edge-strong hover:not-disabled:not-aria-disabled:not-aria-invalid:border-edge-solid",
    },
  },

  compoundVariants: [
    {
      interactive: true,
      bordered: true,
      class: "hover:not-disabled:not-aria-disabled:bg-fill-subtle",
    },
  ],

  defaultVariants: {
    interactive: true,
  },
})
