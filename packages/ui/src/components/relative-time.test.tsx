import { describe, expect, test } from "bun:test"
import type { ReactElement } from "react"
import { listAxeViolations, registerDom, render as renderTree } from "../test-dom"

registerDom()

const INSTANT = "2026-09-20T14:58:20.000Z"
const FULL_DATE = "September 20, 2026 at 2:58 PM"

const STAMPS = [
  { label: "UTC", date: "September 20, 2026", clock: "02:58:20 PM" },
  { label: "GMT+2", date: "September 20, 2026", clock: "04:58:20 PM" },
]

/** Mounts the element under the tooltip provider, which holds the one shared tooltip popup. */
async function render(element: ReactElement) {
  const { TooltipProvider } = await import("./tooltip")
  return renderTree(<TooltipProvider>{element}</TooltipProvider>)
}

function getTime() {
  const time = document.querySelector("time")
  if (!time) throw new Error("No time element")
  return time
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

/** The open tooltip's panel, which the positioner around it shares `data-side` with. */
function findPanel() {
  return document.querySelector("[data-side]:not(.tooltip-positioner)")
}

describe("RelativeTime", () => {
  test("prints the short reading in a time element that names the instant", async () => {
    const { RelativeTime } = await import("./relative-time")

    const view = await render(
      <RelativeTime date={INSTANT} tooltip={FULL_DATE} className="text-ink-muted">
        2 months ago
      </RelativeTime>,
    )

    const time = getTime()
    expect(time.textContent).toBe("2 months ago")
    expect(time.getAttribute("datetime")).toBe(INSTANT)
    expect(time.className).toContain("text-ink-muted")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("takes a Date as well as a string", async () => {
    const { RelativeTime } = await import("./relative-time")

    const view = await render(
      <RelativeTime date={new Date(INSTANT)} tooltip={FULL_DATE}>
        2 months ago
      </RelativeTime>,
    )

    expect(getTime().getAttribute("datetime")).toBe(INSTANT)

    await view.unmount()
  })

  test("opens one line on hover without stamps", async () => {
    const { RelativeTime } = await import("./relative-time")

    const view = await render(
      <RelativeTime date={INSTANT} tooltip={FULL_DATE}>
        2 months ago
      </RelativeTime>,
    )

    expect(findPanel()).toBeNull()
    await hover(getTime())

    expect(findPanel()?.textContent).toBe(FULL_DATE)
    expect(findPanel()?.className).not.toContain("max-w-sm")

    await view.unmount()
  })

  test("treats an empty list of stamps as none", async () => {
    const { RelativeTime } = await import("./relative-time")

    const view = await render(
      <RelativeTime date={INSTANT} tooltip={FULL_DATE} stamps={[]}>
        2 months ago
      </RelativeTime>,
    )

    await hover(getTime())

    expect(findPanel()?.className).not.toContain("max-w-sm")

    await view.unmount()
  })

  test("lists every clock under the line in a wider panel, on the right", async () => {
    const { RelativeTime } = await import("./relative-time")

    const view = await render(
      <RelativeTime date={INSTANT} tooltip="3 hours, 48 minutes ago" stamps={STAMPS}>
        14:58:20
      </RelativeTime>,
    )

    await hover(getTime())

    const panel = findPanel()
    expect(panel?.className).toContain("max-w-sm")
    expect(panel?.getAttribute("data-side")).toBe("right")
    expect(panel?.textContent).toContain("3 hours, 48 minutes ago")
    for (const stamp of STAMPS) {
      expect(panel?.textContent).toContain(stamp.label)
      expect(panel?.textContent).toContain(stamp.clock)
    }

    await view.unmount()
  })
})
