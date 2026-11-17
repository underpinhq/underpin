import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

describe("Textarea", () => {
  test("styles `bordered` rather than passing it to the element", async () => {
    const { Textarea } = await import("./textarea")

    const view = await render(<Textarea aria-label="Note" bordered={false} />)

    expect(document.querySelector("textarea")?.hasAttribute("bordered")).toBe(false)

    await view.unmount()
  })
})
