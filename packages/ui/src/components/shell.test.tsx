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

async function renderAreaRailElement(backLabel?: string) {
  const { AreaRail, AreaRailGroup, Shell } = await import("./shell")
  const { NavLink } = await import("./nav")

  return (
    <Shell
      nav={
        <AreaRail
          label="Settings"
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the rail adds the label and the name
          back={<a href="#home" className="back-link" />}
          backLabel={backLabel}
        >
          <AreaRailGroup aria-label="Workspace settings" label="Workspace">
            <NavLink href="#members">Members</NavLink>
          </AreaRailGroup>
          <AreaRailGroup aria-label="Account settings">
            <NavLink href="#profile">Profile</NavLink>
          </AreaRailGroup>
        </AreaRail>
      }
    >
      <h1>Members</h1>
    </Shell>
  )
}

describe("AreaRail", () => {
  test("renders the back row onto the link it is given", async () => {
    const view = await render(await renderAreaRailElement())

    const back = document.querySelector<HTMLAnchorElement>("aside a.back-link")
    expect(back?.getAttribute("href")).toBe("#home")
    expect(back?.getAttribute("aria-label")).toBe("Leave settings")
    expect(back?.textContent).toBe("Settings")
    expect(back?.className).toContain("h-9")
    expect(back?.querySelector("svg")).not.toBeNull()

    await view.unmount()
  })

  test("takes the back row's accessible name from `backLabel`", async () => {
    const view = await render(await renderAreaRailElement("Back to the dashboard"))

    const back = document.querySelector("aside a.back-link")
    expect(back?.getAttribute("aria-label")).toBe("Back to the dashboard")

    await view.unmount()
  })

  test("parts every group from the row above with a hairline", async () => {
    const view = await render(await renderAreaRailElement())

    const workspace = document.querySelector('aside nav[aria-label="Workspace settings"]')
    expect(workspace?.previousElementSibling?.tagName).toBe("HR")
    expect(workspace?.querySelector("p")?.textContent).toBe("Workspace")

    const account = document.querySelector('aside nav[aria-label="Account settings"]')
    expect(account?.previousElementSibling?.tagName).toBe("HR")
    expect(account?.querySelector("p")).toBeNull()
    expect(document.querySelectorAll("aside hr")).toHaveLength(2)

    await view.unmount()
  })

  test("names the rail body for the area step", async () => {
    const view = await render(await renderAreaRailElement())

    const body = document.querySelector("aside a.back-link")?.closest("aside > div")
    expect(body?.className).toContain("[view-transition-name:shell-rail]")

    await view.unmount()
  })

  test("names the rail body from `railBodyClassName` for a second Shell", async () => {
    const { Shell } = await import("./shell")
    const view = await render(
      <Shell
        nav={<nav aria-label="Workspace" />}
        railBodyClassName="[view-transition-name:preview-rail]"
      >
        <h1>Preview</h1>
      </Shell>,
    )

    const body = document.querySelector('aside nav[aria-label="Workspace"]')?.parentElement
    expect(body?.className).toContain("[view-transition-name:preview-rail]")
    expect(body?.className).not.toContain("[view-transition-name:shell-rail]")

    await view.unmount()
  })

  test("builds the back row's default name from the label", async () => {
    const { AreaRail } = await import("./shell")
    const view = await render(
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the rail adds the label and the name
      <AreaRail label="Admin" back={<a href="#home" />}>
        {null}
      </AreaRail>,
    )

    expect(document.querySelector('a[href="#home"]')?.getAttribute("aria-label")).toBe(
      "Leave admin",
    )

    await view.unmount()
  })

  test("shows the same rail in the phone drawer", async () => {
    const view = await render(await renderAreaRailElement())

    await openDrawer()
    const backs = document.querySelectorAll('a[aria-label="Leave settings"]')
    expect(backs).toHaveLength(2)
    const drawerBack = [...backs].find(back => !back.closest("aside"))
    expect(drawerBack).toBeDefined()

    await view.unmount()
  })
})

describe("AreaRailSkeleton", () => {
  test("outlines the back row and each group's rows under its heading", async () => {
    const { AreaRailSkeleton } = await import("./shell")
    const view = await render(
      <AreaRailSkeleton groups={[{ label: "Workspace", rows: 3 }, { rows: 2 }]} />,
    )

    const groups = document.querySelectorAll("nav")
    expect(groups).toHaveLength(2)
    expect(groups[0]?.getAttribute("aria-hidden")).toBe("true")
    expect(groups[0]?.querySelector("p")?.textContent).toBe("Workspace")
    expect(groups[0]?.querySelectorAll(".animate-pulse")).toHaveLength(3)
    expect(groups[1]?.querySelector("p")).toBeNull()
    expect(groups[1]?.querySelectorAll(".animate-pulse")).toHaveLength(2)
    expect(document.querySelectorAll("hr")).toHaveLength(2)

    await view.unmount()
  })
})

describe("AreaRailGroup", () => {
  test("leaves its hairline out with `separator={false}`", async () => {
    const { AreaRailGroup } = await import("./shell")
    const view = await render(
      <AreaRailGroup aria-label="Workspace settings" separator={false}>
        <a href="#members">Members</a>
      </AreaRailGroup>,
    )

    const group = document.querySelector('nav[aria-label="Workspace settings"]')
    expect(group?.previousElementSibling).toBeNull()
    expect(document.querySelectorAll("hr")).toHaveLength(0)

    await view.unmount()
  })
})

describe("RailSearch", () => {
  test("is a button that shows its label and shortcut and opens on a click", async () => {
    const { RailSearch } = await import("./shell")
    let opened = 0
    const view = await render(
      <RailSearch label="Search or jump to…" keys="mod+k" onClick={() => opened++} />,
    )

    const button = document.querySelector("button")
    expect(button?.getAttribute("type")).toBe("button")
    expect(button?.getAttribute("aria-haspopup")).toBe("dialog")
    expect(button?.textContent).toContain("Search or jump to…")
    expect(
      button?.querySelector('[data-shortcut="mod+k"]')?.closest("[aria-hidden]"),
    ).not.toBeNull()
    expect(button?.getAttribute("aria-keyshortcuts")).toMatch(/^(Meta|Control)\+K$/)
    expect(document.querySelector("hr")).toBeNull()

    await click(button as HTMLElement)
    expect(opened).toBe(1)

    await view.unmount()
  })

  test("draws a hairline above with `separator`", async () => {
    const { RailSearch } = await import("./shell")
    const view = await render(<RailSearch label="Search" separator className="custom" />)

    const button = document.querySelector("button")
    expect(button?.closest("div")?.previousElementSibling?.tagName).toBe("HR")
    expect(button?.className).toContain("custom")
    expect(button?.className).toContain("bg-fill")
    expect(button?.className).not.toContain("bg-field")
    expect(document.querySelector("kbd")).toBeNull()
    expect(button?.hasAttribute("aria-keyshortcuts")).toBe(false)

    await view.unmount()
  })
})
