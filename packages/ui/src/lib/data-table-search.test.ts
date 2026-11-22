import { describe, expect, test } from "bun:test"
import {
  createDataTableSearchSchema,
  dataTableSearchSchema,
  getDataTableSearchProps,
  hasUnreadablePage,
  readDataTableSearch,
  writeDataTableSearch,
} from "./data-table-search"
import type { DataTableState } from "./data-table-types"

const NEWEST_FIRST = { sort: { id: "createdAt", desc: true }, perPage: 50 }

describe("readDataTableSearch", () => {
  test("defaults to the first page of the default sort", () => {
    expect(readDataTableSearch({}, NEWEST_FIRST)).toEqual({
      page: 1,
      perPage: 50,
      sort: { id: "createdAt", desc: true },
      search: undefined,
    })
  })

  test("reads the page, the column, the direction and the search", () => {
    const search = { page: 3, sort: "name", order: "asc" as const, query: "acme" }
    expect(readDataTableSearch(search, NEWEST_FIRST)).toEqual({
      page: 3,
      perPage: 50,
      sort: { id: "name", desc: false },
      search: "acme",
    })
  })

  test("reads a chosen column in the default direction when the URL names none", () => {
    expect(readDataTableSearch({ sort: "name" }, NEWEST_FIRST).sort).toEqual({
      id: "name",
      desc: true,
    })
  })

  test("leaves the sort out while neither the URL nor the default names one", () => {
    expect(readDataTableSearch({ order: "desc" }).sort).toBeUndefined()
  })
})

describe("writeDataTableSearch", () => {
  test("keeps the defaults out of the URL", () => {
    const state = { page: 1, sort: { id: "createdAt", desc: true }, search: "" }
    expect(writeDataTableSearch(state, NEWEST_FIRST)).toEqual({
      page: undefined,
      perPage: undefined,
      sort: undefined,
      order: undefined,
      query: undefined,
    })
  })

  test("writes what differs from the default", () => {
    const state = { page: 2, sort: { id: "name", desc: false }, search: "acme" }
    expect(writeDataTableSearch(state, NEWEST_FIRST)).toEqual({
      page: 2,
      perPage: undefined,
      sort: "name",
      order: "asc",
      query: "acme",
    })
  })

  test("writes a flipped default column as the direction alone", () => {
    const state = { sort: { id: "createdAt", desc: false } }
    expect(writeDataTableSearch(state, NEWEST_FIRST)).toMatchObject({
      sort: undefined,
      order: "asc",
    })
  })

  test("writes a descending sort on a table with no default sort", () => {
    expect(writeDataTableSearch({ sort: { id: "name", desc: true } })).toMatchObject({
      sort: "name",
      order: "desc",
    })
  })

  test("leaves a search of only spaces out of the URL", () => {
    expect(writeDataTableSearch({ search: "   " }).query).toBeUndefined()
  })
})

describe("the round trip", () => {
  const states: DataTableState[] = [
    { page: 1, perPage: 50, sort: { id: "createdAt", desc: true }, search: undefined },
    { page: 4, perPage: 50, sort: { id: "createdAt", desc: false }, search: undefined },
    { page: 2, perPage: 50, sort: { id: "name", desc: false }, search: "acme" },
    { page: 1, perPage: 50, sort: { id: "name", desc: true }, search: "fig" },
  ]

  test("reads back every state it writes, through the URL's strings", () => {
    for (const state of states) {
      const written = writeDataTableSearch(state, NEWEST_FIRST)
      const url = new URLSearchParams(
        Object.entries(written).flatMap(([key, value]) =>
          typeof value === "string" || typeof value === "number" ? [[key, `${value}`]] : [],
        ),
      )
      const parsed = dataTableSearchSchema.parse(Object.fromEntries(url))

      expect(readDataTableSearch(parsed, NEWEST_FIRST)).toEqual(state)
    }
  })

  test("writes an empty URL for the default state", () => {
    const written = writeDataTableSearch(readDataTableSearch({}, NEWEST_FIRST), NEWEST_FIRST)
    expect(Object.values(written).every(value => value === undefined)).toBe(true)
  })
})

describe("dataTableSearchSchema", () => {
  test("reads a page from a number and from a string", () => {
    expect(dataTableSearchSchema.parse({ page: 3 }).page).toBe(3)
    expect(dataTableSearchSchema.parse({ page: "3" }).page).toBe(3)
  })

  test("drops what it cannot read rather than failing the route", () => {
    expect(
      dataTableSearchSchema.parse({ page: "abc", sort: [], order: "sideways", query: {} }),
    ).toEqual({
      page: undefined,
      perPage: undefined,
      sort: undefined,
      order: undefined,
      query: undefined,
    })
  })

  test("reads a search or a column that a router parsed as a number as text", () => {
    expect(dataTableSearchSchema.parse({ query: 123, sort: 2024 })).toMatchObject({
      query: "123",
      sort: "2024",
    })
  })

  test("reads only the page sizes the table offers", () => {
    const schema = createDataTableSearchSchema({ perPageOptions: [25, 50, 100] })
    expect(schema.parse({ perPage: "100" }).perPage).toBe(100)
    expect(schema.parse({ perPage: 1000 }).perPage).toBeUndefined()
    expect(dataTableSearchSchema.parse({ perPage: 100 }).perPage).toBeUndefined()
  })

  test("reads its params under the names the table gives them", () => {
    const schema = createDataTableSearchSchema({ keys: { query: "search", page: "p" } })
    const parsed = schema.parse({ search: "acme", p: 3, query: "ignored" })

    expect(parsed).toEqual({
      p: 3,
      perPage: undefined,
      sort: undefined,
      order: undefined,
      search: "acme",
    })
    expect(readDataTableSearch(parsed, { keys: { query: "search", page: "p" } })).toMatchObject({
      page: 3,
      search: "acme",
    })
  })

  test("extends with a table's own params", () => {
    const schema = dataTableSearchSchema.extend({ status: dataTableSearchSchema.shape.sort })
    expect(schema.parse({ page: 2, status: "failed" })).toMatchObject({ page: 2, status: "failed" })
  })
})

describe("hasUnreadablePage", () => {
  test("flags a page in the URL that the schema dropped", () => {
    for (const page of [1, 0, "abc"]) {
      const raw = { page }
      expect(hasUnreadablePage(raw, dataTableSearchSchema.parse(raw))).toBe(true)
    }
  })

  test("leaves a readable page and a URL without one alone", () => {
    expect(hasUnreadablePage({ page: 2 }, { page: 2 })).toBe(false)
    expect(hasUnreadablePage({}, {})).toBe(false)
  })
})

describe("getDataTableSearchProps", () => {
  function track(search: Parameters<typeof getDataTableSearchProps>[0]["search"]) {
    const changes: unknown[] = []
    const props = getDataTableSearchProps({
      ...NEWEST_FIRST,
      search,
      onSearchChange: (next, navigation) => changes.push([next, navigation]),
    })
    return { ...props, changes }
  }

  test("adds a history entry for a new page", () => {
    const { state, onStateChange, changes } = track({ page: 2 })
    onStateChange({ ...state, page: 3 }, { replace: false })

    expect(changes).toEqual([
      [
        { page: 3, perPage: undefined, sort: undefined, order: undefined, query: undefined },
        { replace: false },
      ],
    ])
  })

  test("passes on a correction past the end as a replace", () => {
    const { state, onStateChange, changes } = track({ page: 9 })
    onStateChange({ ...state, page: 4 }, { replace: true })

    expect(changes.at(0)).toEqual([
      { page: 4, perPage: undefined, sort: undefined, order: undefined, query: undefined },
      { replace: true },
    ])
  })

  test("replaces the entry while the search changes", () => {
    const { state, onStateChange, changes } = track({ query: "ac" })
    onStateChange({ ...state, page: 1, search: "acm" }, { replace: false })

    expect(changes.at(0)).toEqual([
      { page: undefined, perPage: undefined, sort: undefined, order: undefined, query: "acm" },
      { replace: true },
    ])
  })
})

describe("getDataTableSearchProps with page sizes and filters", () => {
  const schema = createDataTableSearchSchema({ perPageOptions: [25, 50, 100] }).extend({
    plan: dataTableSearchSchema.shape.query,
  })
  const options = {
    perPage: 25,
    readFilters: (search: Record<string, unknown>) => ({
      plan: typeof search.plan === "string" ? search.plan.split(",") : [],
    }),
    writeFilters: (filters: Record<string, string[]>) => ({
      plan: filters.plan?.length ? filters.plan.join(",") : undefined,
    }),
  }

  function track(raw: Record<string, unknown>) {
    const changes: Record<string, unknown>[] = []
    const props = getDataTableSearchProps({
      ...options,
      search: schema.parse(raw),
      onSearchChange: next => changes.push(next),
    })
    return { ...props, changes }
  }

  test("reads the page size and the filters from the URL", () => {
    expect(track({ perPage: 100, plan: "pro,team" }).state).toMatchObject({
      perPage: 100,
      filters: { plan: ["pro", "team"] },
    })
  })

  test("writes a picked page size and leaves the default out", () => {
    const { state, onStateChange, changes } = track({})
    onStateChange({ ...state, perPage: 100 }, { replace: false })
    onStateChange({ ...state, perPage: 25 }, { replace: false })

    expect(changes.map(change => change.perPage)).toEqual([100, undefined])
  })

  test("writes a picked filter and clears a removed one", () => {
    const { state, onStateChange, changes } = track({ plan: "pro" })
    onStateChange({ ...state, filters: { plan: ["pro", "team"] } }, { replace: false })
    onStateChange({ ...state, filters: { plan: [] } }, { replace: false })

    expect(changes.map(change => change.plan)).toEqual(["pro,team", undefined])
  })

  test("reads back through the URL what it writes", () => {
    const { state, onStateChange, changes } = track({})
    onStateChange(
      { ...state, page: 2, perPage: 50, filters: { plan: ["team"] } },
      { replace: false },
    )
    const next = track(
      Object.fromEntries(
        Object.entries(changes[0] ?? {}).filter(([, value]) => value !== undefined),
      ),
    )

    expect(next.state).toMatchObject({ page: 2, perPage: 50, filters: { plan: ["team"] } })
  })
})

describe("writeDataTableSearch with renamed keys", () => {
  test("writes each param under its new name", () => {
    const keys = { query: "search", perPage: "size" }
    expect(writeDataTableSearch({ search: "acme", perPage: 50 }, { keys, perPage: 25 })).toEqual({
      page: undefined,
      size: 50,
      sort: undefined,
      order: undefined,
      search: "acme",
    })
  })
})
