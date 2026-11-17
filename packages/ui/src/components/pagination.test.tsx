import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("Pagination", () => {
  test("draws its page buttons as named squares", async () => {
    const { Pagination } = await import("./pagination")

    const view = await render(
      <Pagination page={2} pageCount={3} total={60} perPage={20} onPageChange={() => {}} />,
    )

    const buttons = [...document.querySelectorAll("button")]
    expect(buttons.map(button => button.getAttribute("aria-label"))).toEqual([
      "Previous page",
      "Next page",
    ])
    for (const button of buttons) expect(button.className).toContain("aspect-square")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })
})
