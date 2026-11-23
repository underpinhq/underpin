import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"
import type { SortableActivator } from "./sortable"

registerDom()

const NAMES = ["Pricing", "Docs", "Blog"]

interface RowProps {
  id: string
  name: string
}

async function renderList(
  activator: SortableActivator,
  moves: [number, number][],
  disabled = false,
) {
  const { DragHandle, SortableList, useSortableItem } = await import("./sortable")

  function Row({ id, name }: RowProps) {
    const sortable = useSortableItem(id)

    return (
      <li {...sortable.box}>
        <DragHandle label={`Reorder ${name}`} sortable={sortable} />
        {name}
      </li>
    )
  }

  return render(
    <SortableList
      ids={NAMES}
      layout="list"
      noun="page"
      describe={index => NAMES[index]}
      activator={activator}
      disabled={disabled}
      onMove={(from, to) => moves.push([from, to])}
    >
      <ul>
        {NAMES.map(name => (
          <Row key={name} id={name} name={name} />
        ))}
      </ul>
    </SortableList>,
  )
}

async function press(element: Element | null | undefined, key: string) {
  const { act } = await import("react")

  if (!element) throw new Error("No element to press a key on")
  await act(async () =>
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })),
  )
}

function findHandle(name: string) {
  return document.querySelector(`button[aria-label="Reorder ${name}"]`)
}

describe("SortableList", () => {
  test("a handle grip moves its item one place per arrow key and says where", async () => {
    const moves: [number, number][] = []
    const view = await renderList("handle", moves)

    await press(findHandle("Docs"), "ArrowDown")
    await press(findHandle("Pricing"), "ArrowUp")
    await press(findHandle("Blog"), "ArrowLeft")

    // The first item has no place above it, and a side arrow moves nothing.
    expect(moves).toEqual([[1, 2]])
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      "Moved Docs to position 3 of 3.",
    )
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("a box list leaves the arrow keys to the keyboard drag", async () => {
    const moves: [number, number][] = []
    const view = await renderList("box", moves)

    await press(findHandle("Docs"), "ArrowDown")

    expect(moves).toEqual([])
    expect(document.body.textContent).not.toContain("Moved")

    await view.unmount()
  })

  test("a disabled list moves nothing from the keyboard and marks its grips", async () => {
    const moves: [number, number][] = []
    const view = await renderList("handle", moves, true)

    await press(findHandle("Docs"), "ArrowDown")

    expect(moves).toEqual([])
    expect(document.body.textContent).not.toContain("Moved")
    expect(findHandle("Docs")?.getAttribute("aria-disabled")).toBe("true")

    await view.unmount()
  })
})
