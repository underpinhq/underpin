import { describe, expect, mock, test } from "bun:test"
import { useState } from "react"
import { click, listAxeViolations, press, registerDom, render } from "../test-dom"

registerDom()

const OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
]

function getTrigger() {
  const trigger = document.querySelector<HTMLElement>("[aria-haspopup]")
  if (!trigger) throw new Error("No facet trigger")
  return trigger
}

describe("TableToolbar", () => {
  test("puts the search first and the pickers at the end", async () => {
    const { TableToolbar } = await import("./table-toolbar")

    const view = await render(
      <TableToolbar
        search={<input aria-label="Search" />}
        end={<button type="button">Columns</button>}
      >
        <button type="button">Filter</button>
      </TableToolbar>,
    )

    const [search, filter, end] = [
      ...(document.body.firstElementChild?.firstElementChild?.children ?? []),
    ]
    expect(search?.className).toContain("w-50")
    expect(search?.className).toContain("max-sm:w-full")
    expect(filter?.textContent).toBe("Filter")
    expect(end?.className).toContain("ml-auto")

    await view.unmount()
  })
})

describe("TableFacetFilter", () => {
  test("turns from a dashed button into one that shows its value", async () => {
    const { TableFacetFilter } = await import("./table-toolbar")

    function Facet() {
      const [value, setValue] = useState<string[]>([])
      return (
        <TableFacetFilter label="Tier" options={OPTIONS} value={value} onValueChange={setValue} />
      )
    }

    const view = await render(<Facet />)
    expect(getTrigger().hasAttribute("data-active")).toBe(false)
    expect(getTrigger().className).toContain("border-dashed")

    await click(getTrigger())
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')]
    expect(items.map(item => item.textContent)).toEqual(["Free", "Premium"])
    const premium = items[1]
    if (!premium) throw new Error("No Premium option")
    await click(premium)

    expect(getTrigger().hasAttribute("data-active")).toBe(true)
    expect(getTrigger().textContent).toBe("TierPremium")
    await press(premium, "Escape")
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("counts several values and clears them from its menu", async () => {
    const { TableFacetFilter } = await import("./table-toolbar")
    const onValueChange = mock((_value: string[]) => {})

    const view = await render(
      <TableFacetFilter
        label="Tier"
        options={OPTIONS}
        value={["free", "premium"]}
        onValueChange={onValueChange}
      />,
    )
    expect(getTrigger().textContent).toBe("Tier2 selected")

    await click(getTrigger())
    const clear = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      item => item.textContent === "Clear filter",
    )
    if (!clear) throw new Error("No Clear filter item")
    await click(clear)
    expect(onValueChange).toHaveBeenCalledWith([])

    await view.unmount()
  })
})

describe("TableFilterChip", () => {
  test("reads field, relation and value, and removes itself", async () => {
    const { TableFilterChip } = await import("./table-toolbar")
    const { MenuItem } = await import("./menu")
    const onRemove = mock(() => {})

    const view = await render(
      <TableFilterChip
        field="Status"
        operator="is"
        value="Published"
        valueMenu={<MenuItem>Draft</MenuItem>}
        onRemove={onRemove}
      />,
    )

    expect(document.body.textContent).toBe("StatusisPublished")
    // Only the value has a menu, so only it is a trigger.
    expect(document.querySelectorAll("[aria-haspopup]").length).toBe(1)
    const remove = document.querySelector<HTMLElement>('button[aria-label="Remove filter"]')
    if (!remove) throw new Error("No remove button")
    await click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })
})
