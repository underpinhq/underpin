import type { ComponentProps } from "react"
import type { Tone } from "../lib/tone"
import { variants, type VariantProps } from "../lib/variants"

const pingVariants = variants({
  base: "relative flex shrink-0 rounded-full",

  variants: {
    tone: {
      success: "text-success",
      warning: "text-warning",
      danger: "text-danger",
      neutral: "text-ink-muted",
    } satisfies Record<Tone, string>,
    size: {
      sm: "size-1.5",
      md: "size-2",
      lg: "size-2.5",
    },
    /**
     * An outline in the surface colour, for a dot laid over an image or another element.
     */
    outline: {
      true: "outline-2 outline-surface",
    },
  },

  defaultVariants: {
    tone: "neutral",
    size: "md",
  },
})

type PingProps = ComponentProps<"span"> &
  VariantProps<typeof pingVariants> & {
    /**
     * Glow: a soft, slow pulse around the dot, for a status that is live right now. It
     * overflows the box by half the dot size, so layout stays the size of the dot itself.
     */
    animate?: boolean

    /**
     * Names the dot for a screen reader, for a dot whose status no text beside it states.
     * Without it the dot is hidden from assistive tech, since its colour alone says nothing.
     */
    label?: string
  }

/**
 * A status dot: solid fill, optionally glowing, optionally outlined against what it sits on.
 */
export function Ping({
  className,
  tone,
  size,
  outline,
  animate = false,
  label,
  ...props
}: PingProps) {
  const named = label ? ({ role: "img", "aria-label": label } as const) : { "aria-hidden": true }

  return (
    <span className={pingVariants({ tone, size, outline, className })} {...named} {...props}>
      {animate && (
        <>
          <span className="pointer-events-none absolute -inset-1/2 animate-ping rounded-full bg-current opacity-30 blur-[1px] [animation-duration:2s] motion-reduce:animate-none" />
          <span className="pointer-events-none absolute -inset-1/2 animate-pulse rounded-full bg-current opacity-30 motion-reduce:animate-none" />
        </>
      )}
      <span className="absolute inset-0 rounded-full bg-current" />
    </span>
  )
}
