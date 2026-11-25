import { afterEach, describe, expect, test } from "bun:test"
import { click, listAxeViolations, press, registerDom, render } from "../test-dom"
import type { SortableDataTableProps } from "./sortable-data-table"

registerDom()

/** The views a test mounted, unmounted after it even when it fails part way. */
const mounted: { unmount: () => Promise<void> }[] = []

afterEach(async () => {
  for (const view of mounted.splice(0)) await view.unmount()
})

interface Field {
  id: string
  name: string
  key: string
}

const FIELDS: Field[] = [
  { id: "field_1", name: "Headline", key: "headline" },
  { id: "field_2", name: "Logo", key: "logo" },
  { id: "field_3", name: "Link", key: "link" },
]

/** A name column with the grip and a row link, and a key column. */
async function getColumns() {
  const { createDataTableColumnHelper } = await import("../lib/data-table-state")
  const { DataTableRowLink } = await import("./data-table")
  const { DataTableDragHandle } = await import("./sortable-data-table")
  const { TableCell, TableIdentityCell } = await import("./table")
  const helper = createDataTableColumnHelper<Field>()

  return helper.columns([
    helper.accessor("name", {
      header: "Field",
      cell: ({ getValue }) => (
        <TableIdentityCell
          leading={<DataTableDragHandle />}
          title={<DataTableRowLink>{getValue()}</DataTableRowLink>}
        />
      ),
    }),
    helper.accessor("key", {
      header: "Key",
      meta: { width: "8rem", sortable: true },
      cell: ({ getValue }) => <TableCell>{getValue()}</TableCell>,
    }),
  ])
}

type ExampleProps = Partial<Omit<SortableDataTableProps<Field>, "columns">>

async function renderExample(props: ExampleProps = {}) {
  const { SortableDataTable } = await import("./sortable-data-table")
  const columns = await getColumns()
  const moves: [number, number][] = []

  const view = await render(
    <SortableDataTable
      aria-label="Fields"
      columns={columns}
      data={FIELDS}
      getRowId={field => field.id}
      getRowLabel={field => field.name}
      getRowHref={field => `/fields/${field.id}`}
      noun="field"
      onMove={(from, to) => moves.push([from, to])}
      {...props}
    />,
  )
  mounted.push(view)

  return { moves }
}

/** Lets time pass inside `act`, so timers that fire in it settle. */
async function wait(ms: number) {
  const { act } = await import("react")
  await act(() => new Promise(resolve => setTimeout(resolve, ms)))
}

/** Dispatches an event inside `act`, then waits, so timers and renders it starts settle. */
async function dispatch(target: EventTarget, event: Event, wait = 20) {
  const { act } = await import("react")

  await act(async () => {
    target.dispatchEvent(event)
    await new Promise(resolve => setTimeout(resolve, wait))
  })
}

/** A finger on an element at a point, starting (`touchstart`) or moving (`touchmove`). */
function createTouchEvent(type: string, element: Element, clientY: number) {
  const point = new Touch({ identifier: 0, target: element, clientX: 10, clientY })
  return new TouchEvent(type, { bubbles: true, cancelable: true, touches: [point] })
}

function createMouseEvent(type: string, clientY: number) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY })
}

/** Counts the clicks that reach the row link of a row. */
function countClicks(name: string) {
  const link = [...document.querySelectorAll<HTMLElement>("[data-row-link]")].find(
    element => element.textContent === name,
  )
  if (!link) throw new Error(`No row link for ${name}`)
  const clicks = { count: 0, events: [] as MouseEvent[] }
  link.addEventListener("click", event => {
    event.preventDefault()
    clicks.count += 1
    clicks.events.push(event)
  })
  return { link, clicks }
}

function findCopy(name: string) {
  return document.querySelector(`[role="list"][aria-label="${name}"]`)
}

/**
 * The cells the table's gutter classes reach, found with the selectors Tailwind writes for them:
 * `[&_<selector>]:pl-7` becomes `<table> <selector>`.
 */
function getGutterCells(table: Element): (Element | null)[] {
  const selectors = [...table.classList]
    .map(name => /^\[&_(.+)\]:pl-7$/.exec(name)?.[1])
    .filter(selector => selector !== undefined)
    .map(selector => `:scope ${selector.replaceAll("_", " ")}`)
  return selectors.flatMap(selector => [...table.querySelectorAll(selector)])
}

/**
 * The state a row must be in for its grip to hide, read from the class Tailwind compiles to
 * `.group/row:<state> <grip>` on a screen that hovers. Undefined when the grip never hides.
 */
function findHiddenRowState(handle: Element) {
  return [...handle.classList]
    .map(name => /^\[@media\(hover:hover\)\]:group-\[(.+)\]\/row:opacity-0$/.exec(name)?.[1])
    .find(state => state !== undefined)
}

/**
 * Presses Escape on the document, where a drag in progress listens for it. The drag blocks clicks
 * on the document until 50ms after it ends, so the wait keeps it from eating the next test's.
 */
async function cancelDrag() {
  const { act } = await import("react")

  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape" }))
    await new Promise(resolve => setTimeout(resolve, 60))
  })
}

function findHandle(name: string) {
  return document.querySelector<HTMLElement>(`button[aria-label="Reorder ${name}"]`)
}

describe("SortableDataTable", () => {
  test("keeps the table's head, columns and row links", async () => {
    await renderExample()

    const heads = [...document.querySelectorAll('[role="columnheader"]')]
    expect(heads.map(head => head.textContent)).toEqual(["Field", "Key"])
    expect(document.querySelectorAll('tbody [role="row"]')).toHaveLength(3)
    expect(document.querySelector('a[href="/fields/field_2"]')?.textContent).toBe("Logo")
    expect(await listAxeViolations()).toEqual([])
  })

  test("a grip moves its row one place per arrow key", async () => {
    const { moves } = await renderExample()

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await press(handle, "ArrowDown")

    expect(moves).toEqual([[1, 2]])
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      "Moved Logo to position 3 of 3.",
    )
  })

  test("a finger that moves 2px on the grip lifts the row as a one-row copy, leaving a slot", async () => {
    const { moves } = await renderExample()

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await dispatch(handle, createTouchEvent("touchstart", handle, 10))
    expect(findCopy("Logo")).toBeNull()
    await dispatch(handle, createTouchEvent("touchmove", handle, 14))

    const copy = findCopy("Logo")
    expect(copy?.querySelectorAll('[role="listitem"]')).toHaveLength(1)
    expect(copy?.querySelectorAll('[role="listitem"] > *')).toHaveLength(2)
    expect(copy?.querySelector('[role="columnheader"]')).toBeNull()
    expect(handle.closest('[role="row"]')?.className).toContain("*:invisible")

    await cancelDrag()

    expect(findCopy("Logo")).toBeNull()
    expect(moves).toEqual([])
  })

  test("a tap or a click on the grip opens the row, and a key press on it does not", async () => {
    await renderExample()
    const { clicks } = countClicks("Logo")

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await dispatch(handle, createTouchEvent("touchstart", handle, 10))
    await dispatch(handle, new TouchEvent("touchend", { bubbles: true, cancelable: true }))
    await dispatch(handle, new MouseEvent("click", { bubbles: true, detail: 1 }))

    expect(findCopy("Logo")).toBeNull()
    expect(clicks.count).toBe(1)

    await dispatch(handle, new MouseEvent("click", { bubbles: true, detail: 0 }))
    expect(clicks.count).toBe(1)
  })

  test("a click on the grip reaches the row link with its button and modifier keys", async () => {
    await renderExample()
    const { clicks } = countClicks("Logo")

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await dispatch(handle, new MouseEvent("click", { bubbles: true, detail: 1, metaKey: true }))
    await dispatch(handle, new MouseEvent("auxclick", { bubbles: true, detail: 1, button: 1 }))
    await dispatch(handle, new MouseEvent("auxclick", { bubbles: true, detail: 1, button: 2 }))

    expect(clicks.events.map(event => [event.button, event.metaKey])).toEqual([
      [0, true],
      [1, false],
    ])
  })

  test("a finger elsewhere on the row lifts it after a 250ms press, not before", async () => {
    await renderExample()

    const { link } = countClicks("Logo")
    await dispatch(link, createTouchEvent("touchstart", link, 10), 100)
    expect(findCopy("Logo")).toBeNull()

    await wait(250)
    expect(findCopy("Logo")).not.toBeNull()
    await cancelDrag()
  })

  test("a pointer that moves under 6px clicks the row, and one that moves further drags it", async () => {
    await renderExample()
    const { link, clicks } = countClicks("Logo")

    await dispatch(link, createMouseEvent("mousedown", 10))
    await dispatch(document, createMouseEvent("mousemove", 14))
    expect(findCopy("Logo")).toBeNull()
    await dispatch(document, createMouseEvent("mouseup", 14))
    await dispatch(link, new MouseEvent("click", { bubbles: true, detail: 1 }), 60)
    expect(clicks.count).toBe(1)

    await dispatch(link, createMouseEvent("mousedown", 10))
    await dispatch(document, createMouseEvent("mousemove", 20))
    expect(findCopy("Logo")).not.toBeNull()
    await dispatch(document, new KeyboardEvent("keydown", { key: "Escape", code: "Escape" }), 0)
    await dispatch(link, new MouseEvent("click", { bubbles: true, detail: 1 }), 60)

    // The click that ends a drag opens nothing.
    expect(clicks.count).toBe(1)
  })

  test("names the lifted copy by the row's id when its label is blank", async () => {
    await renderExample({ getRowLabel: field => (field.id === "field_2" ? "" : field.name) })

    const handle = findHandle("")
    if (!handle) throw new Error("No grip for the blank row")
    await dispatch(handle, createTouchEvent("touchstart", handle, 10))
    await dispatch(handle, createTouchEvent("touchmove", handle, 14))

    expect(findCopy("field_2")).not.toBeNull()
    await cancelDrag()
  })

  test("still sorts by a column's head", async () => {
    const sorts: unknown[] = []
    await renderExample({
      state: {},
      onStateChange: state => sorts.push(state.sort),
    })

    const head = [...document.querySelectorAll<HTMLElement>("th button")].find(
      button => button.textContent === "Key",
    )
    if (!head) throw new Error("No sort button on Key")
    await click(head)

    expect(sorts).toEqual([{ id: "key", desc: false }])
  })

  test("names each grip through the labels", async () => {
    await renderExample({ labels: { reorder: name => `Move ${name}` } })

    expect(document.querySelector('button[aria-label="Move Headline"]')).not.toBeNull()
  })

  test("puts a grip in every row, and its gutter in the head and the rows", async () => {
    await renderExample()

    const table = document.querySelector('[role="table"]')
    if (!table) throw new Error("No table")
    const rows = [...table.querySelectorAll('tbody [role="row"]')]
    expect(rows.map(row => row.querySelector('button[aria-label^="Reorder"]') !== null)).toEqual([
      true,
      true,
      true,
    ])
    expect(getGutterCells(table)).toEqual([
      table.querySelector('[role="columnheader"]'),
      ...rows.map(row => row.firstElementChild),
    ])
  })

  test("leaves the gutter out of a message across the whole table", async () => {
    const { TableMessage } = await import("./table")
    await renderExample({ data: [], message: <TableMessage kind="filtered" title="No fields" /> })

    const table = document.querySelector('[role="table"]')
    if (!table) throw new Error("No table")
    expect(getGutterCells(table)).toEqual([table.querySelector('[role="columnheader"]')])
  })

  test("a finger on a disabled grip lifts nothing", async () => {
    await renderExample({ disabled: true })

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await dispatch(handle, createTouchEvent("touchstart", handle, 10))
    await dispatch(handle, createTouchEvent("touchmove", handle, 40), 300)

    expect(findCopy("Logo")).toBeNull()
  })

  test("keeps its grips while disabled, and they move nothing", async () => {
    const { moves } = await renderExample({ disabled: true })

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await press(handle, "ArrowDown")

    expect(moves).toEqual([])
    expect(handle.getAttribute("aria-disabled")).toBe("true")
  })

  test("shows every grip by default", async () => {
    await renderExample()

    const handles = document.querySelectorAll('button[aria-label^="Reorder"]')
    expect([...handles].map(findHiddenRowState)).toEqual([undefined, undefined, undefined])
  })

  test("on hover, hides a grip while its row is neither hovered nor focused", async () => {
    await renderExample({ handleVisibility: "hover" })

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    const row = handle.closest('[role="row"]')
    if (!row) throw new Error("No row for Logo")
    // happy-dom matches no `:hover` or `:focus-within`, so the test reads the selector itself.
    expect(row.classList.contains("group/row")).toBe(true)
    expect(findHiddenRowState(handle)).toBe(":not(:hover,:focus-within)")
  })

  test("on hover, keeps every grip in the tab order and named", async () => {
    const { moves } = await renderExample({ handleVisibility: "hover" })

    const handles = [...document.querySelectorAll<HTMLElement>('button[aria-label^="Reorder"]')]
    expect(handles.map(handle => handle.tabIndex)).toEqual([0, 0, 0])
    expect(handles.some(handle => handle.closest('[aria-hidden="true"]'))).toBe(false)
    expect(await listAxeViolations()).toEqual([])

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await press(handle, "ArrowDown")
    expect(moves).toEqual([[1, 2]])
  })

  test("on hover, keeps the lifted copy's grip in view", async () => {
    await renderExample({ handleVisibility: "hover" })

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await dispatch(handle, createTouchEvent("touchstart", handle, 10))
    await dispatch(handle, createTouchEvent("touchmove", handle, 14))

    const copyHandle = findCopy("Logo")?.querySelector('button[aria-label="Reorder Logo"]')
    if (!copyHandle) throw new Error("No grip on the lifted copy")
    expect(findHiddenRowState(copyHandle)).toBeUndefined()

    await cancelDrag()
  })
})

describe("DataTableDragHandle", () => {
  test("draws nothing in a table that does not sort", async () => {
    const { DataTable } = await import("./data-table")
    const columns = await getColumns()

    const view = await render(
      <DataTable
        aria-label="Fields"
        columns={columns}
        data={FIELDS}
        getRowId={field => field.id}
      />,
    )
    mounted.push(view)

    expect(document.querySelector('button[aria-label^="Reorder"]')).toBeNull()
  })
})
