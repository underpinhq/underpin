import {
  type ColumnVisibilityState,
  columnVisibilityFeature,
  createColumnHelper,
  metaHelper,
  type RowData,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table"
import type { TableColumnPriority } from "../components/table"

/**
 * The model behind `DataTable`: its react-table features, the meta a column carries, and the
 * state the app owns. The package never reads the URL: an app keeps `DataTableState` in its
 * router's search params (TanStack Router, nuqs) and hands it back on every change.
 */

/** What a column tells the table about its own head and cells. */
export interface DataTableColumnMeta {
  /** Figures read from the end. */
  align?: "start" | "end"
  /** The column's grid track: `minmax(0,1fr)` (the default) for the name, `6rem` for a figure. */
  width?: string
  /** Where the column gives way as the table narrows: `medium` below 672px, `low` below 896px. */
  priority?: TableColumnPriority
  /**
   * Turns the column's name into a button that sorts by it. The first click sorts ascending, or
   * descending for `"descending"` (a figure, a date read newest first); the next flips it.
   */
  sortable?: boolean | "ascending" | "descending"
  /** Whether a skeleton row draws a stand-in here. Off for an actions column. */
  skeleton?: boolean
  /** The column's name in the column picker, for a column whose header is not a string. */
  label?: string
}

/** The react-table features every `DataTable` registers. */
export const DATA_TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnMeta: metaHelper<DataTableColumnMeta>(),
})

export type DataTableFeatures = typeof DATA_TABLE_FEATURES

/**
 * The column helper for a `DataTable` of `TData` rows. A column's `cell` returns one of the
 * table's cell parts (`TableCell`, `TableIdentityCell`, `TableNumberCell`…), which take the
 * column's `align` and `priority` from its meta.
 */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

export interface DataTableSort {
  /** The column's id. */
  id: string
  desc: boolean
}

/** What a table shows, owned by the app. */
export interface DataTableState {
  /** 1-based. Read by a paged table, left out by one that loads as it scrolls. */
  page?: number
  /** Rows on a page. Read by a paged table. */
  perPage?: number
  /** Left out while the server's own order applies, so no column shows an arrow. */
  sort?: DataTableSort
  search?: string
  /** The chosen values of each filtered field, by field. */
  filters?: Record<string, string[]>
}

/** The page size of a paged table whose state names none. */
export const DEFAULT_PER_PAGE = 25

function isSameSort(one: DataTableSort | undefined, other: DataTableSort | undefined) {
  return one?.id === other?.id && one?.desc === other?.desc
}

function isSameFilters(one: DataTableState["filters"], other: DataTableState["filters"]) {
  const keys = new Set([...Object.keys(one ?? {}), ...Object.keys(other ?? {})])

  return [...keys].every(key => {
    const left = one?.[key] ?? []
    const right = other?.[key] ?? []
    return left.length === right.length && left.every(value => right.includes(value))
  })
}

/**
 * The state after a change, under the paging rules: a new sort, search, filter or page size
 * starts over on page 1, since the page the reader was on no longer holds the same rows.
 */
export function changeDataTableState(
  state: DataTableState,
  change: Partial<DataTableState>,
): DataTableState {
  const next = { ...state, ...change }
  const restarts =
    ("sort" in change && !isSameSort(state.sort, change.sort)) ||
    ("search" in change && (state.search ?? "") !== (change.search ?? "")) ||
    ("filters" in change && !isSameFilters(state.filters, change.filters)) ||
    ("perPage" in change && state.perPage !== change.perPage)

  return restarts ? { ...next, page: 1 } : next
}

/** How many pages `total` rows fill. An empty table still has its one page. */
export function getPageCount(total: number, perPage: number) {
  return Math.max(1, Math.ceil(total / perPage))
}

/**
 * The page a table shows for the one its state asks for: page 1 for a page before it, the last
 * page for one past the end (a stale link, rows deleted since).
 */
export function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(1, Math.floor(page)), pageCount)
}

/**
 * A key that changes whenever the rows a table holds stop being the same set: a new page, sort,
 * search or filter. A selection covers one such set.
 */
export function formatRowSetKey({ page, perPage, sort, search, filters }: DataTableState) {
  // Sorted, so the same filters in another order make the same key, as `isSameFilters` reads them.
  const filterKey = Object.entries(filters ?? {})
    .filter(([, values]) => values.length > 0)
    .map(([field, values]) => [field, values.toSorted()])
    .toSorted(([one], [other]) => String(one).localeCompare(String(other)))

  return JSON.stringify([page, perPage, sort?.id, sort?.desc, search ?? "", filterKey])
}

function formatStorageKey(storageKey: string) {
  return `underpin:data-table:${storageKey}:columns`
}

/** The columns the reader hid on this table, saved in this browser. Empty when none are. */
export function readColumnVisibility(storageKey: string): ColumnVisibilityState {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(formatStorageKey(storageKey)) ?? "{}")
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {}

    return Object.fromEntries(
      Object.entries(stored).filter((entry): entry is [string, boolean] => entry[1] === false),
    )
  } catch {
    return {}
  }
}

/** Saves the columns the reader hid. A browser that blocks storage keeps them for the visit. */
export function writeColumnVisibility(storageKey: string, visibility: ColumnVisibilityState) {
  const hidden = Object.fromEntries(Object.entries(visibility).filter(([, shown]) => !shown))

  try {
    localStorage.setItem(formatStorageKey(storageKey), JSON.stringify(hidden))
  } catch {}
}
