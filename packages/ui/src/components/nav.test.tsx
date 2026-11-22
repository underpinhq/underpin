import { describe, expect, test } from "bun:test"
import type { ComponentProps } from "react"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("NavLink", () => {
  test("is a plain link by default, current when it says so", async () => {
    const { Nav, NavLink } = await import("./nav")

    const view = await render(
      <Nav aria-label="Workspace">
        <NavLink href="/links" aria-current="page">
          Links
        </NavLink>
      </Nav>,
    )

    const link = document.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/links")
    expect(link?.getAttribute("aria-current")).toBe("page")
    expect(link?.getAttribute("type")).toBeNull()
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("merges its row onto the element `render` passes", async () => {
    const { NavLink } = await import("./nav")

    function RouterLink({ to, ...props }: ComponentProps<"a"> & { to: string }) {
      return <a href={to} data-router="" {...props} />
    }

    const view = await render(<NavLink render={<RouterLink to="/tags" />}>Tags</NavLink>)

    const link = document.querySelector("[data-router]")
    expect(link?.getAttribute("href")).toBe("/tags")
    expect(link?.className).toContain("justify-start")
    expect(link?.textContent).toBe("Tags")

    await view.unmount()
  })

  test("keeps the render element's own handler and classes", async () => {
    const { NavLink } = await import("./nav")
    const calls: string[] = []

    // The row's label fills the element, so the bare `<a>` here gets its text from the row.
    // oxlint-disable-next-line jsx-a11y/control-has-associated-label
    const element = <a href="/tags" className="router-link" onClick={() => calls.push("element")} />

    const view = await render(
      <NavLink render={element} onClick={() => calls.push("row")}>
        Tags
      </NavLink>,
    )

    const link = document.querySelector("a")
    expect(link?.className).toContain("router-link")
    expect(link?.className).toContain("justify-start")
    link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    expect(calls.toSorted()).toEqual(["element", "row"])

    await view.unmount()
  })

  test("is current when `active` says so", async () => {
    const { NavLink } = await import("./nav")

    const view = await render(
      <>
        <NavLink href="/links" active>
          Links
        </NavLink>
        <NavLink href="/tags" active={false}>
          Tags
        </NavLink>
      </>,
    )

    const [links, tags] = document.querySelectorAll("a")
    expect(links?.getAttribute("aria-current")).toBe("page")
    expect(tags?.hasAttribute("aria-current")).toBe(false)

    await view.unmount()
  })

  test("ends in a status dot and a count", async () => {
    const { NavLink } = await import("./nav")

    const view = await render(
      <NavLink href="/reports" count={2} dot="danger" pulse>
        Reports
      </NavLink>,
    )

    const link = document.querySelector("a")
    expect(link?.textContent).toBe("Reports2")
    expect(document.querySelector(".text-danger")).not.toBeNull()
    expect(document.querySelector(".animate-ping")).not.toBeNull()

    await view.unmount()
  })

  test("has no end without a count or a dot", async () => {
    const { NavLink } = await import("./nav")

    const view = await render(<NavLink href="/stats">Stats</NavLink>)

    expect(document.querySelector(".ml-auto")).toBeNull()

    await view.unmount()
  })
})
