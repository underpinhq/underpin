import { describe, expect, spyOn, test } from "bun:test"
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

  test("a figure hidden at this width leaves the others at the size they fit", async () => {
    const { StatStrip, StatStripItem } = await import("./stat-strip")
    const proto = HTMLElement.prototype
    const saved = {
      offsetParent: Object.getOwnPropertyDescriptor(proto, "offsetParent"),
      clientWidth: Object.getOwnPropertyDescriptor(proto, "clientWidth"),
    }

    // A layout, which the test DOM has none of: every value line 100px wide, every figure
    // 150px wide, and the item marked hidden without a box at all, as `display: none` leaves it.
    Object.defineProperty(proto, "offsetParent", {
      configurable: true,
      get(this: HTMLElement) {
        return this.closest(".hidden-item") ? null : document.body
      },
    })
    Object.defineProperty(proto, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.matches("[data-value]") && !this.closest(".hidden-item") ? 100 : 0
      },
    })
    const rect = spyOn(proto, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const width = this.matches("[data-figure]") && !this.closest(".hidden-item") ? 150 : 0
      return { width } as DOMRect
    })

    try {
      for (const order of [
        ["shown", "hidden"],
        ["hidden", "shown"],
      ]) {
        const view = await render(
          <StatStrip>
            {order.map(kind => (
              <StatStripItem
                key={kind}
                label={kind}
                value="$30.6K"
                className={kind === "hidden" ? "hidden-item" : undefined}
              />
            ))}
          </StatStrip>,
        )

        const fit = document
          .querySelector<HTMLElement>("[data-row]")
          ?.style.getPropertyValue("--stat-fit")
        // 98px of room over 150px of figure, rounded down.
        expect(fit).toBe("0.65")
        await view.unmount()
      }

      // With every figure hidden there is nothing to fit, and the factor stays unset.
      const view = await render(
        <StatStrip>
          <StatStripItem label="hidden" value={12} className="hidden-item" />
        </StatStrip>,
      )
      expect(
        document.querySelector<HTMLElement>("[data-row]")?.style.getPropertyValue("--stat-fit"),
      ).toBe("")
      await view.unmount()
    } finally {
      // The test DOM has no `offsetParent` of its own, so the stub goes again.
      if (saved.offsetParent) Object.defineProperty(proto, "offsetParent", saved.offsetParent)
      else delete (proto as { offsetParent?: unknown }).offsetParent
      if (saved.clientWidth) Object.defineProperty(proto, "clientWidth", saved.clientWidth)
      rect.mockRestore()
    }
  })
})
