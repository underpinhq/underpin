import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("EntityAvatar", () => {
  test("is hidden from assistive tech beside a visible name", async () => {
    const { EntityAvatar } = await import("./entity-avatar")

    const view = await render(
      <p>
        <EntityAvatar name="Piotr Kulpinski" src="https://example.com/photo.png" />
        Piotr Kulpinski
      </p>,
    )

    expect(document.querySelector('[aria-hidden="true"]')?.textContent).toBe("PK")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("takes its name from `label` when it stands alone", async () => {
    const { EntityAvatar } = await import("./entity-avatar")

    const view = await render(<EntityAvatar name="Acme" label="Acme" />)

    expect(document.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Acme")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("keeps a character outside the basic plane whole in the initials", async () => {
    const { EntityAvatar } = await import("./entity-avatar")

    const view = await render(<EntityAvatar name="🚀 Rocket  Labs" />)

    expect(document.body.textContent).toBe("🚀R")

    await view.unmount()
  })
})
