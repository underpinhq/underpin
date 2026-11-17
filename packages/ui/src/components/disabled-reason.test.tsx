import { describe, expect, mock, test } from "bun:test"
import type { ReactElement } from "react"
import { click, press, readDescription, registerDom, render as renderTree } from "../test-dom"

registerDom()

const REASON = "No changes to save."

/** Mounts the element under the tooltip provider, which holds the one shared tooltip popup. */
async function render(element: ReactElement) {
  const { TooltipProvider } = await import("./tooltip")
  return renderTree(<TooltipProvider>{element}</TooltipProvider>)
}

function getByText(role: string, text: string) {
  const element = [...document.querySelectorAll<HTMLElement>(`[role="${role}"], ${role}`)].find(
    candidate => candidate.textContent === text,
  )
  if (!element) throw new Error(`No ${role} reads "${text}"`)
  return element
}

/** The open tooltip that reads the reason, if any. */
function findTooltip() {
  return [...document.querySelectorAll("[data-side]")].find(
    element => element.textContent === REASON,
  )
}

describe("DisabledReason", () => {
  test("renders the control as it is without a reason", async () => {
    const { DisabledReason } = await import("./disabled-reason")
    const { Button } = await import("./button")

    const view = await render(
      <DisabledReason>
        <Button disabled>Save</Button>
      </DisabledReason>,
    )

    const button = getByText("button", "Save") as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.hasAttribute("aria-disabled")).toBe(false)
    expect(button.hasAttribute("aria-describedby")).toBe(false)

    await view.unmount()
  })

  test("keeps the control focusable, marked disabled and described by the reason", async () => {
    const { DisabledReason } = await import("./disabled-reason")
    const { Button } = await import("./button")

    const view = await render(
      <>
        <p id="hint">Saves the site.</p>
        <DisabledReason reason={REASON}>
          <Button disabled aria-describedby="hint">
            Save
          </Button>
        </DisabledReason>
      </>,
    )

    const button = getByText("button", "Save") as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(button.tabIndex).toBe(0)
    const { act } = await import("react")
    await act(async () => button.focus())
    expect(document.activeElement).toBe(button)
    expect(button.getAttribute("aria-disabled")).toBe("true")
    expect(readDescription(button)).toBe(`Saves the site. ${REASON}`)

    await view.unmount()
  })

  test("runs nothing on a click, Enter or Space, and submits no form", async () => {
    const { DisabledReason } = await import("./disabled-reason")
    const { Button } = await import("./button")
    const onClick = mock()
    const onSubmit = mock((event: SubmitEvent) => event.preventDefault())

    const view = await render(
      <form onSubmit={event => onSubmit(event.nativeEvent as SubmitEvent)}>
        <DisabledReason reason={REASON}>
          <Button type="submit" onClick={onClick}>
            Save
          </Button>
        </DisabledReason>
      </form>,
    )

    const button = getByText("button", "Save")
    await click(button)
    // A browser turns Enter and Space on a button into a click; happy-dom does not, so the
    // keys are pressed and the click they become is sent after them.
    await press(button, "Enter")
    await press(button, " ")
    await click(button)

    expect(onClick).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("opens the reason on a click, so a tap shows it too", async () => {
    const { DisabledReason } = await import("./disabled-reason")
    const { Button } = await import("./button")

    const view = await render(
      <DisabledReason reason={REASON}>
        <Button>Save</Button>
      </DisabledReason>,
    )

    expect(findTooltip()).toBeUndefined()
    await click(getByText("button", "Save"))
    expect(findTooltip()).toBeDefined()

    await view.unmount()
  })

  test("follows no link", async () => {
    const { DisabledReason } = await import("./disabled-reason")
    let followed = true

    const view = await render(
      <DisabledReason reason={REASON}>
        <a href="#next">Next</a>
      </DisabledReason>,
    )

    // Read once the click has bubbled past React's own listener on the root.
    function onClick(event: MouseEvent) {
      followed = !event.defaultPrevented
    }
    document.addEventListener("click", onClick)
    await click(getByText("a", "Next"))
    document.removeEventListener("click", onClick)
    expect(followed).toBe(false)

    await view.unmount()
  })

  test("opens no dialog, menu or select behind it", async () => {
    const { DisabledReason } = await import("./disabled-reason")
    const { Button } = await import("./button")
    const { Dialog, DialogContent, DialogTrigger } = await import("./dialog")
    const { Menu, MenuContent, MenuItem, MenuTrigger } = await import("./menu")
    const { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } =
      await import("./select")

    const view = await render(
      <>
        <Dialog>
          <DisabledReason reason={REASON}>
            <DialogTrigger render={<Button />}>Delete…</DialogTrigger>
          </DisabledReason>
          <DialogContent>Delete it?</DialogContent>
        </Dialog>

        <Menu>
          <DisabledReason reason={REASON}>
            <MenuTrigger render={<Button />}>Compare</MenuTrigger>
          </DisabledReason>
          <MenuContent>
            <MenuItem>Previous period</MenuItem>
          </MenuContent>
        </Menu>

        <Select items={{ admin: "Admin" }} value="admin">
          <DisabledReason reason={REASON}>
            <SelectTrigger aria-label="Role">
              <SelectValue />
            </SelectTrigger>
          </DisabledReason>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </>,
    )

    for (const trigger of [
      getByText("button", "Delete…"),
      getByText("button", "Compare"),
      document.querySelector<HTMLElement>('[aria-label="Role"]'),
    ]) {
      if (!trigger) throw new Error("No trigger")
      expect(trigger.getAttribute("aria-disabled")).toBe("true")
      await click(trigger)
      await press(trigger, "Enter")
      await press(trigger, "ArrowDown")
    }

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.querySelector('[role="listbox"]')).toBeNull()

    await view.unmount()
  })
})
