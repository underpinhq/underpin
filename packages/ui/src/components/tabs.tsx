"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { type ComponentProps, createContext, memo, use } from "react"
import { interactiveVariants } from "../lib/interactive"
import { type SegmentedStyle, segmentedVariants } from "../lib/segmented"
import { cn, variants, type VariantProps } from "../lib/variants"

/**
 * Tabs that switch a panel: each `TabsTrigger` shows its `TabsPanel`, and a screen reader
 * announces the pair. A row that picks a value and shows nothing of its own is a
 * `SegmentedControl`.
 */
const Tabs = TabsPrimitive.Root

/**
 * The content of one tab, rendered while its trigger is active and labelled by it. Give it the
 * `value` of its `TabsTrigger`.
 */
const TabsPanel = TabsPrimitive.Panel

// The parts below merge `className` outside the variants call, unlike everywhere else: Base UI
// types it as a function of the part's own state too, which `variants` cannot take.

type TabsVariant = SegmentedStyle["variant"] | "underline"

interface TabsStyle {
  variant: TabsVariant
  size: SegmentedStyle["size"]
}

const TabsVariantContext = createContext<TabsStyle>({
  variant: "segmented",
  size: "md",
})

/**
 * The view tabs above a table: a row of labels on a hairline, the chosen one in ink over a 2px
 * ink underline that slides to it. Each label may carry a `TabsCount`. The size does not apply:
 * every tab is 36px, so the row reads as part of the page rather than a control.
 */
const UNDERLINE_CLASSES = {
  root: "relative flex items-center gap-5 border-b",
  indicator: [
    "absolute bottom-0 left-0 h-0.5 bg-ink",
    "w-(--active-tab-width) translate-x-(--active-tab-left)",
    "transition-[translate,width] duration-200 ease-out-expo",
  ].join(" "),
  item: cn(
    interactiveVariants({ interactive: false }),
    "relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap font-medium text-control text-ink-secondary",
    "hover:text-ink data-active:text-ink",
  ),
}

/**
 * Sliding highlight that tracks the active tab via Base UI's --active-tab-* CSS variables.
 * Rendered automatically by TabsList, so every tab group shares one pill.
 */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  const { variant, size } = use(TabsVariantContext)

  return (
    <TabsPrimitive.Indicator
      className={cn(
        variant === "underline"
          ? UNDERLINE_CLASSES.indicator
          : [
              segmentedVariants({ variant, size }).indicator(),
              "h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top)",
            ],
        className,
      )}
      {...props}
    />
  )
}

type TabsListProps = TabsPrimitive.List.Props &
  Omit<VariantProps<typeof segmentedVariants>, "variant"> & {
    /** `underline` for the view tabs above a table. */
    variant?: TabsVariant
  }

function TabsList({
  className,
  children,
  variant = "segmented",
  size = "md",
  ...props
}: TabsListProps) {
  return (
    <TabsVariantContext value={{ variant, size }}>
      <TabsPrimitive.List
        className={cn(
          variant === "underline"
            ? UNDERLINE_CLASSES.root
            : segmentedVariants({ variant, size }).root(),
          className,
        )}
        {...props}
      >
        <TabsIndicator />
        {children}
      </TabsPrimitive.List>
    </TabsVariantContext>
  )
}

// Memoised: a tab row re-renders with its card, and its triggers rarely change with it.
const TabsTrigger = memo(function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const { variant, size } = use(TabsVariantContext)

  return (
    <TabsPrimitive.Tab
      className={cn(
        variant === "underline"
          ? UNDERLINE_CLASSES.item
          : [segmentedVariants({ variant, size }).item(), "data-active:text-ink"],
        "not-disabled:cursor-pointer disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
})

const tabsCountVariants = variants({
  base: "inline-flex h-4.5 items-center rounded-full px-1.5 font-medium text-2xs tabular-nums",

  variants: {
    tone: {
      muted: "bg-fill text-ink-muted",
      warning: "bg-warning-subtle text-warning-ink",
      danger: "bg-danger-subtle text-danger-ink",
    },
  },

  defaultVariants: {
    tone: "muted",
  },
})

type TabsCountProps = ComponentProps<"span"> & VariantProps<typeof tabsCountVariants>

/**
 * The row count after a view tab's label, formatted by the caller. `warning` or `danger` marks
 * a count that needs attention (Needs review 3, Reported 2).
 */
function TabsCount({ tone, className, ...props }: TabsCountProps) {
  return <span className={tabsCountVariants({ tone, className })} {...props} />
}

export { Tabs, TabsCount, TabsList, TabsPanel, TabsTrigger }
