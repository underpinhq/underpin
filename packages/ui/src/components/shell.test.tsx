import { beforeEach, describe, expect, test } from "bun:test"
import type { ReactNode } from "react"
import { click, PHONE_WIDTH, registerDom, render, resize } from "../test-dom"

registerDom()

// The drawer exists only under `lg`, so every test starts on a phone.
beforeEach(async () => {
  await resize(PHONE_WIDTH)
})

interface ShellOptions {
  navigationKey?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Rendered in a portal on `document.body`, as a menu's popup is. */
  portal?: ReactNode
}

async function renderShellElement({
  navigationKey,
  open,
  onOpenChange,
  portal,
}: ShellOptions = {}) {
  const { createPortal } = await import("react-dom")
  const { Shell, RailBottom, RailTop } = await import("./shell")
  const { Nav, NavLink } = await import("./nav")

  return (
    <Shell
      top={
        <RailTop aria-label="Current workspace">
          <button type="button">Acme</button>
        </RailTop>
      }
      nav={
        <Nav aria-label="Workspace">
          <NavLink href="#links">Links</NavLink>
          <NavLink href="#tags" target="_blank">
            Tags
          </NavLink>
          <NavLink href="#stats" target="stats">
            Stats
          </NavLink>
          <NavLink href="#export.csv" download>
            Export
          </NavLink>
          {portal && createPortal(portal, document.body)}
        </Nav>
      }
      footer={
        <RailBottom aria-label="Account">
          <a href="#profile">Profile</a>
        </RailBottom>
      }
      header={<span>Acme</span>}
      navigationKey={navigationKey}
      open={open}
      onOpenChange={onOpenChange}
    >
      <h1>Links</h1>
    </Shell>
  )
}

function findToggle() {
  const toggle = document.querySelector<HTMLButtonElement>('button[aria-label$="the menu"]')
  if (!toggle) throw new Error("No drawer toggle")
  return toggle
}

function isDrawerOpen() {
  return findToggle().getAttribute("aria-expanded") === "true"
}

/** A link with this text outside the rail, so the drawer's copy of it, or a portalled one. */
function findDrawerLink(text: string) {
  const link = [...document.querySelectorAll("a")].find(
    element => element.textContent === text && !element.closest("aside"),
  )
  if (!link) throw new Error(`No link "${text}" outside the rail`)
  return link
}

async function openDrawer() {
  await click(findToggle())
  expect(isDrawerOpen()).toBe(true)
}

async function modifiedClick(element: HTMLElement) {
  const { act } = await import("react")

  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true }),
    )
  })
}

describe("Shell", () => {
  test("lays out the skip link, the rail and the main content", async () => {
    const view = await render(await renderShellElement())

    const skip = document.querySelector('a[href="#main"]')
    expect(skip?.textContent).toBe("Skip to content")
    expect(document.querySelector("main#main h1")?.textContent).toBe("Links")
    expect(document.querySelector('aside nav[aria-label="Current workspace"]')).not.toBeNull()
    expect(document.querySelector('aside nav[aria-label="Account"]')).not.toBeNull()

    await view.unmount()
  })

  test("opens the drawer without the rail's top, and closes it on a row", async () => {
    const view = await render(await renderShellElement())

    expect(isDrawerOpen()).toBe(false)
    await openDrawer()
    expect(findToggle().getAttribute("aria-label")).toBe("Close the menu")
    expect(document.querySelectorAll('nav[aria-label="Current workspace"]')).toHaveLength(1)

    await click(findDrawerLink("Links"))
    expect(isDrawerOpen()).toBe(false)

    await view.unmount()
  })

  test("closes on a link in the footer", async () => {
    const view = await render(await renderShellElement())

    await openDrawer()
    await click(findDrawerLink("Profile"))
    expect(isDrawerOpen()).toBe(false)

    await view.unmount()
  })

  test("stays open for a link that opens elsewhere", async () => {
    const view = await render(await renderShellElement())

    await openDrawer()
    await modifiedClick(findDrawerLink("Links"))
    expect(isDrawerOpen()).toBe(true)

    for (const text of ["Tags", "Stats", "Export"]) {
      await click(findDrawerLink(text))
      expect(isDrawerOpen()).toBe(true)
    }

    await view.unmount()
  })

  test("stays open for a click in a portalled popup", async () => {
    const view = await render(await renderShellElement({ portal: <a href="#menu">Menu item</a> }))

    await openDrawer()
    // The rail renders the portal too; the drawer's copy is the second one.
    const links = [...document.querySelectorAll("a")].filter(
      link => link.textContent === "Menu item",
    )
    const last = links.at(-1)
    if (!last) throw new Error("No portalled link")
    await click(last)
    expect(isDrawerOpen()).toBe(true)

    await view.unmount()
  })

  test("closes when the navigation key changes", async () => {
    const view = await render(await renderShellElement({ navigationKey: "/links" }))

    await openDrawer()
    await view.rerender(await renderShellElement({ navigationKey: "/links" }))
    expect(isDrawerOpen()).toBe(true)

    await view.rerender(await renderShellElement({ navigationKey: "/tags" }))
    expect(isDrawerOpen()).toBe(false)

    await view.unmount()
  })

  test("closes when the screen grows past lg", async () => {
    const view = await render(await renderShellElement())

    await openDrawer()
    await resize(1280)
    expect(isDrawerOpen()).toBe(false)

    await resize(PHONE_WIDTH)
    expect(isDrawerOpen()).toBe(false)

    await view.unmount()
  })

  test("follows `open` and reports every change through `onOpenChange`", async () => {
    const changes: boolean[] = []
    function onOpenChange(next: boolean) {
      changes.push(next)
    }

    const view = await render(await renderShellElement({ open: false, onOpenChange }))
    await click(findToggle())
    expect(changes).toEqual([true])
    expect(isDrawerOpen()).toBe(false)

    await view.rerender(await renderShellElement({ open: true, onOpenChange }))
    expect(isDrawerOpen()).toBe(true)

    await click(findDrawerLink("Links"))
    expect(changes).toEqual([true, false])

    await view.rerender(await renderShellElement({ open: false, onOpenChange }))
    expect(isDrawerOpen()).toBe(false)

    await view.unmount()
  })

  test("tells a caller holding `open` when a navigation closes it", async () => {
    const changes: boolean[] = []
    function onOpenChange(next: boolean) {
      changes.push(next)
    }

    const view = await render(
      await renderShellElement({ open: true, navigationKey: "/links", onOpenChange }),
    )
    await view.rerender(
      await renderShellElement({ open: true, navigationKey: "/tags", onOpenChange }),
    )
    expect(changes).toEqual([false])

    await view.unmount()
  })
})
