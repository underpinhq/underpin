"use client"

import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import type { ComponentProps } from "react"
import { type DataTableSearchOptions, getDataTableSearchProps } from "../lib/data-table-search"
import { parseHref } from "../lib/href"

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

interface UseDataTableRouteOptions extends DataTableSearchOptions {
  /** The route's search params, from `Route.useSearch()`. */
  search: Record<string, unknown>
}

/**
 * The `state` and `onStateChange` that keep a `DataTable` in the current route's search
 * params. Each change merges into the params the route already holds, so a view or filter of
 * the page's own stays put. A new page or sort adds a history entry; a corrected page and a
 * search typed a key at a time replace it.
 */
export function useDataTableRoute({ search, ...options }: UseDataTableRouteOptions) {
  const navigate = useNavigate()

  return getDataTableSearchProps({
    ...options,
    search,
    onSearchChange: (next, { replace }) =>
      void navigate({
        to: ".",
        search: (previous: Record<string, unknown>) => ({ ...previous, ...next }),
        replace,
      }),
  })
}
