"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { createContext, memo, use } from "react"
import { type SegmentedStyle, segmentedVariants } from "../lib/segmented"
import { cn, type VariantProps } from "../lib/variants"

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

const TabsVariantContext = createContext<SegmentedStyle>({
  variant: "segmented",
  size: "md",
})

/**
 * Sliding highlight that tracks the active tab via Base UI's --active-tab-* CSS variables.
 * Rendered automatically by TabsList, so every tab group shares one pill.
 */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  const { variant, size } = use(TabsVariantContext)

  return (
    <TabsPrimitive.Indicator
      className={cn(
        segmentedVariants({ variant, size }).indicator(),
        "h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top)",
        className,
      )}
      {...props}
    />
  )
}

type TabsListProps = TabsPrimitive.List.Props & VariantProps<typeof segmentedVariants>

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
        className={cn(segmentedVariants({ variant, size }).root(), className)}
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
        segmentedVariants({ variant, size }).item(),
        "not-disabled:cursor-pointer disabled:opacity-50 data-active:text-ink",
        className,
      )}
      {...props}
    />
  )
})

export { Tabs, TabsList, TabsPanel, TabsTrigger }
