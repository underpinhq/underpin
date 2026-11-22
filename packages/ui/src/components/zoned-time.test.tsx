import { describe, expect, test } from "bun:test"
import type { ReactElement } from "react"
import { registerDom, render as renderTree } from "../test-dom"

registerDom()

const INSTANT = "2026-09-20T14:58:20.000Z"

/** Mounts the element under the tooltip provider, which holds the one shared tooltip popup. */
async function render(element: ReactElement) {
  const { TooltipProvider } = await import("./tooltip")
  return renderTree(<TooltipProvider>{element}</TooltipProvider>)
}

/** Moves the pointer onto the element, then waits out the tooltip's delay. */
async function hover(element: Element) {
  const { act } = await import("react")

  await act(async () => {
    for (const type of ["pointerenter", "mouseenter", "pointermove", "mousemove"]) {
      element.dispatchEvent(new MouseEvent(type, { bubbles: type.endsWith("move") }))
    }
    await new Promise(resolve => setTimeout(resolve, 700))
  })
}

describe("ZonedTime", () => {
  test("hovers with how long ago and the instant on every clock", async () => {
    const { ZonedTime } = await import("./zoned-time")

    const view = await render(
      <ZonedTime date={INSTANT} timeZone="Asia/Kolkata" locale="en-US" hourCycle="h12">
        14:58:20
      </ZonedTime>,
    )

    const time = document.querySelector("time")
    expect(time?.textContent).toBe("14:58:20")
    if (!time) throw new Error("No time element")
    await hover(time)

    const panel = document.querySelector("[data-side]:not(.tooltip-positioner)")
    expect(panel?.textContent).toMatch(/ago/)
    expect(panel?.textContent).toContain("UTC")
    expect(panel?.textContent).toContain("02:58:20 PM")
    expect(panel?.textContent).toContain("GMT+5:30")
    expect(panel?.textContent).toContain("08:28:20 PM")

    await view.unmount()
  })

  test("reads how long ago on the page when given no children", async () => {
    const { ZonedTime } = await import("./zoned-time")

    const view = await render(
      <ZonedTime date={new Date(Date.now() - 3 * 3_600_000)} locale="en-US" />,
    )
    expect(document.querySelector("time")?.textContent).toBe("3 hours ago")

    await view.unmount()
  })

  test("lists its clocks in the cycle it is given", async () => {
    const { ZonedTime } = await import("./zoned-time")

    const view = await render(
      <ZonedTime date={INSTANT} timeZone="Asia/Kolkata" locale="en-US" hourCycle="h23">
        14:58:20
      </ZonedTime>,
    )

    const time = document.querySelector("time")
    if (!time) throw new Error("No time element")
    await hover(time)

    const panel = document.querySelector("[data-side]:not(.tooltip-positioner)")
    expect(panel?.textContent).toContain("14:58:20")
    expect(panel?.textContent).toContain("20:28:20")
    expect(panel?.textContent).not.toContain("PM")

    await view.unmount()
  })
})
