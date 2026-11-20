import { afterEach, describe, expect, mock, test } from "bun:test"
import type { ReactNode } from "react"
import type { DataTableState } from "../lib/data-table-state"
import { click, listAxeViolations, registerDom, render } from "../test-dom"
import type { DataTableChangeOptions, DataTablePagination, DataTableProps } from "./data-table"

registerDom()

/** The views a test mounted, unmounted after it even when it fails part way. */
const mounted: { unmount: () => Promise<void> }[] = []

afterEach(async () => {
  for (const view of mounted.splice(0)) await view.unmount()
})

interface Site {
  id: string
  name: string
  visitors: number
  plan: string
  archived?: boolean
}

const SITES: Site[] = [
  { id: "site_1", name: "figma.com", visitors: 1204, plan: "Pro" },
  { id: "site_2", name: "linear.app", visitors: 980, plan: "Team" },
  { id: "site_3", name: "vercel.com", visitors: 512, plan: "Pro", archived: true },
  { id: "site_4", name: "github.com", visitors: 77, plan: "Free" },
]

/** Thousands separators without Intl, which the package never calls itself. */
function format(value: number) {
  return String(value).replace(/\B(?=(\d{3})+$)/g, ",")
}

/** Stands in for the browser's observer, so a test can scroll an element into view. */
class FakeObserver {
  static instances: FakeObserver[] = []
  callback: IntersectionObserverCallback
  observed: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeObserver.instances.push(this)
  }

  observe(element: Element) {
    this.observed.push(element)
  }

  disconnect() {
    this.observed = []
  }

  reveal() {
    const entries = this.observed.map(target => ({ target, isIntersecting: true }))
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

/** The example table's columns: a linked name, a sortable figure, a plan that gives way. */
async function getColumns() {
  const { createDataTableColumnHelper } = await import("../lib/data-table-state")
  const { DataTableRowLink } = await import("./data-table")
  const { TableActionsCell, TableCell, TableIdentityCell, TableNumberCell } =
    await import("./table")
  const helper = createDataTableColumnHelper<Site>()

  return helper.columns([
    helper.accessor("name", {
      header: "Site",
      enableHiding: false,
      meta: { sortable: true },
      cell: ({ getValue }) => (
        <TableIdentityCell title={<DataTableRowLink>{getValue()}</DataTableRowLink>} />
      ),
    }),
    helper.accessor("visitors", {
      header: "Visitors",
      meta: { align: "end", width: "6rem", sortable: "descending" },
      cell: ({ getValue }) => <TableNumberCell>{format(getValue())}</TableNumberCell>,
    }),
    helper.accessor("plan", {
      header: "Plan",
      meta: { width: "8rem", priority: "medium" },
      cell: ({ getValue }) => <TableCell>{getValue()}</TableCell>,
    }),
    helper.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      meta: { width: "3rem", skeleton: false },
      cell: ({ row }) => (
        <TableActionsCell>
          <button type="button">Actions for {row.original.name}</button>
        </TableActionsCell>
      ),
    }),
  ])
}

type ExampleProps = Partial<Omit<DataTableProps<Site>, "columns">>

/** The example table, paged by default. */
async function renderExample(props: ExampleProps = {}) {
  const { DataTable } = await import("./data-table")
  const columns = await getColumns()
  const onStateChange = mock((_state: DataTableState, _options: DataTableChangeOptions) => {})
  const pagination: DataTablePagination = { type: "pages", total: 4 }

  function element(next: ExampleProps = {}) {
    return (
      <DataTable
        aria-label="Sites"
        columns={columns}
        data={SITES}
        getRowId={site => site.id}
        getRowLabel={site => site.name}
        state={{ page: 1, perPage: 25 }}
        pagination={pagination}
        format={format}
        onStateChange={onStateChange}
        {...props}
        {...next}
      />
    )
  }

  const view = await render(element())
  let unmounted = false
  async function unmount() {
    if (unmounted) return
    unmounted = true
    await view.unmount()
  }
  mounted.push({ unmount })

  return {
    unmount,
    onStateChange,
    rerenderWith: (next: ExampleProps) => view.rerender(element(next)),
  }
}

function getRows() {
  return [...document.querySelectorAll("tbody > tr")]
}

function getButton(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    candidate =>
      candidate.getAttribute("aria-label") === label || candidate.textContent?.trim() === label,
  )
  if (!button) throw new Error(`No button "${label}"`)
  return button
}

function getCheckbox(label: string) {
  const box = document.querySelector<HTMLElement>(`[role="checkbox"][aria-label="${label}"]`)
  if (!box) throw new Error(`No checkbox "${label}"`)
  return box
}

async function shiftClick(element: HTMLElement) {
  const { act } = await import("react")

  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }),
    )
    await new Promise(resolve => setTimeout(resolve, 20))
  })
}

describe("DataTable", () => {
  test("draws the columns from their definitions, with each meta on its head and cells", async () => {
    await renderExample()

    const table = document.querySelector<HTMLElement>('[role="table"]')
    expect(table?.getAttribute("aria-label")).toBe("Sites")
    expect(table?.style.getPropertyValue("--table-columns")).toBe("minmax(0,1fr) 6rem 3rem")
    expect(table?.style.getPropertyValue("--table-columns-lg")).toBe("minmax(0,1fr) 6rem 8rem 3rem")

    const heads = [...document.querySelectorAll("th")]
    expect(heads.map(head => head.textContent)).toEqual(["Site", "Visitors", "Plan", "Actions"])
    expect(heads[1]?.className).toContain("justify-end")
    expect(heads[2]?.className).toContain("@max-2xl:hidden")

    const firstRow = getRows()[0]
    const cells = [...(firstRow?.querySelectorAll("td") ?? [])]
    expect(cells.map(cell => cell.textContent)).toEqual([
      "figma.com",
      "1,204",
      "Pro",
      "Actions for figma.com",
    ])
    // The plan cell takes the column's priority from its meta, though its column never names it.
    expect(cells[2]?.className).toContain("@max-2xl:hidden")
    expect(cells[2]?.getAttribute("data-priority")).toBe("medium")
    expect(cells[1]?.className).toContain("justify-end")
    // No `getRowHref`, so the name is text and the row takes no hover fill.
    expect(firstRow?.querySelector("a")).toBeNull()
    expect(await listAxeViolations()).toEqual([])
  })

  test("makes a row open its record when the table has a link per row", async () => {
    await renderExample({ getRowHref: site => `/sites/${site.id}` })

    const link = getRows()[0]?.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/sites/site_1")
    expect(link?.textContent).toBe("figma.com")
    expect(link?.hasAttribute("data-row-link")).toBe(true)
  })

  test("sorts from a column name and goes back to page 1", async () => {
    const view = await renderExample({
      state: { page: 3, perPage: 25, sort: { id: "visitors", desc: true } },
      pagination: { type: "pages", total: 100 },
    })

    const visitors = document.querySelectorAll("th")[1]
    expect(visitors?.getAttribute("aria-sort")).toBe("descending")
    expect(document.querySelectorAll("th")[0]?.getAttribute("aria-sort")).toBe("none")
    expect(document.querySelectorAll("th")[2]?.hasAttribute("aria-sort")).toBe(false)

    await click(getButton("Visitors"))
    expect(view.onStateChange.mock.lastCall).toEqual([
      {
        page: 1,
        perPage: 25,
        sort: { id: "visitors", desc: false },
      },
      { replace: false },
    ])

    await click(getButton("Site"))
    expect(view.onStateChange.mock.lastCall?.[0].sort?.id).toBe("name")
    expect(view.onStateChange.mock.lastCall?.[0].page).toBe(1)
  })

  test("sorts a column first in its own direction, whatever its rows hold", async () => {
    const view = await renderExample({ data: [] })

    // Visitors sorts descending first, the name ascending, with no row to infer it from.
    await click(getButton("Visitors"))
    expect(view.onStateChange.mock.lastCall?.[0].sort).toEqual({ id: "visitors", desc: true })
    await click(getButton("Site"))
    expect(view.onStateChange.mock.lastCall?.[0].sort).toEqual({ id: "name", desc: false })
  })

  test("fades the rows of archived records", async () => {
    await renderExample({ isRowInactive: site => site.archived === true })

    expect(getRows().map(row => row.hasAttribute("data-inactive"))).toEqual([
      false,
      false,
      true,
      false,
    ])
  })

  test("pages through the rows, 1-based, and moves a page past the end to the last", async () => {
    const view = await renderExample({
      state: { page: 2, perPage: 25 },
      pagination: { type: "pages", total: 1204, perPageOptions: [25, 50] },
    })

    expect(document.body.textContent).toContain("Showing 26–50 of 1,204")
    expect(document.body.textContent).toContain("Page 2 of 49")
    await click(getButton("Next page"))
    expect(view.onStateChange.mock.lastCall).toEqual([{ page: 3, perPage: 25 }, { replace: false }])
    await click(getButton("First page"))
    expect(view.onStateChange.mock.lastCall).toEqual([{ page: 1, perPage: 25 }, { replace: false }])

    // A stale link: page 60 of 49 shows the last page and asks the app for it.
    await view.rerenderWith({ state: { page: 60, perPage: 25 } })
    expect(document.body.textContent).toContain("Page 49 of 49")
    expect(view.onStateChange.mock.lastCall).toEqual([{ page: 49, perPage: 25 }, { replace: true }])

    // Renders before the app's state catches up ask once, not once each.
    const calls = view.onStateChange.mock.calls.length
    await view.rerenderWith({ state: { page: 60, perPage: 25 }, loading: false })
    await view.rerenderWith({ state: { page: 60, perPage: 25 } })
    expect(view.onStateChange.mock.calls.length).toBe(calls)
  })

  test("keeps a failed later page in place while the total is unknown", async () => {
    const { TableMessage } = await import("./table")
    const view = await renderExample({
      data: [],
      state: { page: 3, perPage: 25 },
      pagination: { type: "pages", total: undefined },
      message: <TableMessage kind="error" title="Couldn’t load the sites" onRetry={() => {}} />,
    })

    // The page that failed keeps its error: the table neither moves the reader nor draws a band.
    expect(view.onStateChange).not.toHaveBeenCalled()
    expect(document.querySelector('[data-kind="error"]')).not.toBeNull()

    // Once a total arrives, a page past the end moves to the last one again.
    await view.rerenderWith({ pagination: { type: "pages", total: 30 } })
    expect(view.onStateChange.mock.lastCall).toEqual([{ page: 2, perPage: 25 }, { replace: true }])
  })

  test("draws a short table with no state to page, sort or search", async () => {
    const { DataTable } = await import("./data-table")
    const columns = await getColumns()
    const view = await render(
      <DataTable aria-label="Sites" columns={columns} data={SITES} getRowId={site => site.id} />,
    )
    mounted.push(view)

    expect(getRows()).toHaveLength(4)
    expect(document.body.textContent).not.toContain("Showing")
    // A sort would go nowhere, so a sortable column's head is plain text.
    expect(document.querySelectorAll("th button")).toHaveLength(0)
    expect(document.querySelectorAll("th")[1]?.hasAttribute("aria-sort")).toBe(false)
  })

  test("keeps the old rows dimmed while the next page loads, and skeleton rows on a first load", async () => {
    const view = await renderExample({ loading: true, pagination: { type: "pages", total: 100 } })

    expect(document.querySelector('[role="table"]')?.getAttribute("aria-busy")).toBe("true")
    expect(document.querySelector("tbody")?.className).toContain("opacity-50")
    expect(getRows()).toHaveLength(4)
    expect(getButton("Next page") as HTMLButtonElement).toHaveProperty("disabled", true)

    await view.rerenderWith({ data: [] })
    expect(getRows()).toHaveLength(5)
    for (const row of getRows()) expect(row.getAttribute("aria-hidden")).toBe("true")
  })

  test("shows its message in place of the rows once nothing matches", async () => {
    const { TableMessage } = await import("./table")
    await renderExample({
      data: [],
      pagination: { type: "pages", total: 0 },
      message: <TableMessage kind="filtered" title="No sites match" />,
    })

    expect(document.querySelector('[data-kind="filtered"]')?.textContent).toContain(
      "No sites match",
    )
    // An empty table has no band.
    expect(document.body.textContent).not.toContain("Showing")
  })

  test("selects rows, a Shift range included, skips the disabled ones and feeds the bar", async () => {
    const onDelete = mock((_rows: Site[]) => {})
    await renderExample({
      enableRowSelection: site => !site.archived,
      bulkActions: (rows, clear) => (
        <button
          type="button"
          onClick={() => {
            onDelete(rows)
            clear()
          }}
        >
          Delete
        </button>
      ),
    })

    expect(document.querySelector("section")).toBeNull()
    expect(getCheckbox("Select vercel.com").hasAttribute("data-disabled")).toBe(true)

    await click(getCheckbox("Select figma.com"))
    expect(document.querySelector("section")?.textContent).toContain("1 selected")

    // Shift selects the range from the last box pressed, past the archived row it cannot take.
    await shiftClick(getCheckbox("Select github.com"))
    expect(getCheckbox("Select linear.app").hasAttribute("data-checked")).toBe(true)
    expect(getCheckbox("Select vercel.com").hasAttribute("data-checked")).toBe(false)
    expect(getCheckbox("Select github.com").hasAttribute("data-checked")).toBe(true)
    expect(document.querySelector("section")?.textContent).toContain("3 selected")
    expect(getRows()[0]?.hasAttribute("data-selected")).toBe(true)
    expect(getCheckbox("Select all").hasAttribute("data-indeterminate")).toBe(true)

    await click(getButton("Delete"))
    expect(onDelete.mock.lastCall?.[0].map(site => site.id)).toEqual(["site_1", "site_2", "site_4"])
    expect(document.querySelector("section")).toBeNull()
  })

  test("starts a Shift range over after the selection is cleared", async () => {
    await renderExample({ enableRowSelection: true, bulkActions: () => null })

    await click(getCheckbox("Select figma.com"))
    await click(getButton("Clear selection"))
    expect(document.querySelector("section")).toBeNull()

    // With no anchor left, Shift selects the one row pressed, not the range from figma.com.
    await shiftClick(getCheckbox("Select github.com"))
    expect(document.querySelector("section")?.textContent).toContain("1 selected")
  })

  test("clears the selection when the rows change to another page", async () => {
    const view = await renderExample({ enableRowSelection: true, bulkActions: () => null })

    await click(getCheckbox("Select all"))
    expect(document.querySelector("section")?.textContent).toContain("4 selected")

    await view.rerenderWith({ state: { page: 2, perPage: 25 } })
    expect(document.querySelector("section")).toBeNull()
    expect(getCheckbox("Select figma.com").hasAttribute("data-checked")).toBe(false)
  })

  test("hides a column from the picker and remembers it for the table", async () => {
    const store = new Map<string, string>()
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    })

    try {
      let picker: ReactNode = null
      const view = await renderExample({
        storageKey: "sites",
        toolbar: ({ columnPicker }) => {
          picker = columnPicker
          return <div data-testid="toolbar">{columnPicker}</div>
        },
      })
      expect(picker).not.toBeNull()

      await click(getButton("Columns"))
      const items = [...document.querySelectorAll('[role="menuitemcheckbox"]')]
      // The name and the actions do not hide, so only the figures and the plan are listed.
      expect(items.map(item => item.textContent)).toEqual(["Visitors", "Plan"])
      await click(items[1] as HTMLElement)

      expect(document.querySelectorAll("th")).toHaveLength(3)
      expect(store.get("underpin:data-table:sites:columns")).toBe('{"plan":false}')
      await view.unmount()

      // A second visit reads the choice back.
      await renderExample({ storageKey: "sites" })
      expect([...document.querySelectorAll("th")].map(head => head.textContent)).toEqual([
        "Site",
        "Visitors",
        "Actions",
      ])
    } finally {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original })
    }
  })

  test("hands the toolbar a setter that sends a new search back to page 1", async () => {
    let setState: ((change: Partial<DataTableState>) => void) | undefined
    const view = await renderExample({
      state: { page: 4, perPage: 25 },
      pagination: { type: "pages", total: 200 },
      toolbar: context => {
        setState = context.setState
        return null
      },
    })

    setState?.({ search: "fig" })
    expect(view.onStateChange.mock.lastCall).toEqual([
      { page: 1, perPage: 25, search: "fig" },
      { replace: false },
    ])
    setState?.({ filters: { plan: ["pro"] } })
    expect(view.onStateChange.mock.lastCall).toEqual([
      {
        page: 1,
        perPage: 25,
        filters: { plan: ["pro"] },
      },
      { replace: false },
    ])
  })

  test("loads as it scrolls: skeleton rows while the next batch loads, then the end", async () => {
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver
    FakeObserver.instances = []

    try {
      const onLoadMore = mock(() => {})
      const view = await renderExample({
        state: {},
        size: "compact",
        pagination: { type: "infinite", hasMore: true, isLoadingMore: false, onLoadMore },
      })

      expect(document.body.textContent).toContain("4 rows")
      expect(document.body.textContent).not.toContain("Page")
      FakeObserver.instances.at(-1)?.reveal()
      expect(onLoadMore).toHaveBeenCalledTimes(1)

      await view.rerenderWith({
        pagination: { type: "infinite", hasMore: true, isLoadingMore: true, onLoadMore },
      })
      expect(getRows()).toHaveLength(7)
      expect(getRows().at(-1)?.className).toContain("h-8")
      expect(document.querySelector("output")?.textContent).toBe("Loading more…")

      await view.rerenderWith({
        pagination: {
          type: "infinite",
          hasMore: false,
          isLoadingMore: false,
          onLoadMore,
          count: "4 of 4 sites",
        },
      })
      expect(getRows()).toHaveLength(4)
      expect(document.body.textContent).toContain("4 of 4 sites")
      expect(document.querySelector("output")?.textContent).toBe("End of list")
      expect(await listAxeViolations()).toEqual([])
    } finally {
      globalThis.IntersectionObserver = original
    }
  })

  test("takes every label as a prop", async () => {
    await renderExample({
      enableRowSelection: true,
      pagination: { type: "pages", total: 100 },
      labels: {
        selectAll: "Alle auswählen",
        selectRow: name => `${name} auswählen`,
        pagination: {
          range: ({ from, to, total }) => (
            <>
              Zeige {from}–{to} von {total}
            </>
          ),
          pageOf: ({ page, pageCount }) => (
            <>
              Seite {page} von {pageCount}
            </>
          ),
          nextPage: "Nächste Seite",
        },
      },
    })

    expect(getCheckbox("Alle auswählen")).toBeTruthy()
    expect(getCheckbox("figma.com auswählen")).toBeTruthy()
    expect(document.body.textContent).toContain("Zeige 1–25 von 100")
    expect(document.body.textContent).toContain("Seite 1 von 4")
    expect(getButton("Nächste Seite")).toBeTruthy()
  })
})
