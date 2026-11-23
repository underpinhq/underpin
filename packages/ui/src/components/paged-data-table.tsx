"use client"

import type { RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"
import type { DataTableSearch } from "../lib/data-table-search"
import type { DataTableChangeOptions, DataTableState } from "../lib/data-table-types"
import { SearchIcon } from "../lib/icons"
import { Button } from "./button"
import { DataTable, type DataTableProps } from "./data-table"
import { TableErrorState } from "./error-state"
import { TableMessage } from "./table"
import { Tabs, TabsCount, TabsList, TabsTrigger } from "./tabs"

/**
 * A `DataTable` bound to the URL and to the query of one page: the router-free core. The
 * TanStack Router binding, `RouterPagedDataTable`, lives in `@underpin/ui/router`; a Next.js
 * app hands nuqs's values and setter to this one.
 */

export interface DataTableView<Value extends string = string> {
  value: Value
  label: ReactNode
  /** Colours the count while it is above zero: a view of work that waits, or of failures. */
  tone?: "warning" | "danger"
}

export interface DataTableViewsProps<Value extends string> {
  /** Names the row of tabs for a screen reader. */
  label: string
  views: readonly DataTableView<Value>[]
  /** The rows each view holds. Left out while they load, and a view left out shows no count. */
  counts?: Partial<Record<Value, number>>
  value: Value
  onValueChange: (value: Value) => void
  /** Formats each count in the reader's locale. */
  format?: (value: number) => string
}

/** The view tabs above a table, each with the count of rows it holds. */
export function DataTableViews<Value extends string>({
  label,
  views,
  counts,
  value,
  onValueChange,
  format = String,
}: DataTableViewsProps<Value>) {
  return (
    <Tabs value={value} onValueChange={next => onValueChange(next as Value)}>
      <TabsList variant="underline" aria-label={label}>
        {views.map(view => {
          const count = counts?.[view.value]

          return (
            <TabsTrigger key={view.value} value={view.value}>
              {view.label}
              {count !== undefined && (
                <TabsCount tone={count > 0 ? view.tone : undefined}>{format(count)}</TabsCount>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

/**
 * What the table reads from the query of one page. A TanStack Query result fits as it is, for
 * an API that answers `{ items, total }`; another shape maps onto it with the query's `select`.
 */
export interface PagedDataTableQuery<TData> {
  /** This page's rows, and how many match across every page. */
  data?: { items: TData[]; total: number }
  error: unknown
  isPending: boolean
  /** True while a page's rows stand in for the next one, which a dimmed body shows. */
  isPlaceholderData: boolean
  refetch: () => unknown
}

/** What a table with nothing in it says, and its glyph and create action. */
export interface PagedDataTableEmpty {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export interface PagedDataTableView<Value extends string = string> extends DataTableView<Value> {
  /** The parts of the empty message this view says instead of the table's own. */
  empty?: Partial<PagedDataTableEmpty>
  /**
   * The view is a filter over the first view ("Staff" within "All"): with no rows it shows the
   * filtered message, and "Clear filters" returns to the first view. False makes it a list of
   * its own ("Churned" beside "Active"): with no rows it shows its empty message, and "Clear
   * filters" keeps it. Defaults to true for a view with no `empty` of its own. The first view
   * never narrows.
   */
  narrows?: boolean
}

export interface PagedDataTableViews<Value extends string = string> {
  /** The search param that holds the view. The first view is the default and stays out of it. */
  param: string
  /** Names the row of tabs for a screen reader. */
  label: string
  options: readonly PagedDataTableView<Value>[]
  /** The rows each view holds under the current search. Left out while they load. */
  counts?: Partial<Record<Value, number>>
}

/** What a narrowed table with no rows says. */
export interface PagedDataTableFiltered {
  /** Defaults to "Nothing matches". */
  title?: ReactNode
  description?: ReactNode
  /** What to search by ("Try a name or an email"), in place of the description after a search. */
  hint?: ReactNode
  /** The button that clears the search, the filters and a narrowing view. */
  clearLabel?: ReactNode
}

/** What a table whose page failed says, with its retry. */
export interface PagedDataTableError {
  /** Defaults to "Couldn’t load this data". */
  title?: ReactNode
  description?: ReactNode
  retryLabel?: ReactNode
}

export interface PagedDataTableProps<
  TData extends RowData,
  Value extends string = string,
> extends Omit<
  DataTableProps<TData>,
  "data" | "pagination" | "loading" | "message" | "state" | "onStateChange"
> {
  /** The table's search params, from `createDataTableSearch`. */
  table: Pick<DataTableSearch, "getProps" | "write" | "clearValue">
  /** The route's search params: the table's, a view's and any of the page's own. */
  search: Record<string, unknown>
  /** Merges the changed params into the URL, adding a history entry unless `replace` is set. */
  onSearchChange: (search: Record<string, unknown>, options: DataTableChangeOptions) => void
  query: PagedDataTableQuery<TData>
  /** The view tabs above the toolbar, their value in the search param `param`. */
  views?: PagedDataTableViews<Value>
  empty: PagedDataTableEmpty
  filtered?: PagedDataTableFiltered
  error?: PagedDataTableError
}

/** The rows before a page arrives or after one fails, one array so the table's input stays stable. */
const NO_ROWS: never[] = []

const FILTERED_TITLE = "Nothing matches"
const CLEAR_LABEL = "Clear filters"

function hasFilters(filters: DataTableState["filters"]) {
  return Object.values(filters ?? {}).some(values => values.length > 0)
}

/** The chosen view: the one the param names, or the first when it names none the table offers. */
function findView<Value extends string>(
  views: PagedDataTableViews<Value> | undefined,
  search: Record<string, unknown>,
) {
  if (!views) return
  const value = search[views.param]
  return views.options.find(view => view.value === value) ?? views.options[0]
}

/**
 * A table the API pages, kept in the URL: the rows of one query, five skeleton rows on the
 * first load, the old rows dimmed while the next page loads, and the paged footer from the
 * query's total. In place of rows it says why there are none: the page failed (with a retry),
 * a search, a filter or a view matches nothing (with a button that clears them), or the table
 * is empty. View tabs, when given, sit above the toolbar with a count each; a new view goes
 * back to page 1.
 */
export function PagedDataTable<TData extends RowData, Value extends string = string>({
  table,
  search,
  onSearchChange,
  query,
  views,
  empty,
  filtered,
  error,
  toolbar,
  format,
  ...props
}: PagedDataTableProps<TData, Value>) {
  const tableProps = table.getProps({ search, onSearchChange })
  const { state } = tableProps
  const view = findView(views, search)
  const firstView = views?.options[0]

  const viewNarrows = view !== undefined && view !== firstView && (view.narrows ?? !view.empty)
  const searched = !!state.search?.trim()

  function writeView(value: Value | undefined) {
    if (!views) return {}
    return {
      [views.param]: value === undefined || value === firstView?.value ? table.clearValue : value,
    }
  }

  function changeView(value: Value) {
    onSearchChange(
      { ...table.write({ ...state, page: 1 }), ...writeView(value) },
      { replace: false },
    )
  }

  function clearFilters() {
    onSearchChange(
      {
        ...table.write({ ...state, page: 1, search: undefined, filters: {} }),
        ...(viewNarrows ? writeView(undefined) : {}),
      },
      { replace: false },
    )
  }

  function renderMessage() {
    if (query.error && !query.data) {
      return (
        <TableErrorState
          title={error?.title}
          description={error?.description}
          retryLabel={error?.retryLabel}
          onRetry={() => void query.refetch()}
        />
      )
    }

    if (searched || hasFilters(state.filters) || viewNarrows) {
      return (
        <TableMessage
          kind="filtered"
          // A search that finds nothing shows the search glyph, a filter or a view the funnel.
          icon={searched ? <SearchIcon /> : undefined}
          title={filtered?.title ?? FILTERED_TITLE}
          description={searched ? (filtered?.hint ?? filtered?.description) : filtered?.description}
          action={
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              {filtered?.clearLabel ?? CLEAR_LABEL}
            </Button>
          }
        />
      )
    }

    return <TableMessage kind="empty" {...empty} {...view?.empty} />
  }

  const tabs = views && view && (
    <DataTableViews
      label={views.label}
      views={views.options}
      counts={views.counts}
      value={view.value}
      format={format}
      onValueChange={changeView}
    />
  )

  return (
    <DataTable
      data={query.data?.items ?? NO_ROWS}
      pagination={{ type: "pages", total: query.data?.total }}
      loading={query.isPending || query.isPlaceholderData}
      message={renderMessage()}
      format={format}
      toolbar={
        tabs || toolbar
          ? context => (
              <>
                {tabs}
                {toolbar?.(context)}
              </>
            )
          : undefined
      }
      {...tableProps}
      {...props}
    />
  )
}
