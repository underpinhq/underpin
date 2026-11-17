import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

/** Whether either root element hides its overflow, which is how Base UI locks the page. */
function isPageLocked() {
  return [document.documentElement, document.body].some(
    element => element.style.overflowY === "hidden",
  )
}

describe("Popover", () => {
  test("leaves the page scrolling, and lets a mouse through its backdrop", async () => {
    const { Popover, PopoverContent, PopoverTrigger } = await import("./popover")

    const view = await render(
      <Popover open>
        <PopoverTrigger>Pick</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    )

    expect(isPageLocked()).toBe(false)
    expect(document.querySelector('[role="presentation"].pointer-events-none')).not.toBeNull()

    await view.unmount()
  })
})
