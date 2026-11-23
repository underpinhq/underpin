import { afterEach, describe, expect, mock, test } from "bun:test"
import type { DataTableChangeOptions } from "../lib/data-table-types"
import { click, listAxeViolations, registerDom, render } from "../test-dom"
import type { PagedDataTableProps, PagedDataTableQuery } from "./paged-data-table"

registerDom()

const mounted: { unmount: () => Promise<void> }[] = []

afterEach(async () => {
  for (const view of mounted.splice(0)) await view.unmount()
})

interface Account {
  id: string
  name: string
}

const ACCOUNTS: Account[] = [
  { id: "user_1", name: "Ada" },
  { id: "user_2", name: "Grace" },
]

type View = "all" | "staff" | "archived"

/** A query that has its page, which a test overrides part of. */
function createQuery(query: Partial<PagedDataTableQuery<Account>> = {}) {
  return {
    data: { items: ACCOUNTS, total: 60 },
    error: null,
    isPending: false,
    isPlaceholderData: false,
    refetch: mock(() => {}),
    ...query,
  }
}

type ExampleProps = Partial<PagedDataTableProps<Account, View>>

async function renderExample(props: ExampleProps = {}) {
  const { createDataTableColumnHelper } = await import("../lib/data-table-state")
  const { createDataTableSearch } = await import("../lib/data-table-search")
  const { PagedDataTable } = await import("./paged-data-table")
  const { TableCell } = await import("./table")
  const helper = createDataTableColumnHelper<Account>()
  const columns = helper.columns([
    helper.accessor("name", {
      header: "Name",
      cell: ({ getValue }) => <TableCell>{getValue()}</TableCell>,
    }),
  ])
  const onSearchChange = mock(
    (_search: Record<string, unknown>, _options: DataTableChangeOptions) => {},
  )

  const view = await render(
    <PagedDataTable<Account, View>
      aria-label="Accounts"
      columns={columns}
      getRowId={account => account.id}
      table={createDataTableSearch({ perPage: 25 })}
      search={{}}
      query={createQuery()}
      empty={{ icon: <svg />, title: "No accounts yet" }}
      onSearchChange={onSearchChange}
      {...props}
    />,
  )
  mounted.push(view)

  return { onSearchChange }
}

function getButton(name: string) {
  const button = [...document.querySelectorAll("button")].find(
    element => element.textContent?.trim() === name,
  )
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

function getTab(name: string) {
  const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(element =>
    element.textContent?.startsWith(name),
  )
  if (!tab) throw new Error(`No tab named ${name}`)
  return tab
}

function readMessage() {
  return document.querySelector("tbody")?.textContent ?? ""
}

const VIEWS = {
  param: "status",
  label: "Account views",
  options: [
    { value: "all", label: "All" },
    { value: "staff", label: "Staff", tone: "danger" },
    { value: "archived", label: "Archived", empty: { title: "Nothing archived" } },
  ],
  counts: { all: 1204, staff: 2, archived: 0 },
} as const

describe("PagedDataTable", () => {
  test("draws the query's rows and the paged footer from its total", async () => {
    await renderExample({ format: value => `#${value}` })

    expect([...document.querySelectorAll("tbody > tr")].map(row => row.textContent)).toEqual([
      "Ada",
      "Grace",
    ])
    expect(document.body.textContent).toContain("of #60")
    expect(await listAxeViolations()).toEqual([])
  })

  test("draws skeleton rows on a first load and dims the old rows on placeholder data", async () => {
    await renderExample({ query: createQuery({ data: undefined, isPending: true }) })
    expect(document.querySelector('[role="table"]')?.getAttribute("aria-busy")).toBe("true")
    expect(readMessage()).not.toContain("No accounts yet")
  })

  test("shows the error with a retry that refetches", async () => {
    const query = createQuery({ data: undefined, error: new Error("Down") })
    await renderExample({ query, error: { description: "The server is down." } })

    expect(readMessage()).toContain("Couldn’t load this data")
    expect(readMessage()).toContain("The server is down.")
    await click(getButton("Try again"))
    expect(query.refetch).toHaveBeenCalledTimes(1)
  })

  test("says the table is empty when nothing narrows it", async () => {
    await renderExample({ query: createQuery({ data: { items: [], total: 0 } }) })
    expect(readMessage()).toContain("No accounts yet")
  })

  test("says a search matches nothing, with the hint, and clears it back to page 1", async () => {
    const { onSearchChange } = await renderExample({
      search: { query: "zed", page: 3, sort: "name" },
      query: createQuery({ data: { items: [], total: 0 } }),
      filtered: { title: "No account matches", hint: "Try a name or an email." },
    })

    expect(readMessage()).toContain("No account matches")
    expect(readMessage()).toContain("Try a name or an email.")
    await click(getButton("Clear filters"))
    expect(onSearchChange).toHaveBeenCalledWith(
      { page: undefined, perPage: undefined, sort: "name", order: undefined, query: undefined },
      { replace: false },
    )
  })

  test("treats a view with no empty message as a filter, and clears it to the first view", async () => {
    const { onSearchChange } = await renderExample({
      search: { status: "staff" },
      query: createQuery({ data: { items: [], total: 0 } }),
      views: VIEWS,
      filtered: { title: "No account matches", hint: "Unused", clearLabel: "Show all" },
    })

    expect(readMessage()).toContain("No account matches")
    expect(readMessage()).not.toContain("Unused")
    await click(getButton("Show all"))
    expect(onSearchChange.mock.calls[0]?.[0]).toMatchObject({ status: undefined, query: undefined })
  })

  test("treats a view that narrows as a filter, even with an empty message of its own", async () => {
    const { onSearchChange } = await renderExample({
      search: { status: "archived" },
      query: createQuery({ data: { items: [], total: 0 } }),
      views: {
        ...VIEWS,
        options: [VIEWS.options[0], { ...VIEWS.options[2], narrows: true }],
      },
    })

    expect(readMessage()).toContain("Nothing matches")
    await click(getButton("Clear filters"))
    expect(onSearchChange.mock.calls[0]?.[0]).toMatchObject({ status: undefined })
  })

  test("keeps a view that does not narrow when it clears a search", async () => {
    const { onSearchChange } = await renderExample({
      search: { status: "staff", query: "zed" },
      query: createQuery({ data: { items: [], total: 0 } }),
      views: {
        ...VIEWS,
        options: [VIEWS.options[0], { ...VIEWS.options[1], narrows: false }],
      },
    })

    await click(getButton("Clear filters"))
    const written = onSearchChange.mock.calls[0]?.[0] ?? {}
    expect(written).toMatchObject({ query: undefined })
    expect("status" in written).toBe(false)
  })

  test("says a view that does not narrow is empty, with no empty message of its own", async () => {
    await renderExample({
      search: { status: "staff" },
      query: createQuery({ data: { items: [], total: 0 } }),
      views: {
        ...VIEWS,
        options: [VIEWS.options[0], { ...VIEWS.options[1], narrows: false }],
      },
    })

    expect(readMessage()).toContain("No accounts yet")
  })

  test("says a view with its own empty message is empty, keeping the table's glyph", async () => {
    await renderExample({
      search: { status: "archived" },
      query: createQuery({ data: { items: [], total: 0 } }),
      views: VIEWS,
    })

    expect(readMessage()).toContain("Nothing archived")
    expect(document.querySelector("tbody svg")).not.toBeNull()
  })

  test("draws the views with their counts, and a new view goes back to page 1", async () => {
    const { onSearchChange } = await renderExample({
      search: { page: 2 },
      views: VIEWS,
      format: value => `#${value}`,
    })

    expect(getTab("All").getAttribute("aria-selected")).toBe("true")
    expect(getTab("All").textContent).toBe("All#1204")
    await click(getTab("Staff"))
    expect(onSearchChange.mock.calls[0]?.[0]).toMatchObject({ page: undefined, status: "staff" })
  })

  test("reads an unknown view as the first", async () => {
    await renderExample({ search: { status: "gone" }, views: VIEWS })
    expect(getTab("All").getAttribute("aria-selected")).toBe("true")
  })

  test("writes the first view as no param", async () => {
    const { onSearchChange } = await renderExample({ search: { status: "staff" }, views: VIEWS })

    await click(getTab("All"))
    expect(onSearchChange.mock.calls[0]?.[0]).toMatchObject({ status: undefined })
    expect("status" in (onSearchChange.mock.calls[0]?.[0] ?? {})).toBe(true)
  })

  test("clears a param with the table's own clear value, as nuqs needs", async () => {
    const { createDataTableSearch } = await import("../lib/data-table-search")
    const { onSearchChange } = await renderExample({
      table: createDataTableSearch({ keys: { query: "q" }, clearValue: null }),
      search: { q: "zed", status: "staff" },
      query: createQuery({ data: { items: [], total: 0 } }),
      views: VIEWS,
    })

    await click(getButton("Clear filters"))
    expect(onSearchChange.mock.calls[0]?.[0]).toMatchObject({ q: null, page: null, status: null })
  })

  test("clears the table's filters", async () => {
    const { createDataTableSearch } = await import("../lib/data-table-search")
    const { onSearchChange } = await renderExample({
      table: createDataTableSearch({
        readFilters: search => ({ plan: typeof search.plan === "string" ? [search.plan] : [] }),
        writeFilters: filters => ({ plan: filters.plan?.[0] }),
      }),
      search: { plan: "pro" },
      query: createQuery({ data: { items: [], total: 0 } }),
    })

    expect(readMessage()).toContain("Nothing matches")
    await click(getButton("Clear filters"))
    expect(onSearchChange.mock.calls[0]?.[0]).toMatchObject({ plan: undefined })
  })
})
