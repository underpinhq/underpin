import { describe, expect, mock, test } from "bun:test"
import { click, listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("BulkActionBar", () => {
  test("shows the selection and its actions, and clears it", async () => {
    const { BulkActionBar } = await import("./bulk-action-bar")
    const onClear = mock(() => {})

    const view = await render(
      <BulkActionBar count={2} onClear={onClear}>
        <button type="button">Approve</button>
        <button type="button">Delete</button>
      </BulkActionBar>,
    )

    const bar = document.querySelector("section")
    expect(bar?.className).toContain("fixed")
    expect(bar?.textContent).toBe("2 selectedApproveDelete")
    expect(document.querySelector("[aria-live]")?.textContent).toBe("2 selected")
    const clear = document.querySelector<HTMLElement>('button[aria-label="Clear selection"]')
    if (!clear) throw new Error("No clear button")
    await click(clear)
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(await listAxeViolations()).toEqual([])

    await view.rerender(
      <BulkActionBar count={0} onClear={onClear}>
        <button type="button">Approve</button>
      </BulkActionBar>,
    )
    expect(document.querySelector("section")).toBeNull()
    // The live region stays, empty, so the next selection is announced.
    expect(document.querySelector("[aria-live]")?.textContent).toBe("")

    await view.unmount()
  })
})
