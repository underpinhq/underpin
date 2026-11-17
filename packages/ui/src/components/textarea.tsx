import type { ComponentProps } from "react"
import { cn, type VariantProps } from "../lib/variants"
import { inputVariants, passwordManagerAttributes, type PasswordManagerProps } from "./input"

type TextareaProps = Omit<ComponentProps<"textarea">, "size"> &
  VariantProps<typeof inputVariants> &
  PasswordManagerProps

/**
 * A multi-line field that grows with its text up to 320px, then scrolls. A browser without
 * `field-sizing` keeps the `rows` height and scrolls from there.
 */
function Textarea({
  className,
  interactive,
  bordered,
  size,
  allowPasswordManager,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={inputVariants({
        interactive,
        bordered,
        size,
        className: cn(
          "max-h-80 overflow-y-auto text-copy resize-none field-sizing-content",
          className,
        ),
      })}
      {...passwordManagerAttributes(allowPasswordManager)}
      {...props}
    />
  )
}

export { Textarea }
