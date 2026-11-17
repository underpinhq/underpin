import type { ComponentProps } from "react"
import { Toaster as Sonner } from "sonner"
import { popupSurfaceClasses } from "../lib/classes"
import { CancelCircleIcon, CheckCircleIcon, HelpIcon, LoadingIcon } from "../lib/icons"
import { cn } from "../lib/variants"

export function Toaster({ className, ...props }: ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      className="pointer-events-auto font-sans antialiased"
      offset={16}
      gap={8}
      /*
       * Sonner's own default is 4s, which is under the time it takes to read a two-line
       * message, and a toast that leaves on its own is the only copy of what it said. The
       * close button is what a reader who is done with it uses instead of waiting. A message
       * that must not expire at all passes `duration: Infinity` when it is raised.
       */
      duration={6000}
      closeButton
      mobileOffset={{ bottom: "calc(16px + env(safe-area-inset-bottom))", left: 16, right: 16 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          /*
           * A toast is drawn on the same card as every menu and picker, so it reads as part of
           * the app rather than a coloured banner over it. The type lives in the icon alone:
           * sonner joins `toast` with exactly one type key per toast as a plain string, so a
           * per-type class here is never merged away. A toast behind the front one collapses
           * to the front toast's height, so its content is hidden or it would show through.
           */
          toast: cn(
            "flex w-full items-start gap-2.5 px-3.5 py-3 font-medium",
            "text-control",
            popupSurfaceClasses,
            "[&[data-expanded=false][data-front=false]>*]:opacity-0",
            className,
          ),
          success: "[&>[data-icon]]:text-success-ink",
          error: "[&>[data-icon]]:text-danger-ink",
          info: "[&>[data-icon]]:text-ink-muted",
          loading: "[&>[data-icon]]:text-ink-muted",
          content: "min-w-0 grow",
          description: "mt-0.5 font-normal text-copy text-ink-muted",
          icon: "relative mt-px size-4 shrink-0",
          // Sonner renders the close button first and parks it in the corner with styles the
          // unstyled toast never loads, so it is ordered to the end of the row here instead. Its
          // 16px glyph sits in a 24px target, pulled back by the margins so the row keeps its size.
          closeButton:
            "order-last -m-1 -mt-0.75 size-6 shrink-0 cursor-pointer rounded-sm p-1 text-ink-muted transition-colors hover:text-ink [&>svg]:size-full",
        },
      }}
      icons={{
        info: <HelpIcon className="size-4" />,
        success: <CheckCircleIcon className="size-4" />,
        error: <CancelCircleIcon className="size-4" />,
        loading: <LoadingIcon className="size-4 animate-spin" />,
      }}
      {...props}
    />
  )
}
