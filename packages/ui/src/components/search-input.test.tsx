import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

describe("SearchInput", () => {
  test("clearing the field puts focus back in it", async () => {
    const { act, useState } = await import("react")
    const { SearchInput } = await import("./search-input")

    function Search() {
      const [value, setValue] = useState("pricing")
      return <SearchInput value={value} aria-label="Search pages" onValueChange={setValue} />
    }

    const view = await render(<Search />)
    const clear = document.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')
    clear?.focus()

    await act(async () => clear?.click())

    const input = document.querySelector("input")
    expect(input?.value).toBe("")
    expect(document.activeElement).toBe(input)

    await view.unmount()
  })
})
