import { describe, expect, mock, test } from "bun:test"
import { click, press, readDescription, registerDom, render } from "../test-dom"

registerDom()

const REASON = "Upgrade to add a fourth site."

function getOption(text: string) {
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(element =>
    element.textContent?.startsWith(text),
  )
  if (!option) throw new Error(`No option reads "${text}"`)
  return option
}

describe("SelectItem with a disabledReason", () => {
  test("is reached with the arrow keys, described by its reason, and never chosen", async () => {
    const { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } =
      await import("./select")
    const { TooltipProvider } = await import("./tooltip")
    const onValueChange = mock()

    const view = await render(
      <TooltipProvider>
        <Select
          items={{ blog: "Blog", shop: "Shop", docs: "Docs" }}
          value="blog"
          open
          onValueChange={onValueChange}
        >
          <SelectTrigger aria-label="Workspace">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="shop" disabledReason={REASON}>
              Shop
            </SelectItem>
            <SelectItem value="docs">Docs</SelectItem>
          </SelectContent>
        </Select>
      </TooltipProvider>,
    )

    const { act } = await import("react")
    await act(async () => getOption("Blog").focus())
    await press(getOption("Blog"), "ArrowDown")

    const option = getOption("Shop")
    expect(document.activeElement).toBe(option)
    expect(option.getAttribute("aria-disabled")).toBe("true")
    expect(readDescription(option)).toBe(REASON)

    await press(option, "Enter")
    await click(option)
    expect(onValueChange).not.toHaveBeenCalled()

    await press(option, "ArrowDown")
    expect(document.activeElement).toBe(getOption("Docs"))

    await view.unmount()
  })
})
