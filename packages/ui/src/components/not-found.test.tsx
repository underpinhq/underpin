import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("NotFound", () => {
  test("says the page is missing and shows the app's way back", async () => {
    const { NotFound } = await import("./not-found")

    const view = await render(<NotFound action={<a href="/">Go home</a>} />)

    expect(document.body.textContent).toContain("Page not found")
    expect(document.body.textContent).toContain("This URL does not match any page.")
    expect(document.querySelector("a")?.getAttribute("href")).toBe("/")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("takes its labels as props", async () => {
    const { NotFound } = await import("./not-found")

    const view = await render(
      <NotFound title="Page introuvable" description="Cette adresse ne mène nulle part." />,
    )

    expect(document.body.textContent).toBe("Page introuvableCette adresse ne mène nulle part.")

    await view.unmount()
  })
})
