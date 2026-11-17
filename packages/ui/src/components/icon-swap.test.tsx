import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

/** The text of the marks a screen reader can reach. */
function listShownText() {
  return [...document.querySelectorAll('[aria-hidden="false"]')].map(mark => mark.textContent)
}

describe("IconSwap", () => {
  test("shows the mark `value` names out of a set", async () => {
    const { IconSwap } = await import("./icon-swap")
    const marks = { queued: "Q", running: "R", failed: "F" }

    const view = await render(<IconSwap value="running" marks={marks} />)
    expect(listShownText()).toEqual(["R"])
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)

    await view.rerender(<IconSwap value="failed" marks={marks} />)
    expect(listShownText()).toEqual(["F"])

    await view.unmount()
  })
})
