import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

type Interval = "monthly" | "yearly"

async function createControl(value: Interval, onValueChange: (value: Interval) => void) {
  const { SegmentedControl, SegmentedControlItem } = await import("./segmented-control")

  return (
    <SegmentedControl value={value} aria-label="Billing" onValueChange={onValueChange}>
      <SegmentedControlItem value="monthly">Monthly</SegmentedControlItem>
      <SegmentedControlItem value="yearly">Yearly</SegmentedControlItem>
    </SegmentedControl>
  )
}

function getRadios() {
  return [...document.querySelectorAll<HTMLElement>('[role="radio"]')]
}

async function pressKey(target: HTMLElement, key: string) {
  const { act } = await import("react")

  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  })
}

describe("SegmentedControl", () => {
  test("renders a labelled radio group with one checked radio per option", async () => {
    const view = await render(await createControl("yearly", () => {}))

    const group = document.querySelector('[role="radiogroup"]')
    expect(group?.getAttribute("aria-label")).toBe("Billing")
    expect(getRadios().map(radio => radio.textContent)).toEqual(["Monthly", "Yearly"])
    expect(getRadios().map(radio => radio.getAttribute("aria-checked"))).toEqual(["false", "true"])
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("moves the selection with the arrow keys and reports the typed value", async () => {
    const changes: Interval[] = []
    let value: Interval = "monthly"
    const view = await render(await createControl(value, next => changes.push(next)))

    const [monthly] = getRadios()
    monthly?.focus()
    if (monthly) await pressKey(monthly, "ArrowRight")

    expect(changes).toEqual(["yearly"])
    value = changes[0] ?? value
    await view.rerender(await createControl(value, next => changes.push(next)))

    expect(getRadios().map(radio => radio.getAttribute("aria-checked"))).toEqual(["false", "true"])
    expect(document.activeElement?.textContent).toBe("Yearly")

    await view.unmount()
  })

  test("calls onValueChange with the clicked option's value", async () => {
    const { act } = await import("react")
    const changes: Interval[] = []
    const view = await render(await createControl("monthly", next => changes.push(next)))

    await act(async () => getRadios()[1]?.click())

    expect(changes).toEqual(["yearly"])

    await view.unmount()
  })

  test("marks itself measured once the pill has the checked option's box", async () => {
    const view = await render(await createControl("monthly", () => {}))

    const group = document.querySelector<HTMLElement>('[role="radiogroup"]')
    expect(group?.hasAttribute("data-measured")).toBe(true)
    expect(group?.style.getPropertyValue("--indicator-width")).toMatch(/px$/)

    await view.unmount()
  })

  test("draws an option named by aria-label and showing one element as a square", async () => {
    const { SegmentedControl, SegmentedControlItem } = await import("./segmented-control")
    const view = await render(
      <SegmentedControl defaultValue="grid" aria-label="Layout" size="xs">
        <SegmentedControlItem value="grid" aria-label="Grid">
          <svg aria-hidden />
        </SegmentedControlItem>
        <SegmentedControlItem value="list">List</SegmentedControlItem>
      </SegmentedControl>,
    )

    const [icon, label] = getRadios()
    expect(icon?.className).toContain("aspect-square")
    expect(icon?.className).toContain("[&_svg]:size-3")
    expect(icon?.className).not.toContain("[&_svg]:size-3.5")
    expect(label?.className).not.toContain("aspect-square")

    await view.unmount()
  })
})
