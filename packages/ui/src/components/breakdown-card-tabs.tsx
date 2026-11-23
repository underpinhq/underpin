"use client"

import { type ComponentProps, createContext, type ReactNode, use, useId } from "react"
import { cn } from "../lib/variants"
import { Tabs, TabsList, TabsTrigger } from "./tabs"

/**
 * The id of the region a card's tab row switches. The `Tabs` root wraps only the row, so its own
 * panels cannot reach the card body; the row names the body through this instead: every tab
 * controls it, and the active tab alone carries the id the body is labelled by.
 */
export const BreakdownPanelContext = createContext<string | undefined>(undefined)

function toActiveTabId(panelId: string) {
  return `${panelId}-tab`
}

/**
 * An id for the region a tab row switches, and the props that make that region its panel. Pass
 * the id to `BreakdownPanelContext` around the card, and spread the props on the body.
 */
export function useBreakdownPanel() {
  const id = useId()

  return { id, props: { id, role: "tabpanel", "aria-labelledby": toActiveTabId(id) } as const }
}

/**
 * The props that tie a tab inside `BreakdownPanelContext` to the panel it switches, for a tab
 * that is not a `BreakdownCardTab` (a trigger that opens a menu of further views).
 */
export function useBreakdownTabProps(selected: boolean) {
  const panelId = use(BreakdownPanelContext)

  return {
    id: panelId && selected ? toActiveTabId(panelId) : undefined,
    "aria-controls": panelId,
  }
}

interface BreakdownCardTabProps extends ComponentProps<typeof TabsTrigger> {
  /** Whether this is the active tab, which names the panel. */
  selected: boolean
}

/** A tab in a `BreakdownCardTabs` row, tied to the panel it switches. */
export function BreakdownCardTab({ selected, ...props }: BreakdownCardTabProps) {
  return <TabsTrigger {...useBreakdownTabProps(selected)} {...props} />
}

interface BreakdownCardTabsProps<T extends string> {
  /**
   * Names the tab row for a screen reader, usually the card's title, so a page of cards does not
   * read out a run of unnamed tab lists.
   */
  "aria-label"?: string
  options: readonly { value: T; label: string }[]
  /** The active tab: one of the options, or the value of a tab passed as `children`. */
  value: T | (string & {})
  onChange: (value: T) => void
  /** Tabs after the options that are not plain views, such as a tab that opens a menu. */
  children?: ReactNode
  /**
   * Scroll the row sideways on a phone instead of wrapping it, for a row whose last tab opens a
   * menu that would otherwise hang off a second line.
   */
  scroll?: boolean
}

/**
 * The view switcher in a `BreakdownCard` header, passed as its `actions`: a small borderless tab
 * row that wraps when the card is narrow. Its rows end at the card's right edge, so the row
 * nearest the title never trails off into the gap the wrap leaves. Inside
 * `BreakdownPanelContext` each tab names the card body as the panel it switches.
 */
export function BreakdownCardTabs<T extends string>({
  options,
  value,
  onChange,
  children,
  scroll,
  "aria-label": label,
}: BreakdownCardTabsProps<T>) {
  return (
    <Tabs
      value={value}
      // A tab passed as `children` changes nothing by being clicked; it acts on its own.
      onValueChange={next => {
        const option = options.find(item => item.value === next)
        if (option) onChange(option.value)
      }}
      className={cn(scroll && "min-w-0")}
    >
      {/* The last pill's padding hangs past the inset, so its label ends where the figures do.
          A scrolling row clips its tabs, so it pads 1px all round, and its margins give the
          pixel back: a focused tab's outline reaches 1px past the tab. */}
      <TabsList
        aria-label={label}
        variant="plain"
        size="sm"
        className={cn(
          "-mr-2 flex-wrap justify-end",
          scroll &&
            "max-sm:-my-px max-sm:-ml-px max-sm:-mr-[calc(--spacing(2)+1px)] max-sm:max-w-[calc(100%+--spacing(2)+2px)] max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto max-sm:p-px max-sm:[scrollbar-width:none]",
        )}
      >
        {options.map(option => (
          <BreakdownCardTab
            key={option.value}
            value={option.value}
            selected={option.value === value}
          >
            {option.label}
          </BreakdownCardTab>
        ))}
        {children}
      </TabsList>
    </Tabs>
  )
}
