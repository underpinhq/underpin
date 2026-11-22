import { describe, expect, test } from "bun:test"
import { createDataTableSearch } from "./data-table-search"
import type { DataTableState } from "./data-table-types"

const newestFirst = createDataTableSearch({
  sort: { id: "createdAt", desc: true },
  perPage: 50,
})

/** The params as a URL carries them: text only, the undefined ones left out. */
function toUrl(search: Record<string, unknown>) {
  const entries = Object.entries(search).flatMap(([key, value]) =>
    typeof value === "string" || typeof value === "number" ? [[key, `${value}`]] : [],
  )
  return Object.fromEntries(new URLSearchParams(entries))
}

describe("read", () => {
  test("defaults to the first page of the default sort", () => {
    expect(newestFirst.read({})).toEqual({
      page: 1,
      perPage: 50,
      sort: { id: "createdAt", desc: true },
      search: undefined,
      filters: undefined,
    })
  })

  test("reads the page, the column, the direction and the search", () => {
    const search = { page: 3, sort: "name", order: "asc", query: "acme" }
    expect(newestFirst.read(search)).toMatchObject({
      page: 3,
      sort: { id: "name", desc: false },
      search: "acme",
    })
  })

  test("reads raw text params, as nuqs and Next.js hand them over", () => {
    const table = createDataTableSearch({ perPageOptions: [25, 50] })
    expect(table.read({ page: "2", perPage: "50" })).toMatchObject({ page: 2, perPage: 50 })
  })

  test("reads a chosen column in the default direction when the URL names none", () => {
    expect(newestFirst.read({ sort: "name" }).sort).toEqual({ id: "name", desc: true })
  })

  test("leaves the sort out while neither the URL nor the default names one", () => {
    expect(createDataTableSearch().read({ order: "desc" }).sort).toBeUndefined()
  })

  test("drops what it cannot read", () => {
    expect(newestFirst.read({ page: "abc", order: "sideways", query: {} })).toMatchObject({
      page: 1,
      sort: { id: "createdAt", desc: true },
      search: undefined,
    })
  })
})

describe("write", () => {
  test("keeps the defaults out of the URL", () => {
    const state = { page: 1, perPage: 50, sort: { id: "createdAt", desc: true }, search: "" }
    expect(newestFirst.write(state)).toEqual({
      page: undefined,
      perPage: undefined,
      sort: undefined,
      order: undefined,
      query: undefined,
    })
  })

  test("writes what differs from the default", () => {
    const state = { page: 2, sort: { id: "name", desc: false }, search: "acme" }
    expect(newestFirst.write(state)).toMatchObject({
      page: 2,
      sort: "name",
      order: "asc",
      query: "acme",
    })
  })

  test("writes a flipped default column as the direction alone", () => {
    expect(newestFirst.write({ sort: { id: "createdAt", desc: false } })).toMatchObject({
      sort: undefined,
      order: "asc",
    })
  })

  test("writes a descending sort on a table with no default sort", () => {
    expect(createDataTableSearch().write({ sort: { id: "name", desc: true } })).toMatchObject({
      sort: "name",
      order: "desc",
    })
  })

  test("leaves a search of only spaces out of the URL", () => {
    expect(newestFirst.write({ search: "   " }).query).toBeUndefined()
  })

  test("writes only a page size the table offers", () => {
    const table = createDataTableSearch({ perPageOptions: [25, 50, 100], perPage: 25 })
    expect(table.write({ perPage: 100 }).perPage).toBe(100)
    expect(table.write({ perPage: 75 }).perPage).toBeUndefined()
    expect(table.write({ perPage: 25 }).perPage).toBeUndefined()
  })
})

describe("the round trip", () => {
  const states: DataTableState[] = [
    { page: 1, perPage: 50, sort: { id: "createdAt", desc: true } },
    { page: 4, perPage: 50, sort: { id: "createdAt", desc: false } },
    { page: 2, perPage: 50, sort: { id: "name", desc: false }, search: "acme" },
    { page: 1, perPage: 50, sort: { id: "name", desc: true }, search: "fig" },
  ]

  test("reads back every state it writes, through the URL's strings", () => {
    for (const state of states) {
      const url = toUrl(newestFirst.write(state))
      expect(newestFirst.read(newestFirst.schema.parse(url))).toMatchObject(state)
      expect(newestFirst.read(url)).toMatchObject(state)
    }
  })

  test("writes an empty URL for the default state", () => {
    expect(toUrl(newestFirst.write(newestFirst.read({})))).toEqual({})
  })
})

describe("schema", () => {
  test("reads a page from a number and from a string", () => {
    expect(newestFirst.schema.parse({ page: 3 }).page).toBe(3)
    expect(newestFirst.schema.parse({ page: "3" }).page).toBe(3)
  })

  test("drops what it cannot read rather than failing the route", () => {
    expect(
      newestFirst.schema.parse({ page: "abc", sort: [], order: "sideways", query: {} }),
    ).toEqual({
      page: undefined,
      perPage: undefined,
      sort: undefined,
      order: undefined,
      query: undefined,
    })
  })

  test("reads text that a router parsed as JSON as text", () => {
    expect(newestFirst.schema.parse({ query: 123, sort: 2024 })).toMatchObject({
      query: "123",
      sort: "2024",
    })
    expect(newestFirst.schema.parse({ query: true }).query).toBe("true")
    expect(newestFirst.schema.parse({ query: null }).query).toBeUndefined()
  })

  test("reads only the page sizes the table offers", () => {
    const table = createDataTableSearch({ perPageOptions: [25, 50, 100] })
    expect(table.schema.parse({ perPage: "100" }).perPage).toBe(100)
    expect(table.schema.parse({ perPage: 1000 }).perPage).toBeUndefined()
    expect(newestFirst.schema.parse({ perPage: 50 }).perPage).toBeUndefined()
  })

  test("extends with a table's own params", () => {
    const schema = newestFirst.schema.extend({ status: newestFirst.schema.shape.sort })
    expect(schema.parse({ page: 2, status: "failed" })).toMatchObject({ page: 2, status: "failed" })
  })
})

describe("keys", () => {
  const keys = { query: "search", page: "p", perPage: "size" }
  const table = createDataTableSearch({ keys, perPageOptions: [25, 50], perPage: 25 })

  test("reads each param under its new name", () => {
    const parsed = table.schema.parse({ search: "acme", p: 3, query: "ignored" })

    expect(parsed).toEqual({
      p: 3,
      size: undefined,
      sort: undefined,
      order: undefined,
      search: "acme",
    })
    expect(table.read(parsed)).toMatchObject({ page: 3, search: "acme" })
  })

  test("writes each param under its new name", () => {
    expect(table.write({ search: "acme", perPage: 50 })).toEqual({
      p: undefined,
      size: 50,
      sort: undefined,
      order: undefined,
      search: "acme",
    })
  })

  test("checks the page under its new name", () => {
    expect(table.hasUnreadablePage({ p: "0" })).toBe(true)
    expect(table.hasUnreadablePage({ page: "0" })).toBe(false)
  })
})

describe("hasUnreadablePage", () => {
  test("flags a page in the URL that the schema drops", () => {
    for (const page of [1, 0, "abc", "1"]) {
      expect(newestFirst.hasUnreadablePage({ page })).toBe(true)
    }
  })

  test("leaves a readable page and a URL without one alone", () => {
    expect(newestFirst.hasUnreadablePage({ page: 2 })).toBe(false)
    expect(newestFirst.hasUnreadablePage({ page: "2" })).toBe(false)
    expect(newestFirst.hasUnreadablePage({})).toBe(false)
  })
})

describe("getProps", () => {
  function track(table: ReturnType<typeof createDataTableSearch>, search: Record<string, unknown>) {
    const changes: [Record<string, unknown>, { replace: boolean }][] = []
    const props = table.getProps({
      search,
      onSearchChange: (next, navigation) => changes.push([next, navigation]),
    })
    return { ...props, changes }
  }

  test("adds a history entry for a new page", () => {
    const { state, onStateChange, changes } = track(newestFirst, { page: 2 })
    onStateChange({ ...state, page: 3 }, { replace: false })

    expect(changes).toEqual([
      [
        { page: 3, perPage: undefined, sort: undefined, order: undefined, query: undefined },
        { replace: false },
      ],
    ])
  })

  test("passes on a correction past the end as a replace", () => {
    const { state, onStateChange, changes } = track(newestFirst, { page: 9 })
    onStateChange({ ...state, page: 4 }, { replace: true })

    expect(changes.at(0)?.[1]).toEqual({ replace: true })
  })

  test("replaces the entry while the search changes", () => {
    const { state, onStateChange, changes } = track(newestFirst, { query: "ac" })
    onStateChange({ ...state, page: 1, search: "acm" }, { replace: false })

    expect(changes.at(0)).toEqual([
      { page: undefined, perPage: undefined, sort: undefined, order: undefined, query: "acm" },
      { replace: true },
    ])
  })

  describe("with page sizes and filters", () => {
    const table = createDataTableSearch({
      perPageOptions: [25, 50, 100],
      perPage: 25,
      readFilters: search => ({
        plan: typeof search.plan === "string" ? search.plan.split(",") : [],
      }),
      writeFilters: filters => ({
        plan: filters.plan?.length ? filters.plan.join(",") : undefined,
      }),
    })

    test("reads the page size and the filters from the URL", () => {
      expect(track(table, { perPage: "100", plan: "pro,team" }).state).toMatchObject({
        perPage: 100,
        filters: { plan: ["pro", "team"] },
      })
    })

    test("writes a picked page size and leaves the default and an unoffered one out", () => {
      const { state, onStateChange, changes } = track(table, {})
      for (const perPage of [100, 25, 75]) onStateChange({ ...state, perPage }, { replace: false })

      expect(changes.map(([change]) => change.perPage)).toEqual([100, undefined, undefined])
    })

    test("writes a picked filter and clears a removed one", () => {
      const { state, onStateChange, changes } = track(table, { plan: "pro" })
      onStateChange({ ...state, filters: { plan: ["pro", "team"] } }, { replace: false })
      onStateChange({ ...state, filters: { plan: [] } }, { replace: false })

      expect(changes.map(([change]) => change.plan)).toEqual(["pro,team", undefined])
    })

    test("reads back through the URL what it writes", () => {
      const { state, onStateChange, changes } = track(table, {})
      const next = { ...state, page: 2, perPage: 50, filters: { plan: ["team"] } }
      onStateChange(next, { replace: false })

      expect(track(table, toUrl(changes[0]?.[0] ?? {})).state).toMatchObject({
        page: 2,
        perPage: 50,
        filters: { plan: ["team"] },
      })
    })
  })
})

describe("with nuqs", () => {
  const table = createDataTableSearch({
    sort: { id: "createdAt", desc: true },
    perPageOptions: [25, 50],
    perPage: 25,
    clearValue: null,
  })
  // `useQueryStates` reports every absent key as null.
  const empty = { page: null, perPage: null, sort: null, order: null, query: null }

  test("reads an absent key as the default", () => {
    expect(table.read(empty)).toEqual({
      page: 1,
      perPage: 25,
      sort: { id: "createdAt", desc: true },
      search: undefined,
      filters: undefined,
    })
    expect(table.read({ ...empty, page: 3, query: "acme" })).toMatchObject({
      page: 3,
      search: "acme",
    })
  })

  test("never flags an absent page", () => {
    expect(table.hasUnreadablePage(empty)).toBe(false)
    expect(table.hasUnreadablePage({ ...empty, page: "0" })).toBe(true)
  })

  test("clears a default param with null, which nuqs removes", () => {
    expect(table.write({ page: 1, search: "" })).toEqual(empty)
    expect(table.write({ page: 2, search: "acme" })).toMatchObject({ page: 2, query: "acme" })
  })

  test("clears an empty filter with null too", () => {
    const filtered = createDataTableSearch({
      clearValue: null,
      writeFilters: filters => ({
        plan: filters.plan?.length ? filters.plan.join(",") : undefined,
      }),
    })
    expect(filtered.write({ filters: { plan: [] } }).plan).toBeNull()
  })
})

describe("createDataTableSearch", () => {
  test("refuses two fields under one param name", () => {
    expect(() => createDataTableSearch({ keys: { query: "page" } })).toThrow(
      'Two table fields share the search param "page"',
    )
  })
})
