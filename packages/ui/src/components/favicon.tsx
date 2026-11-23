"use client"

import { type ComponentProps, type ReactNode, useState } from "react"
import { variants, type VariantProps } from "../lib/variants"

type FaviconStatus = "loaded" | "failed"

/**
 * The letter standing in for a missing icon: the first character of the name, past a leading
 * `www.`, so "www.github.com" reads "G". Counted by code point, so an emoji stays whole.
 */
function formatFaviconLetter(name: string) {
  const [letter = ""] = Array.from(name.trim().replace(/^www\./i, ""))

  return letter.toUpperCase()
}

// Every size draws the icon at 16px or 20px, the sizes favicons ship at. The image's edge is an
// inset outline, so it shows only around an icon that loaded and never shrinks the box. In dark
// mode the image sits on a plate in the ink's near white, because many icons are black on
// nothing and would vanish on a dark fill.
const favicon = variants({
  slots: {
    root: "relative flex shrink-0 items-center justify-center",
    image: [
      "absolute inset-0 m-auto rounded-sm object-contain outline outline-ink/10 -outline-offset-1",
      "bg-[light-dark(transparent,var(--color-ink))]",
    ],
    letter:
      "flex size-full items-center justify-center rounded-[inherit] font-medium text-ink-muted",
  },

  variants: {
    size: {
      // 16px, bare: a breakdown row, a menu item, a field's prefix.
      sm: {
        root: "size-4 rounded-sm",
        image: "size-full",
        letter: "bg-fill text-2xs",
      },
      // 20px, bare: beside a heading or in a header bar.
      md: {
        root: "size-5 rounded-sm",
        image: "size-full",
        letter: "bg-fill text-2xs",
      },
      // 28px tile holding a 16px icon: a table's identity cell, a settings row's leading mark.
      lg: {
        root: "size-7 rounded-md bg-fill",
        image: "size-4",
        letter: "text-xs",
      },
    },
    /**
     * Draw the image over the whole box, clipped to its corners, for a logo made to fill its
     * square (an uploaded ad or product logo) rather than a 16px favicon. Changes only `lg`,
     * where the image otherwise sits small in the middle of its tile.
     */
    fill: {
      true: {},
    },
    loaded: {
      false: { image: "opacity-0" },
    },
  },

  compoundVariants: [
    {
      size: "lg",
      fill: true,
      class: { image: "size-full rounded-[inherit] object-cover" },
    },
  ],

  defaultVariants: {
    size: "sm",
  },
})

const IMAGE_SIZES = { sm: 16, md: 20, lg: 16 } as const

/** The pixels of an `lg` image that fills its tile. */
const FILLED_IMAGE_SIZE = 28

type FaviconProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof favicon> & {
    /**
     * The icon's URL, from your own favicon route or a stored upload. When absent, only the
     * fallback renders.
     */
    src?: string | null

    /**
     * The site's name or hostname. Its first letter shows while the icon loads, and after it
     * fails when there is no `fallback`. Without a name nothing shows while it loads.
     */
    name?: string

    /**
     * Replaces the letter once the icon fails, or when there is no `src` (a globe, a link glyph).
     */
    fallback?: ReactNode

    /**
     * Names the icon for a screen reader, for one with no visible name beside it. Without it
     * the icon is hidden from assistive tech, since the letter would only repeat the name.
     */
    label?: string
  }

/**
 * A site's icon, drawn from the URL you pass. The first letter of `name` stands in while the
 * icon loads. When it fails or there is none, `fallback` takes its place, or the letter stays.
 */
export function Favicon({
  src,
  name = "",
  fallback,
  label,
  size,
  fill,
  className,
  ...props
}: FaviconProps) {
  // Keyed by URL rather than a flag: a row's site changes under it as data refetches, and a flag
  // would keep the fallback over the next site's icon.
  const [status, setStatus] = useState<{ src: string; value: FaviconStatus }>()
  const current = src && status?.src === src ? status.value : undefined
  const isLoaded = current === "loaded"
  const isFailed = !src || current === "failed"

  const styles = favicon({ size, fill, loaded: isLoaded })
  const named = label ? ({ role: "img", "aria-label": label } as const) : { "aria-hidden": true }
  const pixels = fill && size === "lg" ? FILLED_IMAGE_SIZE : IMAGE_SIZES[size ?? "sm"]
  const initial = formatFaviconLetter(name)
  const letter = initial ? <span className={styles.letter()}>{initial}</span> : null

  // An image that settled before React attached its listeners (a cached icon, or one that loaded
  // before a server-rendered page hydrated) fires no event, so its state is read as it mounts.
  // React calls the ref again on every render, so it stops once this URL has a state.
  function readSettled(image: HTMLImageElement | null) {
    if (!image?.complete || !src || status?.src === src) return
    setStatus({ src, value: image.naturalWidth > 0 ? "loaded" : "failed" })
  }

  return (
    <span className={styles.root({ className })} {...named} {...props}>
      {isFailed ? (fallback ?? letter) : !isLoaded && letter}

      {src && !isFailed && (
        <img
          key={src}
          ref={readSettled}
          src={src}
          alt=""
          width={pixels}
          height={pixels}
          loading="lazy"
          className={styles.image()}
          onLoad={() => setStatus({ src, value: "loaded" })}
          onError={() => setStatus({ src, value: "failed" })}
        />
      )}
    </span>
  )
}
