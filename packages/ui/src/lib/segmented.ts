import { type RefObject, useLayoutEffect, useRef } from "react"
import { interactiveVariants } from "./interactive"
import { cn, variants, type VariantProps } from "./variants"

/** The variant and size a row hands its options, with the defaults filled in. */
export interface SegmentedStyle {
  variant: NonNullable<VariantProps<typeof segmentedVariants>["variant"]>
  size: NonNullable<VariantProps<typeof segmentedVariants>["size"]>
}

/**
 * The row of options with one sliding pill behind the chosen one, shared by `Tabs` and
 * `SegmentedControl`. Each component positions the pill from its own measurements and adds the
 * state classes its primitive emits (`data-active` on a tab, `data-checked` on a radio), so
 * the slots here hold only the shape.
 */
export const segmentedVariants = variants({
  slots: {
    root: "relative inline-flex items-center text-ink-muted",
    // Positioned from the root's top-left corner rather than centred on it, so a row that
    // wraps onto a second line moves the pill down to the chosen option's line as well as
    // across. 200ms on the `--ease-out-expo` curve: a pill still travelling when the new
    // content lands reads as lag.
    indicator:
      "absolute top-0 left-0 z-0 rounded-md transition-[translate,width,height] duration-200 ease-out-expo",
    item: cn(
      interactiveVariants({ interactive: false }),
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap font-medium",
      // Hover and press darken the label only. The pill alone marks the chosen option, so a
      // fill under the pointer would read as a second pill beside it while the first one slides.
      "hover:text-ink active:text-ink",
      // A finger's 40px target, centred on the option and spilling into the row above and
      // below rather than growing the option: a `min-height` here would stretch the pill, and
      // with it the card header the row sits in. Check it on a real phone: a desktop
      // browser's mobile emulation does not match `pointer: coarse`.
      "pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:top-1/2 pointer-coarse:before:h-10 pointer-coarse:before:-translate-y-1/2",
    ),
  },

  variants: {
    variant: {
      // The chosen option is a raised key as tall as the track, which is a well with no edge of
      // its own, so the two read as one control, the way a switch's thumb meets its track. No
      // inset and no gap between options.
      segmented: {
        root: "rounded-md bg-well shadow-well",
        indicator: "rounded-md border border-edge-strong bg-surface shadow-control",
      },
      // The same box with nothing drawn around it: no track and no edge, the chosen option on
      // the fill. A plain row is as tall as a segmented one of its size, so its labels line
      // up with any control beside it. For in-card view switchers.
      plain: {
        root: "gap-0.5",
        indicator: "rounded-md bg-fill",
      },
    },
    // The control scale, on the options rather than the row, so a row that wraps grows by
    // whole lines and a row that pads itself keeps its options' height: md is 32px and sm 28px,
    // for a card header, both with 13px labels like every control of their size; xs is 24px
    // with 12px labels, for a control inside a menu row.
    size: {
      md: { item: "h-control rounded-md px-2.5 text-control" },
      sm: { item: "h-7 rounded-md px-2 text-control" },
      xs: { root: "rounded", indicator: "rounded", item: "h-6 rounded px-1.5 text-xs" },
    },
    // An option that is only an icon: a square of the option's height, the icon 14px, or 12px
    // in an xs row. `SegmentedControlItem` sets it for an option labelled by `aria-label` alone.
    icon: {
      true: { item: "aspect-square px-0 [&_svg]:size-3.5" },
    },
  },

  compoundVariants: [{ size: "xs", icon: true, class: { item: "[&_svg]:size-3" } }],

  defaultVariants: {
    variant: "segmented",
    size: "md",
  },
})

/** The pill's box, read from what `useSegmentedIndicator` wrote, hidden until it is measured. */
export const SEGMENTED_INDICATOR_BOX =
  "hidden h-(--indicator-height) w-(--indicator-width) translate-x-(--indicator-left) translate-y-(--indicator-top) in-data-measured:block"

/** A segmented row's raised key on the checked option itself, until the pill has a box to take. */
export const SEGMENTED_UNMEASURED_KEY =
  "[&:not([data-measured])_[data-checked]]:bg-surface [&:not([data-measured])_[data-checked]]:shadow-control [&:not([data-measured])_[data-checked]]:outline [&:not([data-measured])_[data-checked]]:-outline-offset-1 [&:not([data-measured])_[data-checked]]:outline-edge-strong"

/** Writes the checked option's box onto the row, where the pill reads it. */
function measure(root: HTMLElement) {
  const checked = root.querySelector<HTMLElement>(
    '[role="radio"][data-checked], [role="menuitemradio"][data-checked]',
  )

  root.style.setProperty("--indicator-left", `${checked?.offsetLeft ?? 0}px`)
  root.style.setProperty("--indicator-top", `${checked?.offsetTop ?? 0}px`)
  root.style.setProperty("--indicator-width", `${checked?.offsetWidth ?? 0}px`)
  root.style.setProperty("--indicator-height", `${checked?.offsetHeight ?? 0}px`)
  root.dataset.measured = ""
}

/**
 * Keeps a row's pill on its checked option: measures again when `value` changes and when the
 * row resizes, as a label that wraps, a font that loads, or an option added later moves the
 * checked one. The returned ref goes on the row.
 */
export function useSegmentedIndicator(value: unknown): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (ref.current) measure(ref.current)
  }, [value])

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new ResizeObserver(() => measure(root))
    observer.observe(root)

    return () => observer.disconnect()
  }, [])

  return ref
}
