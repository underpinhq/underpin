import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("DangerZoneCard", () => {
  test("heads its rows with the English defaults", async () => {
    const { DangerZoneCard } = await import("./danger-zone-card")

    const view = await render(
      <DangerZoneCard>
        <p>Row</p>
      </DangerZoneCard>,
    )

    expect(document.body.textContent).toContain("Danger zone")
    expect(document.body.textContent).toContain("Actions that cannot be undone.")
    expect(document.body.textContent).toContain("Row")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("takes its own heading and an id to link to", async () => {
    const { DangerZoneCard } = await import("./danger-zone-card")

    const view = await render(
      <DangerZoneCard id="danger" title="Strefa zagrożenia" description="Nie do cofnięcia.">
        <p>Row</p>
      </DangerZoneCard>,
    )

    const section = document.getElementById("danger")
    expect(section?.textContent).toContain("Strefa zagrożenia")
    expect(section?.textContent).toContain("Nie do cofnięcia.")
    expect(document.body.textContent).not.toContain("Danger zone")

    await view.unmount()
  })
})
