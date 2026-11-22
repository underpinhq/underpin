import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

describe("CopySecret", () => {
  test("shows the secret in a named field, what goes with it, and Done", async () => {
    const { Dialog, DialogContent } = await import("./dialog")
    const { CopySecret } = await import("./copy-secret")

    const view = await render(
      <Dialog open>
        <DialogContent>
          <CopySecret
            title="Copy your API key"
            description="This is the only time it is shown."
            label="API key"
            value="hs_live_123"
          >
            <p>Base URL</p>
          </CopySecret>
        </DialogContent>
      </Dialog>,
    )

    const input = document.querySelector<HTMLInputElement>('input[aria-label="API key"]')
    expect(input?.value).toBe("hs_live_123")
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Base URL")
    const buttons = [...document.querySelectorAll("button")].map(button => button.textContent)
    expect(buttons).toContain("Done")

    await view.unmount()
  })

  test("takes the closing label as a prop", async () => {
    const { Dialog, DialogContent } = await import("./dialog")
    const { CopySecret } = await import("./copy-secret")

    const view = await render(
      <Dialog open>
        <DialogContent>
          <CopySecret
            title="Copiez la clé"
            label="Clé"
            value="key"
            doneLabel="Terminé"
            copyLabel="Copier"
          />
        </DialogContent>
      </Dialog>,
    )

    const buttons = [...document.querySelectorAll("button")].map(button => button.textContent)
    expect(buttons).toContain("Terminé")
    expect(buttons).not.toContain("Done")
    expect(document.querySelector('button[aria-label="Copier"]')).not.toBeNull()

    await view.unmount()
  })
})
