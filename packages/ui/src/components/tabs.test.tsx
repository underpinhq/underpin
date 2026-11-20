import { describe, expect, test } from "bun:test"
import { click, listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("Tabs", () => {
  test("draws the underline variant as view tabs with counts", async () => {
    const { Tabs, TabsCount, TabsList, TabsPanel, TabsTrigger } = await import("./tabs")

    const view = await render(
      <Tabs defaultValue="all">
        <TabsList variant="underline" aria-label="Views">
          <TabsTrigger value="all">
            All <TabsCount>1,204</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="review">
            Needs review <TabsCount tone="warning">3</TabsCount>
          </TabsTrigger>
        </TabsList>
        <TabsPanel value="all">Every tool</TabsPanel>
        <TabsPanel value="review">Tools to review</TabsPanel>
      </Tabs>,
    )

    const list = document.querySelector('[role="tablist"]')
    expect(list?.className).toContain("border-b")
    // A row wider than a phone scrolls rather than wrapping or squeezing its labels.
    expect(list?.className).toContain("overflow-x-auto")
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
    expect(tabs[0]?.className).toContain("h-9")
    expect(tabs[0]?.className).toContain("shrink-0")
    expect(tabs[0]?.className).toContain("data-active:text-ink")
    expect(tabs[1]?.querySelector("span")?.className).toContain("bg-warning-subtle")
    // The indicator is the 2px ink underline, not the segmented pill.
    const indicator = list?.querySelector(":scope > span")
    expect(indicator?.className).toContain("h-0.5")
    expect(indicator?.className).toContain("bg-ink")

    const second = tabs[1]
    if (!second) throw new Error("No second tab")
    await click(second)
    expect(second.getAttribute("aria-selected")).toBe("true")
    expect(document.body.textContent).toContain("Tools to review")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("opens a scrolling row with its active tab in view", async () => {
    const { Tabs, TabsList, TabsTrigger } = await import("./tabs")
    // happy-dom lays nothing out: each tab is 80px wide, one after another, in a 100px row.
    const sizes = {
      offsetLeft(this: HTMLElement) {
        return [...(this.parentElement?.children ?? [])].indexOf(this) * 80
      },
      offsetWidth: () => 80,
      clientWidth: () => 100,
    }
    const originals = Object.keys(sizes).map(
      key => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)] as const,
    )
    for (const [key, get] of Object.entries(sizes)) {
      Object.defineProperty(HTMLElement.prototype, key, { get, configurable: true })
    }

    const view = await render(
      <Tabs defaultValue="lapsed">
        <TabsList variant="underline" aria-label="Views">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="trial">Trial</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="lapsed">Lapsed</TabsTrigger>
        </TabsList>
      </Tabs>,
    )

    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor)
      else Reflect.deleteProperty(HTMLElement.prototype, key)
    }

    const list = document.querySelector<HTMLElement>('[role="tablist"]')
    expect(list?.className).toContain("py-px")
    // The indicator is the list's first child, so Lapsed is the fifth: it ends at 400px.
    expect(list?.scrollLeft).toBe(300)
    await view.unmount()
  })

  test("keeps the segmented pill by default", async () => {
    const { Tabs, TabsList, TabsTrigger } = await import("./tabs")

    const view = await render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Kind">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    expect(document.querySelector('[role="tablist"]')?.className).toContain("bg-well")

    await view.unmount()
  })
})
