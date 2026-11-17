"use client"

import type { ComponentProps } from "react"
import { formatKeys, formatSpokenKeys, toHotkey, useIsMac } from "../lib/shortcuts"
import { cn } from "../lib/variants"
import { Kbd } from "./kbd"

interface ShortcutKeysProps extends Pick<ComponentProps<typeof Kbd>, "variant"> {
  keys: string
  className?: string
}

/**
 * The badge for one key string, a box per part, in the font the platform draws modifiers in.
 * At the end of a menu row it takes `variant="plain"`, the letters alone, as `MenuShortcut` draws.
 * A screen reader hears the keys spelled out ("Command K") instead of the glyphs. The badge
 * names its key in `data-shortcut`, so an open menu picks the row it sits in when it is pressed.
 */
export function ShortcutKeys({ keys, variant, className }: ShortcutKeysProps) {
  const mac = useIsMac()
  const parts = formatKeys(keys, mac)
  // Glyphs read as one cluster on `Kbd`'s own hairline gap ("⇧X"); a modifier spelled out in
  // words, which is every modifier off a Mac, runs into its key at that gap and needs air.
  const spelled = parts.some(part => part.length > 1)

  return (
    <Kbd
      data-shortcut={toHotkey(keys)}
      variant={variant}
      className={cn("shrink-0", spelled && "gap-[0.35em]", className)}
    >
      <span className="sr-only">{formatSpokenKeys(keys, mac)}</span>
      {parts.map(part => (
        <span key={part} aria-hidden>
          {part}
        </span>
      ))}
    </Kbd>
  )
}
