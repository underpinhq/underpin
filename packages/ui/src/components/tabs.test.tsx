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
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
    expect(tabs[0]?.className).toContain("h-9")
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
