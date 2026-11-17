import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

describe("CopyButton", () => {
  test("says the copy failed when the browser refuses it", async () => {
    const { act } = await import("react")
    const { CopyButton } = await import("./copy-button")
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard")
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Denied")) },
    })
    let errors = 0

    const view = await render(
      <CopyButton value="secret" label="Copy key" onCopyError={() => errors++} />,
    )
    await act(async () => document.querySelector("button")?.click())

    expect(document.querySelector("output")?.textContent).toBe("Copy failed")
    expect(document.querySelector('button [aria-hidden="false"]:not(:has(svg))')?.textContent).toBe(
      "Copy failed",
    )
    expect(errors).toBe(1)

    await view.unmount()
    if (original) Object.defineProperty(navigator, "clipboard", original)
    else Reflect.deleteProperty(navigator, "clipboard")
  })
})
