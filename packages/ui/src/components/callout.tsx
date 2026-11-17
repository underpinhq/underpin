import type { ComponentProps, ReactNode } from "react"
import type { IconComponent } from "../lib/icon"
import { AlertCircleIcon, AlertIcon, CheckCircleIcon, InfoIcon } from "../lib/icons"
import { slot } from "../lib/slot"
import type { Tone } from "../lib/tone"
import { cn, variants, type VariantProps } from "../lib/variants"
import { Stack } from "./stack"

const calloutVariants = variants({
  // The edge is in the tone at 20%, the same edge an outline badge draws.
  base: "w-full gap-x-2.5 rounded-lg px-3.5 py-3 text-ink",

  variants: {
    tone: {
      neutral: "border bg-fill",
      warning: "border border-warning-edge bg-warning-subtle",
      success: "border border-success-edge bg-success-subtle",
      danger: "border border-danger-edge bg-danger-subtle",
    },
  },

  defaultVariants: {
    tone: "neutral",
  },
})

/** The icon carries the tone on its own, so the words beside it stay in the page's ink. */
const calloutIconVariants = variants({
  base: "mt-0.5 size-4 shrink-0 self-start",

  variants: {
    tone: {
      neutral: "text-ink-muted",
      warning: "text-warning-ink",
      success: "text-success-ink",
      danger: "text-danger-ink",
    },
  },

  defaultVariants: {
    tone: "neutral",
  },
})

/**
 * The role for each way a callout is announced. A callout on screen from the start is a note
 * whatever its tone: a live role there would interrupt a screen reader on page load and read the
 * callout twice. Only a callout that appears in answer to an action is live.
 */
const calloutRoles = {
  off: "note",
  polite: "status",
  assertive: "alert",
} as const

/** The outline icon for each tone, from the same set as every other icon in the interface. */
const calloutIcons: Record<Tone, IconComponent> = {
  neutral: InfoIcon,
  warning: AlertIcon,
  success: CheckCircleIcon,
  danger: AlertCircleIcon,
}

type CalloutProps = Omit<ComponentProps<typeof Stack>, "prefix" | "suffix"> &
  VariantProps<typeof calloutVariants> & {
    /** The slot to be rendered before the content. Defaults to the tone's own icon. */
    prefix?: ReactNode

    /** The slot to be rendered after the content, such as a single trailing link. */
    suffix?: ReactNode

    /**
     * Announces the callout when it appears, for one shown in answer to an action: `assertive`
     * for a failure, `polite` for a confirmation. Leave it off for a callout that renders with
     * the page.
     */
    live?: "polite" | "assertive"
  }

function Callout({ children, className, tone, prefix, suffix, live, ...props }: CalloutProps) {
  const ToneIcon = calloutIcons[tone ?? "neutral"]

  return (
    <Stack
      size="sm"
      wrap={false}
      role={calloutRoles[live ?? "off"]}
      className={calloutVariants({ tone, className })}
      {...props}
    >
      {slot(prefix ?? <ToneIcon />, { className: calloutIconVariants({ tone }) })}
      {children}
      {slot(suffix, { className: "shrink-0 self-center" })}
    </Stack>
  )
}

function CalloutText({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-copy font-medium", className)} {...props} />
}

export { Callout, CalloutText }
