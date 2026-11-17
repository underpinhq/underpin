import { useRender } from "@base-ui/react/use-render"
import { isValidElement, type ReactNode } from "react"
import { descriptionClasses } from "../lib/classes"
import { slot } from "../lib/slot"
import { variants, type VariantProps } from "../lib/variants"

const detailRowVariants = variants({
  slots: {
    root: "",
    label: "",
    value: "",
    below: "",
  },

  variants: {
    density: {
      form: {
        // Two columns once the row's own container is wide enough for both, not once the
        // viewport is: the same row sits in a settings panel and in a dialog, and a viewport
        // breakpoint would split a 400px dialog into a 20rem control beside a word-per-line
        // label. A row with no `@container` ancestor stays stacked, which is the safe read.
        // A label's click does nothing while its control is disabled, so it drops the pointer.
        root: "grid items-start gap-x-8 gap-y-3 py-5 has-disabled:[&_label]:cursor-default @xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]",
        label: "flex min-w-0 flex-col gap-1",
        value: "flex w-full min-w-0 flex-col gap-2 @xl:justify-self-end",
        below: "col-span-full flex min-w-0 flex-col gap-3",
      },
      comfortable: {
        root: "grid items-start gap-x-8 gap-y-1 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]",
        label: "text-ink-muted text-sm",
        value: "min-w-0 text-sm",
      },
      compact: {
        root: "flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0",
        label: "text-ink-muted",
        value: "tabular-nums",
      },
    },
  },

  defaultVariants: {
    density: "comfortable",
  },
})

type DetailRowProps = useRender.ComponentProps<"div"> &
  VariantProps<typeof detailRowVariants> & {
    /**
     * Row label. Pass a `Label` when the row wraps a form field so the label
     * keeps its `htmlFor` wiring.
     */
    label: ReactNode
    description?: ReactNode
    /**
     * Extra classes for the value column, e.g. `sm:items-end` to keep a button
     * at its intrinsic width instead of stretching.
     */
    valueClassName?: string
    /** Full-width content under the label and the control, such as chips. `form` only. */
    below?: ReactNode
  }

/**
 * One "label plus value" line, in the three densities the app uses: `form` for an editable
 * settings row (label and description left, control right), `comfortable` for a detail card's
 * `<dl>`, `compact` for a sidebar timeline. Rows sit in a `divide-y` parent, which draws the
 * hairlines between them.
 */
export function DetailRow({
  density = "comfortable",
  label,
  description,
  valueClassName,
  below,
  className,
  children,
  render,
  ...props
}: DetailRowProps) {
  const styles = detailRowVariants({ density })
  const isForm = density === "form"
  const LabelTag = isForm ? "div" : "dt"
  const ValueTag = isForm ? "div" : "dd"

  return useRender({
    render,
    defaultTagName: "div",
    props: {
      className: styles.root({ className }),
      children: (
        <>
          <LabelTag className={styles.label()}>
            {isForm ? <div className="font-medium text-sm">{label}</div> : label}

            {description &&
              (isValidElement(description) ? (
                slot(description, { className: descriptionClasses })
              ) : (
                <p className={descriptionClasses}>{description}</p>
              ))}
          </LabelTag>

          <ValueTag className={styles.value({ className: valueClassName })}>{children}</ValueTag>

          {isForm && below && <div className={styles.below()}>{below}</div>}
        </>
      ),
      ...props,
    },
  })
}
