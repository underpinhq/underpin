import type { ComponentProps } from "react"
import { interactiveVariants } from "../lib/interactive"
import { variants, type VariantProps } from "../lib/variants"

const inputVariants = variants({
  extend: interactiveVariants,
  // A field is an opening in its card: its own ground, white in light and a tone under the card
  // in dark, behind a stronger edge than the card's. Disabled, it fills in and keeps its value
  // readable, so a value never reads as an empty field's placeholder.
  base: [
    "appearance-none min-h-0 w-full self-stretch border border-edge-strong bg-field text-ink break-words disabled:bg-fill-subtle disabled:text-ink-secondary aria-disabled:bg-fill-subtle aria-disabled:text-ink-secondary",
    "text-control",
  ],

  variants: {
    // A field without an edge keeps a transparent border, so it stays the same box.
    bordered: {
      false: "border-transparent",
    },
    // Padding and the border around one line put a field on the control scale, so it is as tall
    // as a button of the same size: 28, 32 and 36px. A textarea shares the padding and grows by
    // lines.
    size: {
      sm: "px-2 py-1.25 font-normal rounded-md",
      md: "px-3 py-1.75 rounded-md",
      lg: "px-3.5 py-1.75 rounded-lg text-sm",
    },
  },

  defaultVariants: {
    interactive: false,
    bordered: true,
    size: "md",
  },
})

/**
 * Attributes that keep password managers off a field. 1Password, LastPass and Bitwarden all
 * decorate a field they read as a credential (an inline button over the text, and an offer to
 * save what was typed once the form submits), and nearly every field in a product is a name, a
 * domain, a note or a third party's secret, none of which belong in a vault. So a field blocks
 * them unless it says otherwise: only a sign-in or register field passes
 * `allowPasswordManager`, since a manager filling those is the point of having one.
 */
export const NO_PASSWORD_MANAGER = {
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
} as const

export interface PasswordManagerProps {
  /** Lets password managers fill the field. Only a credential field sets it. */
  allowPasswordManager?: boolean
}

export function passwordManagerAttributes(allowPasswordManager = false) {
  return allowPasswordManager ? undefined : NO_PASSWORD_MANAGER
}

type InputProps = Omit<ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants> &
  PasswordManagerProps

function Input({
  className,
  interactive,
  bordered,
  size,
  allowPasswordManager,
  ...props
}: InputProps) {
  return (
    <input
      className={inputVariants({ interactive, bordered, size, className })}
      {...passwordManagerAttributes(allowPasswordManager)}
      {...props}
    />
  )
}

export { Input, inputVariants }
