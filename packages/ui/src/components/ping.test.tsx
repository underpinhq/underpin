import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("Ping", () => {
  test("is still and hidden from screen readers by default", async () => {
    const { Ping } = await import("./ping")

    const view = await render(<Ping tone="success" />)

    const dot = document.querySelector("span")
    expect(dot?.getAttribute("aria-hidden")).toBe("true")
    expect(document.querySelector(".animate-ping")).toBeNull()

    await view.unmount()
  })

  test("is an image named by its label, and glows when asked", async () => {
    const { Ping } = await import("./ping")

    const view = await render(<Ping tone="success" label="Visitors online" animate />)

    const dot = document.querySelector('[role="img"]')
    expect(dot?.getAttribute("aria-label")).toBe("Visitors online")
    expect(document.querySelector(".animate-ping")).not.toBeNull()
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })
})
