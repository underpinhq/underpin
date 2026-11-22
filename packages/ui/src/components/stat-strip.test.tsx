import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

/** The text an id list points at, as a screen reader takes it: hidden parts left out. */
function readReferencedText(ids: string | null | undefined) {
  return (ids ?? "")
    .split(" ")
    .map(id => {
      const copy = document.getElementById(id)?.cloneNode(true) as HTMLElement | undefined
      copy?.querySelectorAll("[aria-hidden]").forEach(hidden => hidden.remove())
      return copy?.textContent
    })
    .join(" ")
}

describe("StatStripItem", () => {
  test("a selectable item is a toggle named by its label and figure", async () => {
    const { act } = await import("react")
    const { StatStrip, StatStripItem } = await import("./stat-strip")
    let selects = 0

    const view = await render(
      <StatStrip>
        <StatStripItem
          label="Rev/visitor"
          name="Revenue per visitor"
          value="$0.12"
          trend="+4%"
          hint="vs $0.11"
          selected
          onSelect={() => selects++}
        />
      </StatStrip>,
    )

    const button = document.querySelector("button")
    expect(button?.getAttribute("aria-pressed")).toBe("true")
    expect(readReferencedText(button?.getAttribute("aria-labelledby"))).toBe(
      "Revenue per visitor $0.12",
    )
    expect(readReferencedText(button?.getAttribute("aria-describedby"))).toBe("+4% vs $0.11")
    expect(await listAxeViolations()).toEqual([])

    await act(async () => button?.click())
    expect(selects).toBe(1)

    await view.unmount()
  })

  test("a loading item draws a skeleton for its figure and leaves its trend out", async () => {
    const { StatStrip, StatStripItem } = await import("./stat-strip")

    const view = await render(
      <StatStrip>
        <StatStripItem label="Visitors" value={1234} trend="+4%" hint="Last 7 days" loading />
      </StatStrip>,
    )

    const figure = document.querySelector("[data-figure]")
    expect(figure?.textContent).toBe("")
    expect(figure?.querySelector(".animate-pulse")).not.toBeNull()
    expect(document.body.textContent).not.toContain("+4%")
    expect(document.body.textContent).toContain("Last 7 days")

    await view.unmount()
  })
})
