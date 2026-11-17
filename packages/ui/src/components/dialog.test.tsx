import { describe, expect, test } from "bun:test"
import { DESKTOP_WIDTH, PHONE_WIDTH, registerDom, render, resize } from "../test-dom"

registerDom()

async function createDialog(open: boolean) {
  const { Dialog, DialogBody, DialogContent, DialogHeader } = await import("./dialog")

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogBody>
          <DialogHeader title="New goal" />
          <input aria-label="Name" />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function getPopup() {
  const popup = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!popup) throw new Error("No dialog is open")
  return popup
}

/** The sheet is a Base UI drawer popup, which names the direction it swipes away in. */
function isSheet(popup: HTMLElement) {
  return popup.hasAttribute("data-swipe-direction")
}

describe("Dialog", () => {
  test("keeps its shape and its form when the viewport crosses `sm` while open", async () => {
    for (const [from, to] of [
      [DESKTOP_WIDTH, PHONE_WIDTH],
      [PHONE_WIDTH, DESKTOP_WIDTH],
    ] as const) {
      await resize(from)
      const view = await render(await createDialog(true))

      const field = getPopup().querySelector("input")
      if (!field) throw new Error("No field")
      field.value = "Signups"
      const sheet = isSheet(getPopup())
      expect(sheet).toBe(from === PHONE_WIDTH)

      await resize(to)

      expect(getPopup().querySelector("input")).toBe(field)
      expect(field.value).toBe("Signups")
      expect(isSheet(getPopup())).toBe(sheet)

      await view.unmount()
    }
  })

  test("takes the shape of the viewport it opens in", async () => {
    await resize(DESKTOP_WIDTH)
    const view = await render(await createDialog(true))
    expect(isSheet(getPopup())).toBe(false)

    await view.rerender(await createDialog(false))
    await resize(PHONE_WIDTH)
    await view.rerender(await createDialog(true))
    expect(isSheet(getPopup())).toBe(true)

    await view.unmount()
  })
})
