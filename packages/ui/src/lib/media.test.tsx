import { describe, expect, test } from "bun:test"
import { DESKTOP_WIDTH, PHONE_WIDTH, registerDom, render, resize } from "../test-dom"

registerDom()

interface ProbeProps {
  open: boolean
}

function readShape() {
  return document.querySelector("output")?.textContent
}

describe("useSheetWhileOpen", () => {
  test("holds its answer while open and takes up the viewport's once closed", async () => {
    const { useSheetWhileOpen } = await import("./media")

    function Probe({ open }: ProbeProps) {
      return <output>{useSheetWhileOpen(open) ? "sheet" : "popover"}</output>
    }

    await resize(DESKTOP_WIDTH)
    const view = await render(<Probe open />)
    expect(readShape()).toBe("popover")

    await resize(PHONE_WIDTH)
    expect(readShape()).toBe("popover")

    await view.rerender(<Probe open={false} />)
    expect(readShape()).toBe("sheet")

    await view.rerender(<Probe open />)
    await resize(DESKTOP_WIDTH)
    expect(readShape()).toBe("sheet")

    await view.unmount()
  })
})
