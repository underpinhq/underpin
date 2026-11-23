import { afterEach, describe, expect, test } from "bun:test"
import { click, listAxeViolations, press, registerDom, render } from "../test-dom"
import type { SortableActivator } from "./sortable"
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

async function renderExample(activator: SortableActivator, props: ExampleProps = {}) {
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
      activator={activator}
      onMove={(from, to) => moves.push([from, to])}
      {...props}
    />,
  )
  mounted.push(view)

  return { moves }
}

/** Presses a key with its `code` too, which the keyboard drag reads: Space, the arrows, Escape. */
async function pressCode(element: Element, code: string) {
  const { act } = await import("react")
  const key = code === "Space" ? " " : code

  await act(async () => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 20))
  })
}

function findHandle(name: string) {
  return document.querySelector<HTMLElement>(`button[aria-label="Reorder ${name}"]`)
}

describe("SortableDataTable", () => {
  test("keeps the table's head, columns and row links", async () => {
    await renderExample("handle")

    const heads = [...document.querySelectorAll('[role="columnheader"]')]
    expect(heads.map(head => head.textContent)).toEqual(["Field", "Key"])
    expect(document.querySelectorAll('tbody [role="row"]')).toHaveLength(3)
    expect(document.querySelector('a[href="/fields/field_2"]')?.textContent).toBe("Logo")
    expect(await listAxeViolations()).toEqual([])
  })

  test("a handle grip moves its row one place per arrow key", async () => {
    const { moves } = await renderExample("handle")

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await press(handle, "ArrowDown")

    expect(moves).toEqual([[1, 2]])
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      "Moved Logo to position 3 of 3.",
    )
  })

  test("a box row lifts as a one-row copy of the same columns and leaves a blank slot", async () => {
    const { moves } = await renderExample("box")

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    handle.focus()
    await pressCode(handle, "Space")

    const copy = document.querySelector('[role="list"][aria-label="Logo"]')
    expect(copy?.querySelectorAll('[role="listitem"]')).toHaveLength(1)
    expect(copy?.querySelectorAll('[role="listitem"] > *')).toHaveLength(2)
    expect(copy?.querySelector('[role="columnheader"]')).toBeNull()
    expect(handle.closest('[role="row"]')?.className).toContain("*:invisible")

    await pressCode(handle, "Escape")

    expect(document.querySelector('[role="list"][aria-label="Logo"]')).toBeNull()
    expect(moves).toEqual([])
  })

  test("names the lifted copy by the row's id when its label is blank", async () => {
    await renderExample("box", { getRowLabel: field => (field.id === "field_2" ? "" : field.name) })

    const handle = findHandle("")
    if (!handle) throw new Error("No grip for the blank row")
    handle.focus()
    await pressCode(handle, "Space")

    expect(document.querySelector('[role="list"][aria-label="field_2"]')).not.toBeNull()
    await pressCode(handle, "Escape")
  })

  test("still sorts by a column's head", async () => {
    const sorts: unknown[] = []
    await renderExample("handle", {
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
    await renderExample("handle", { labels: { reorder: name => `Move ${name}` } })

    expect(document.querySelector('button[aria-label="Move Headline"]')).not.toBeNull()
  })

  test("a box table's grip waits for hover or focus, and goes while disabled", async () => {
    await renderExample("box")

    expect(findHandle("Headline")?.className).toContain("opacity-0")

    for (const view of mounted.splice(0)) await view.unmount()
    await renderExample("box", { disabled: true })

    expect(findHandle("Headline")).toBeNull()
  })

  test("a handle table keeps its grips while disabled, and they move nothing", async () => {
    const { moves } = await renderExample("handle", { disabled: true })

    const handle = findHandle("Logo")
    if (!handle) throw new Error("No grip for Logo")
    await press(handle, "ArrowDown")

    expect(moves).toEqual([])
    expect(handle.getAttribute("aria-disabled")).toBe("true")
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
