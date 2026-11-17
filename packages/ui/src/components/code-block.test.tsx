import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

describe("CodeBlock", () => {
  test("takes focus only when it scrolls sideways", async () => {
    const { CodeBlock } = await import("./code-block")

    const view = await render(
      <>
        <CodeBlock>scrolls</CodeBlock>
        <CodeBlock wrap>wraps</CodeBlock>
      </>,
    )

    const [scrolls, wraps] = document.querySelectorAll("pre")
    expect(scrolls?.tabIndex).toBe(0)
    expect(wraps?.hasAttribute("tabindex")).toBe(false)

    await view.unmount()
  })
})
