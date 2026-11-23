import { describe, expect, test } from "bun:test"
import { click, press, registerDom, render } from "../test-dom"

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

describe("SearchInput with debounce", () => {
  async function renderSearch(initial = "") {
    const { act, useState } = await import("react")
    const { SearchInput } = await import("./search-input")
    const calls: string[] = []
    // The route's side of the value, which Back changes without the field.
    const outside: { setValue?: (value: string) => void } = {}

    function Search() {
      const [value, setValue] = useState(initial)
      outside.setValue = setValue
      return (
        <SearchInput
          value={value}
          aria-label="Search users"
          debounce={50}
          onValueChange={next => {
            calls.push(next)
            setValue(next)
          }}
        />
      )
    }

    const view = await render(<Search />)
    const input = document.querySelector("input")
    if (!input) throw new Error("No input")

    async function type(text: string) {
      // The prototype's setter, past the one React puts on the element, so React sees a change.
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      await act(async () => {
        descriptor?.set?.call(input, text)
        input?.dispatchEvent(new Event("input", { bubbles: true }))
      })
    }

    async function wait(ms: number) {
      await act(() => new Promise(resolve => setTimeout(resolve, ms)))
    }

    return { act, calls, input, view, type, wait, outside }
  }

  test("hands the text on after a pause in the typing", async () => {
    const { calls, input, view, type, wait } = await renderSearch()

    await type("a")
    await type("ac")
    await wait(10)
    expect(calls).toEqual([])
    expect(input.value).toBe("ac")

    await wait(80)
    expect(calls).toEqual(["ac"])

    await view.unmount()
  })

  test("applies at once on Enter and on clear", async () => {
    const { calls, input, view, type, wait } = await renderSearch()

    await type("acme")
    await press(input, "Enter")
    await wait(0)
    expect(calls).toEqual(["acme"])

    const clear = document.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')
    await click(clear as HTMLButtonElement)
    await wait(0)
    expect(calls).toEqual(["acme", ""])
    expect(input.value).toBe("")

    await view.unmount()
  })

  test("waits for an input method to finish composing", async () => {
    const { act, calls, input, view, type, wait } = await renderSearch()

    await act(async () => {
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
    })
    await type("にほ")
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }),
      )
    })
    await wait(80)
    expect(calls).toEqual([])

    await type("日本")
    await act(async () => {
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }))
    })
    await wait(80)
    expect(calls).toEqual(["日本"])

    await view.unmount()
  })

  test("takes a value changed from outside, as Back does", async () => {
    const { act, calls, input, view, wait, outside } = await renderSearch("acme")

    await act(async () => outside.setValue?.("beta"))
    expect(input.value).toBe("beta")
    await wait(80)
    expect(calls).toEqual([])

    await view.unmount()
  })
})
