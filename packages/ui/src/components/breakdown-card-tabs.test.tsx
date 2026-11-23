import { describe, expect, test } from "bun:test"
import { click, listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

interface CardProps {
  value: string
}

const OPTIONS = [
  { value: "browser", label: "Browser" },
  { value: "os", label: "OS" },
] as const

describe("BreakdownCardTabs", () => {
  test("names the card body as the panel its active tab switches", async () => {
    const { BreakdownCard } = await import("./breakdown-card")
    const { BreakdownCardTabs, BreakdownPanelContext, useBreakdownPanel } =
      await import("./breakdown-card-tabs")
    const changes: string[] = []

    function Card({ value }: CardProps) {
      const panel = useBreakdownPanel()

      return (
        <BreakdownPanelContext value={panel.id}>
          <BreakdownCard
            title="Devices"
            actions={
              <BreakdownCardTabs
                aria-label="Devices"
                options={OPTIONS}
                value={value}
                onChange={next => changes.push(next)}
              />
            }
          >
            <div {...panel.props}>Rows for {value}</div>
          </BreakdownCard>
        </BreakdownPanelContext>
      )
    }

    const view = await render(<Card value="browser" />)

    const [browser, os] = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
    const panel = document.querySelector('[role="tabpanel"]')
    expect(browser?.getAttribute("aria-controls")).toBe(panel?.id ?? "")
    expect(os?.getAttribute("aria-controls")).toBe(panel?.id ?? "")
    // Only the active tab carries the id the panel is labelled by.
    expect(panel?.getAttribute("aria-labelledby")).toBe(browser?.id ?? "")
    expect(os?.id).not.toBe(browser?.id ?? "")
    expect(document.querySelector('[role="tablist"]')?.className).toContain("justify-end")
    expect(document.querySelector('[role="tablist"]')?.getAttribute("aria-label")).toBe("Devices")
    expect(await listAxeViolations()).toEqual([])

    if (!os) throw new Error("No second tab")
    await click(os)
    expect(changes).toEqual(["os"])

    await view.unmount()
  })

  test("leaves a tab passed as children to act on its own", async () => {
    const { BreakdownCardTabs } = await import("./breakdown-card-tabs")
    const { TabsTrigger } = await import("./tabs")
    const changes: string[] = []

    const view = await render(
      <BreakdownCardTabs options={OPTIONS} value="browser" onChange={next => changes.push(next)}>
        <TabsTrigger value="more">More</TabsTrigger>
      </BreakdownCardTabs>,
    )

    const more = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].at(-1)
    if (!more) throw new Error("No extra tab")
    await click(more)
    expect(changes).toEqual([])

    await view.unmount()
  })
})
