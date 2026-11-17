import { describe, expect, mock, test } from "bun:test"
import { useState } from "react"
import {
  click,
  DESKTOP_WIDTH,
  PHONE_WIDTH,
  press,
  readDescription,
  registerDom,
  render,
  resize,
} from "../test-dom"

registerDom()

const REASON = "Owners can’t be removed."

/** A row by its label. A dialog trigger rendered as a row takes the role of a button. */
function getItem(text: string) {
  const rows = document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="button"]')
  const item = [...rows].find(element => element.textContent?.startsWith(text))
  if (!item) throw new Error(`No menu item reads "${text}"`)
  return item
}

async function createMenu(open: boolean) {
  const { Menu, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuTrigger } =
    await import("./menu")

  return (
    <Menu open={open}>
      <MenuTrigger>Range</MenuTrigger>
      <MenuContent label="Date range">
        <MenuRadioGroup value="7d">
          <MenuRadioItem value="today">Today</MenuRadioItem>
          <MenuRadioItem value="7d">Last 7 days</MenuRadioItem>
        </MenuRadioGroup>
        <MenuItem>Edit…</MenuItem>
      </MenuContent>
    </Menu>
  )
}

function getPopup() {
  const popup = document.querySelector<HTMLElement>('[role="menu"]')
  if (!popup) throw new Error("No menu is open")
  return popup
}

/** A bottom sheet would pin the positioner to the bottom edge instead of to the trigger. */
function isSheet(popup: HTMLElement) {
  return popup.parentElement?.style.bottom === "0px"
}

describe("Menu", () => {
  test("hangs off its trigger at every width, with every kind of row", async () => {
    for (const width of [PHONE_WIDTH, DESKTOP_WIDTH]) {
      await resize(width)
      const view = await render(await createMenu(true))
      const popup = getPopup()

      expect(isSheet(popup)).toBe(false)
      expect(popup.getAttribute("aria-label")).toBe("Date range")
      expect(popup.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2)
      expect(popup.querySelector('[aria-checked="true"]')?.textContent).toBe("Last 7 days")
      expect(popup.querySelector('[role="menuitem"]')?.textContent).toBe("Edit…")

      await view.unmount()
    }
  })

  test("keeps its rows when the viewport crosses `sm` while open", async () => {
    await resize(DESKTOP_WIDTH)
    const view = await render(await createMenu(true))
    const popup = getPopup()

    await resize(PHONE_WIDTH)

    expect(getPopup()).toBe(popup)
    expect(isSheet(popup)).toBe(false)

    await view.unmount()
  })
})

describe("MenuItem with a disabledReason", () => {
  test("is reached with the arrow keys, described by its reason, and never runs", async () => {
    const { Menu, MenuContent, MenuItem, MenuTrigger } = await import("./menu")
    const { TooltipProvider } = await import("./tooltip")
    const onRemove = mock()
    const onPointerUp = mock()

    await resize(DESKTOP_WIDTH)
    const view = await render(
      <TooltipProvider>
        <p id="remove-hint">Takes their access away.</p>
        <Menu open>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <MenuItem>Copy email</MenuItem>
            <MenuItem
              aria-describedby="remove-hint"
              disabledReason={REASON}
              onClick={onRemove}
              onPointerUp={onPointerUp}
            >
              Remove…
            </MenuItem>
          </MenuContent>
        </Menu>
      </TooltipProvider>,
    )

    const { act } = await import("react")
    const first = getItem("Copy email")
    await act(async () => first.focus())
    await press(first, "ArrowDown")

    const item = getItem("Remove…")
    expect(document.activeElement).toBe(item)
    expect(item.getAttribute("aria-disabled")).toBe("true")
    expect(readDescription(item)).toBe(`Takes their access away. ${REASON}`)

    await press(item, "Enter")
    await press(item, " ")
    await click(item)
    expect(onRemove).not.toHaveBeenCalled()
    expect(onPointerUp).toHaveBeenCalled()

    await view.unmount()
  })

  test("opens no confirmation behind it", async () => {
    const { Menu, MenuContent, MenuItem, MenuTrigger } = await import("./menu")
    const { Dialog, DialogContent, DialogTrigger } = await import("./dialog")
    const { TooltipProvider } = await import("./tooltip")

    /** A confirmation opened from a row's click, and one the row itself triggers. */
    function Actions() {
      const [confirming, setConfirming] = useState(false)

      return (
        <>
          <Menu open>
            <MenuTrigger>Actions</MenuTrigger>
            <MenuContent>
              <MenuItem disabledReason={REASON} onClick={() => setConfirming(true)}>
                Remove…
              </MenuItem>
              <Dialog>
                <DialogTrigger
                  nativeButton={false}
                  render={<MenuItem disabledReason={REASON} closeOnClick={false} />}
                >
                  Delete…
                </DialogTrigger>
                <DialogContent>Delete it?</DialogContent>
              </Dialog>
            </MenuContent>
          </Menu>

          <Dialog open={confirming} onOpenChange={setConfirming}>
            <DialogContent>Remove them?</DialogContent>
          </Dialog>
        </>
      )
    }

    await resize(DESKTOP_WIDTH)
    const view = await render(
      <TooltipProvider>
        <Actions />
      </TooltipProvider>,
    )

    for (const text of ["Remove…", "Delete…"]) {
      const item = getItem(text)
      await click(item)
      await press(item, "Enter")
    }
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await view.unmount()
  })
})
