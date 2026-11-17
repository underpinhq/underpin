import type { ComponentProps } from "react"
import { variants, type VariantProps } from "../lib/variants"

const kbdVariants = variants({
  // `font-system`: a key cap is the one place the platform's font beats the brand's, since the
  // modifier glyphs (⇧ ⌘ ⌥ ⌃) are drawn to match its letterforms and Inter's are not.
  // A single-key cap is square: its minimum width is its height (the 1.25em line plus
  // 0.088em above and below), and the 0.22em side padding is what still fits `W`, the widest
  // letter, inside it (measured), so a column of letter caps lines up. A chord grows wider.
  base: "inline-flex min-w-[1.426em] justify-center gap-[0.1em] -my-0.5 px-[0.22em] py-[0.088em] whitespace-nowrap tabular-nums rounded-sm font-system text-xs/tight text-ink-muted",

  variants: {
    variant: {
      soft: "bg-fill-subtle",
      // The letters alone, for the end of a menu row, where a column of caps would outweigh the
      // labels it annotates. The square minimum width still lines the letters up.
      plain: "",
      // An outline only, with no fill: a cap sits beside a label in a tooltip, a field or help
      // text, where a filled box would outweigh the words around it.
      // Its border adds 2px to the height, so the width takes the same to keep a letter cap square.
      outline: "min-w-[calc(1.426em+2px)] border",
    },
  },

  defaultVariants: {
    variant: "outline",
  },
})

type KbdProps = ComponentProps<"kbd"> &
  VariantProps<typeof kbdVariants> & {
    meta?: boolean
    shift?: boolean
    alt?: boolean
    ctrl?: boolean
  }

export function Kbd({ children, className, variant, meta, shift, alt, ctrl, ...props }: KbdProps) {
  return (
    <kbd className={kbdVariants({ variant, className })} {...props}>
      {shift && <span>⇧</span>}
      {meta && <span>⌘</span>}
      {alt && <span>⌥</span>}
      {ctrl && <span>⌃</span>}
      {/* `contents`, so a caller passing its own parts (see `ShortcutKeys`) gets them spaced by
          the gap above rather than run together inside one box */}
      {children && <span className="contents">{children}</span>}
    </kbd>
  )
}
