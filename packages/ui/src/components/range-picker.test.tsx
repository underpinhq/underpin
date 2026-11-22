import { describe, expect, test } from "bun:test"
import { click, listAxeViolations, press, readDescription, registerDom, render } from "../test-dom"

registerDom()

const PRESETS = [
  [
    { value: 7, label: "Last 7 days", shortcut: "W" },
    { value: 14, label: "Last 14 days", shortcut: "F" },
  ],
  [{ value: 30, label: "Last 30 days" }],
]

function getButton(name: string) {
  const button = document.querySelector<HTMLElement>(`button[aria-label="${name}"]`)
  if (!button) throw new Error(`No button is named "${name}"`)
  return button
}

describe("RangePicker", () => {
  test("checks the picked row and hands a clicked row's value back", async () => {
    const { RangePicker } = await import("./range-picker")
    const picked: number[] = []

    const view = await render(
      <RangePicker
        value={14}
        label="Last 14 days"
        presets={PRESETS}
        onChange={value => picked.push(value)}
      />,
    )

    const trigger = document.querySelector<HTMLElement>("button")
    expect(trigger?.textContent).toBe("Last 14 days")
    expect(await listAxeViolations()).toEqual([])
    await click(trigger as HTMLElement)

    const menu = document.querySelector('[role="menu"]')
    expect(menu?.getAttribute("aria-label")).toBe("Date range")
    expect(menu?.querySelectorAll('[role="menuitemradio"]')).toHaveLength(3)
    expect(menu?.querySelector('[aria-checked="true"]')?.textContent).toStartWith("Last 14 days")

    const row = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find(item =>
      item.textContent?.startsWith("Last 30 days"),
    )
    await click(row as HTMLElement)
    expect(picked).toEqual([30])

    await view.unmount()
  })

  test("picks a preset by its letter from anywhere on the page", async () => {
    const { RangePicker } = await import("./range-picker")
    const picked: number[] = []

    const view = await render(
      <RangePicker
        value={14}
        label="Last 14 days"
        presets={PRESETS}
        onChange={value => picked.push(value)}
      />,
    )

    await press(document.body, "w")
    expect(picked).toEqual([7])

    await view.unmount()
  })

  test("has no arrows without steps", async () => {
    const { RangePicker } = await import("./range-picker")

    const view = await render(
      <RangePicker value={7} label="Last 7 days" presets={PRESETS} onChange={() => {}} />,
    )

    expect(document.querySelectorAll("button")).toHaveLength(1)

    await view.unmount()
  })

  test("steps on a click and an arrow key, and says why a step at a bound is off", async () => {
    const { RangePicker } = await import("./range-picker")
    const steps: string[] = []

    const view = await render(
      <RangePicker
        value={undefined}
        label="November 2026"
        presets={PRESETS}
        previous={{
          label: "Earlier period",
          target: "October 2026",
          onStep: () => steps.push("previous"),
        }}
        next={{
          label: "Later period",
          disabledReason: "This period already reaches today.",
          onStep: () => steps.push("next"),
        }}
        onChange={() => {}}
      />,
    )

    await click(getButton("Earlier period"))
    await press(document.body, "ArrowLeft")
    await press(document.body, "ArrowRight")
    expect(steps).toEqual(["previous", "previous"])

    const later = getButton("Later period")
    expect(later.hasAttribute("disabled") || later.getAttribute("aria-disabled") === "true").toBe(
      true,
    )
    expect(readDescription(later)).toBe("This period already reaches today.")

    await view.unmount()
  })

  test("reads the picked row's label without one, and clicks of the picked row still count", async () => {
    const { RangePicker } = await import("./range-picker")
    const picked: number[] = []

    const view = await render(
      <RangePicker value={14} presets={PRESETS} onChange={value => picked.push(value)} />,
    )

    const trigger = document.querySelector<HTMLElement>("button")
    expect(trigger?.textContent).toBe("Last 14 days")
    await click(trigger as HTMLElement)

    const row = document.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')
    expect(row?.textContent).toStartWith("Last 14 days")
    await click(row as HTMLElement)
    expect(picked).toEqual([14])

    await view.unmount()
  })

  test("checks no row while the range is one no row names", async () => {
    const { RangePicker } = await import("./range-picker")

    const view = await render(
      <RangePicker
        value={undefined}
        label="Nov 2 – 9, 2026"
        presets={PRESETS}
        onChange={() => {}}
      />,
    )

    await click(document.querySelector<HTMLElement>("button") as HTMLElement)
    expect(document.querySelectorAll('[role="menuitemradio"]')).toHaveLength(3)
    expect(document.querySelector('[role="menuitemradio"][aria-checked="true"]')).toBeNull()

    await view.unmount()
  })
})
