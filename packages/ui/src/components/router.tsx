"use client"

import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import type { RowData } from "@tanstack/react-table"
import type { ComponentProps } from "react"
import type {
  DataTableSearch,
  DataTableSearchKeys,
  DataTableSearchProps,
} from "../lib/data-table-search"
import type { DataTableChangeOptions } from "../lib/data-table-types"
import { parseHref } from "../lib/href"
import { PagedDataTable, type PagedDataTableProps } from "./paged-data-table"

/**
 * The TanStack Router parts of the table system, kept apart so an app on another router never
 * installs this one. `@tanstack/react-router` is an optional peer.
 */

/**
 * A `DataTable` row link through the router, for its `renderRowLink`: the row opens its `href`
 * in place and preloads it on intent, as every other link in the app does. The href goes in
 * split into path, search and hash, since `to` takes a path alone and a whole href with a
 * query string matches no route to preload.
 */
export function RouterRowLink({ href = "", ...props }: ComponentProps<"a">) {
  const router = useRouter()
  const { pathname, search, hash } = parseHref(href)

  return <Link {...props} to={pathname} search={router.options.parseSearch(search)} hash={hash} />
}

/**
 * Merges changed search params into the current route's, so a param the change leaves out (a
 * view or a filter of the page's own) stays put.
 */
function useMergeSearch() {
  const navigate = useNavigate()

  return (next: Record<string, unknown>, { replace }: DataTableChangeOptions) =>
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({ ...previous, ...next }),
      replace,
    })
}

/**
 * The `state` and `onStateChange` that keep a `DataTable` in the current route's search
 * params, for a table described by `createDataTableSearch`. Each change merges into the params
 * the route already holds, so a view or filter of the page's own stays put. A new page or sort
 * adds a history entry; a corrected page and a search typed a key at a time replace it. The
 * hook reads only the table's `getProps`, so a table with renamed params needs no type argument.
 */
export function useDataTableRoute<Keys extends DataTableSearchKeys = {}>(
  table: Pick<DataTableSearch<Keys>, "getProps">,
  search: Record<string, unknown>,
): DataTableSearchProps {
  const onSearchChange = useMergeSearch()

  return table.getProps({ search, onSearchChange })
}

export type RouterPagedDataTableProps<TData extends RowData, Value extends string = string> = Omit<
  PagedDataTableProps<TData, Value>,
  "onSearchChange"
>

/**
 * A `PagedDataTable` kept in the current route's search params, whose rows open through the
 * router. Each change merges into the params the route already holds.
 */
export function RouterPagedDataTable<TData extends RowData, Value extends string = string>(
  props: RouterPagedDataTableProps<TData, Value>,
) {
  const onSearchChange = useMergeSearch()

  return (
    <PagedDataTable renderRowLink={<RouterRowLink />} onSearchChange={onSearchChange} {...props} />
  )
}
