import { describe, expect, test } from "bun:test"
import {
  changeDataTableState,
  clampPage,
  formatRowSetKey,
  getPageCount,
  readColumnVisibility,
  writeColumnVisibility,
} from "./data-table-state"

describe("changeDataTableState", () => {
  const state = {
    page: 3,
    perPage: 25,
    sort: { id: "createdAt", desc: true },
    search: "fig",
    filters: { plan: ["pro"] },
  }

  test("keeps the page for a page change", () => {
    expect(changeDataTableState(state, { page: 4 }).page).toBe(4)
  })

  test("goes back to page 1 for a new sort, search, filter or page size", () => {
    expect(changeDataTableState(state, { sort: { id: "name", desc: false } }).page).toBe(1)
    expect(changeDataTableState(state, { sort: undefined }).page).toBe(1)
    expect(changeDataTableState(state, { search: "figma" }).page).toBe(1)
    expect(changeDataTableState(state, { filters: { plan: ["pro", "team"] } }).page).toBe(1)
    expect(changeDataTableState(state, { filters: {} }).page).toBe(1)
    expect(changeDataTableState(state, { perPage: 50 }).page).toBe(1)
  })

  test("keeps the page when a change leaves the rows the same", () => {
    expect(changeDataTableState(state, { sort: { id: "createdAt", desc: true } }).page).toBe(3)
    expect(changeDataTableState(state, { search: "fig" }).page).toBe(3)
    // The same values in another order, and an empty list against none, are the same filter.
    expect(
      changeDataTableState(
        { ...state, filters: { plan: ["pro", "team"], status: [] } },
        { filters: { plan: ["team", "pro"] } },
      ).page,
    ).toBe(3)
    expect(changeDataTableState({ page: 2 }, { search: "" }).page).toBe(2)
  })
})

describe("paging", () => {
  test("counts the pages, with one for an empty table", () => {
    expect(getPageCount(0, 25)).toBe(1)
    expect(getPageCount(25, 25)).toBe(1)
    expect(getPageCount(26, 25)).toBe(2)
    expect(getPageCount(1204, 25)).toBe(49)
  })

  test("shows the last page for one past the end, and page 1 for one before it", () => {
    expect(clampPage(9, 4)).toBe(4)
    expect(clampPage(0, 4)).toBe(1)
    expect(clampPage(-2, 4)).toBe(1)
    expect(clampPage(2, 4)).toBe(2)
  })

  test("changes the row set key with the page, sort, search and filters only", () => {
    const key = formatRowSetKey({ page: 1, search: "a" })
    expect(formatRowSetKey({ page: 1, search: "a" })).toBe(key)
    expect(formatRowSetKey({ page: 2, search: "a" })).not.toBe(key)
    expect(formatRowSetKey({ page: 1, search: "b" })).not.toBe(key)
    expect(formatRowSetKey({ page: 1, search: "a", filters: { plan: ["pro"] } })).not.toBe(key)
    // The same filters in another order, or an empty one, leave the rows the same.
    expect(formatRowSetKey({ page: 1, filters: { plan: ["pro", "team"], status: ["live"] } })).toBe(
      formatRowSetKey({ page: 1, filters: { status: ["live"], plan: ["team", "pro"] } }),
    )
    expect(formatRowSetKey({ page: 1, search: "a", filters: { plan: [] } })).toBe(key)
  })
})

describe("column visibility storage", () => {
  test("saves the hidden columns of each table and reads them back", () => {
    const store = new Map<string, string>()
    const original = globalThis.localStorage
    globalThis.localStorage = {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
    } as Storage

    try {
      writeColumnVisibility("sites", { plan: false, visitors: true })
      expect(readColumnVisibility("sites")).toEqual({ plan: false })
      expect(readColumnVisibility("users")).toEqual({})

      // A value written by hand, or by another version, reads as nothing hidden.
      store.set("underpin:data-table:sites:columns", "[1,2]")
      expect(readColumnVisibility("sites")).toEqual({})
      store.set("underpin:data-table:sites:columns", "{not json")
      expect(readColumnVisibility("sites")).toEqual({})
    } finally {
      globalThis.localStorage = original
    }
  })

  test("reads nothing hidden and keeps working where storage is blocked", () => {
    const original = globalThis.localStorage
    globalThis.localStorage = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
    } as unknown as Storage

    try {
      expect(readColumnVisibility("sites")).toEqual({})
      expect(() => writeColumnVisibility("sites", { plan: false })).not.toThrow()
    } finally {
      globalThis.localStorage = original
    }
  })
})
