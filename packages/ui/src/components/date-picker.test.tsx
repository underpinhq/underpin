import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

/** Opens the picker's popover by its trigger and returns the Clear button, if it has one. */
async function openPicker() {
  const { act } = await import("react")

  await act(async () => document.querySelector("button")?.click())

  return [...document.querySelectorAll("button")].find(button => button.textContent === "Clear")
}

describe("DatePicker", () => {
  test("a clearable picker empties its value from the Clear button", async () => {
    const { act } = await import("react")
    const { DatePicker } = await import("./date-picker")
    const changes: string[] = []

    const view = await render(
      <DatePicker
        clearable
        value="2026-10-01"
        formatDay={day => day}
        onChange={value => changes.push(value)}
      />,
    )
    const clear = await openPicker()
    await act(async () => clear?.click())

    expect(changes).toEqual([""])

    await view.unmount()
  })

  test("a picker that is not clearable offers no Clear button", async () => {
    const { DatePicker } = await import("./date-picker")

    const view = await render(
      <DatePicker value="2026-10-01" formatDay={day => day} onChange={() => {}} />,
    )

    expect(await openPicker()).toBeUndefined()

    await view.unmount()
  })
})
