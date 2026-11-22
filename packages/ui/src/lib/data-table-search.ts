import { z } from "zod"
import type { DataTableChangeOptions, DataTableSort, DataTableState } from "./data-table-types"

/**
 * The bridge between a `DataTable`'s state and the URL's search params, with plain objects in
 * and out, so any router can carry it: `@underpin/ui/router` wires it to TanStack Router, and a
 * Next.js app hands the same objects to nuqs. One `createDataTableSearch` call holds the param
 * names, the page sizes and the defaults, so the schema, the read and the write never disagree.
 * The URL holds only what differs from the default: page 1, the default page size and sort, and
 * an empty search stay out of it.
 */

/** The table fields the URL carries, each under a param named after it unless `keys` renames it. */
type DataTableSearchField = "page" | "perPage" | "sort" | "order" | "query"

/** New names for the params, e.g. `{ query: "search" }` for a list whose links use `?search=`. */
export type DataTableSearchKeys = Partial<Record<DataTableSearchField, string>>

/** The name a field's param takes under `Keys`. */
type DataTableSearchKey<
  Keys extends DataTableSearchKeys,
  Field extends DataTableSearchField,
> = Keys[Field] extends string ? Keys[Field] : Field

/** A route's search params as the helpers take them: the table's, under any names, and more. */
type SearchParams = Record<string, unknown>

/**
 * A text param. A router that parses search params as JSON (TanStack Router's default) hands a
 * hand-typed `?query=123` or `?query=true` over as a number or a boolean, so each reads back as
 * text. Null is an absent param, as nuqs reports one, so a hand-typed `?query=null` reads as no
 * search. Such a parser also rewrites some text on the way in (`1e3` becomes `1000`); the links
 * the table writes come back exact, since the router quotes text that would parse as JSON.
 */
const textParam = z
  .preprocess(
    value => value ?? undefined,
    z
      .union([z.string(), z.number(), z.boolean()])
      .transform(value => String(value))
      .optional(),
  )
  .catch(undefined)

function createFieldShape(perPageOptions: readonly number[]) {
  return {
    page: z.coerce.number().int().min(2).optional().catch(undefined),
    perPage: z.coerce
      .number()
      .refine(value => perPageOptions.includes(value))
      .optional()
      .catch(undefined),
    sort: textParam,
    order: z.enum(["asc", "desc"]).optional().catch(undefined),
    query: textParam,
  }
}

type DataTableSearchShape<Keys extends DataTableSearchKeys> = {
  [Field in DataTableSearchField as DataTableSearchKey<Keys, Field>]: ReturnType<
    typeof createFieldShape
  >[Field]
}

export interface DataTableSearchOptions<Keys extends DataTableSearchKeys> {
  /** New names for the params. */
  keys?: Keys
  /** The page sizes the reader may pick. Left out, the URL carries no page size. */
  perPageOptions?: readonly number[]
  /** Rows on a page while the URL names no page size. */
  perPage?: number
  /** The sort while the URL names none. Left out, the server's own order applies. */
  sort?: DataTableSort
  /**
   * What `write` puts in a param to remove it from the URL: `undefined` (the default) for
   * TanStack Router, which drops an undefined param, and `null` for nuqs, which skips an
   * undefined one and clears a param only on `null`.
   */
  clearValue?: null
  /** The chosen values of each filtered field, read from the table's own params. */
  readFilters?: (search: SearchParams) => DataTableState["filters"]
  /**
   * The table's own params for its filters, every one of them present and undefined when it is
   * empty, so the write clears a filter the reader removed. An undefined value becomes
   * `clearValue`.
   */
  writeFilters?: (filters: NonNullable<DataTableState["filters"]>) => SearchParams
}

/** What `getProps` hands a `DataTable`. */
export interface DataTableSearchProps {
  state: DataTableState
  onStateChange: (state: DataTableState, options: DataTableChangeOptions) => void
}

export interface DataTableSearchPropsOptions {
  /** The route's search params. */
  search: SearchParams
  /** Writes the new search params to the URL. */
  onSearchChange: (search: SearchParams, navigation: DataTableChangeOptions) => void
}

/**
 * The direction the URL names, or the default sort's. A column the reader chose without a
 * direction reads in the default's direction too, so a written sort needs no order beside it.
 */
function isDescending(order: "asc" | "desc" | undefined, sort: DataTableSort | undefined) {
  if (order) return order === "desc"
  return sort?.desc ?? false
}

/**
 * A table's search params, with everything that shapes them given once:
 *
 * - `schema` reads them. Each one the URL leaves out, or names in a form the table cannot read,
 *   is the default, so a stale or edited link never fails the route. A number reads from a
 *   number or a string. A table's own params (a view, a facet filter) go in with
 *   `schema.extend()`.
 * - `read` turns search params, parsed or raw, into the table's state.
 * - `write` turns the state into search params, every key present and `clearValue` when it is
 *   the default, so merging the result into the current params clears them. A page size the
 *   table does not offer is never written.
 * - `hasUnreadablePage` says when the URL names a page the table cannot read (`?page=1`,
 *   `?page=0`, `?page=abc`), so the route redirects and the address shows what the table shows.
 * - `getProps` returns a `DataTable`'s `state` and `onStateChange`. A new page, page size, sort
 *   or filter adds a history entry, so Back returns to it. A page the table corrected past the
 *   end, and a search typed a key at a time, replace the entry instead.
 */
export function createDataTableSearch<const Keys extends DataTableSearchKeys = {}>({
  keys,
  perPageOptions = [],
  perPage: defaultPerPage,
  sort: defaultSort,
  clearValue,
  readFilters,
  writeFilters,
}: DataTableSearchOptions<Keys> = {}) {
  const fields = createFieldShape(perPageOptions)
  const fieldSchema = z.object(fields)

  function key(field: DataTableSearchField) {
    return keys?.[field] ?? field
  }

  const names = Object.keys(fields).map(field => key(field as DataTableSearchField))
  const repeated = names.find((name, index) => names.indexOf(name) !== index)
  if (repeated) throw new Error(`Two table fields share the search param "${repeated}"`)

  const schema = z.object(
    Object.fromEntries(
      Object.entries(fields).map(([field, value]) => [key(field as DataTableSearchField), value]),
    ) as DataTableSearchShape<Keys>,
  )

  function read(search: SearchParams): DataTableState {
    const fieldValues = fieldSchema.parse({
      page: search[key("page")],
      perPage: search[key("perPage")],
      sort: search[key("sort")],
      order: search[key("order")],
      query: search[key("query")],
    })
    const id = fieldValues.sort ?? defaultSort?.id

    return {
      page: fieldValues.page ?? 1,
      perPage: fieldValues.perPage ?? defaultPerPage,
      sort:
        id === undefined ? undefined : { id, desc: isDescending(fieldValues.order, defaultSort) },
      search: fieldValues.query,
      filters: readFilters?.(search),
    }
  }

  function write(state: DataTableState): SearchParams {
    const { page = 1, perPage, sort, search, filters } = state
    const defaultDesc = defaultSort?.desc ?? false
    const direction = sort?.desc ? "desc" : "asc"
    const offered = perPage !== undefined && perPageOptions.includes(perPage)
    const params: SearchParams = {
      [key("page")]: page > 1 ? page : undefined,
      [key("perPage")]: offered && perPage !== defaultPerPage ? perPage : undefined,
      [key("sort")]: sort && sort.id !== defaultSort?.id ? sort.id : undefined,
      [key("order")]: sort && sort.desc !== defaultDesc ? direction : undefined,
      [key("query")]: search?.trim() ? search : undefined,
      ...writeFilters?.(filters ?? {}),
    }

    return Object.fromEntries(
      Object.entries(params).map(([name, value]) => [name, value ?? clearValue]),
    )
  }

  function hasUnreadablePage(raw: SearchParams) {
    const value = raw[key("page")]
    return value !== undefined && value !== null && fields.page.parse(value) === undefined
  }

  function getProps({ search, onSearchChange }: DataTableSearchPropsOptions): DataTableSearchProps {
    const state = read(search)

    return {
      state,
      onStateChange: (next, { replace }) =>
        onSearchChange(write(next), {
          replace: replace || (next.search ?? "") !== (state.search ?? ""),
        }),
    }
  }

  return { schema, read, write, hasUnreadablePage, getProps }
}

/** What `createDataTableSearch` returns for a table whose params go under `Keys`. */
export type DataTableSearch<Keys extends DataTableSearchKeys = {}> = ReturnType<
  typeof createDataTableSearch<Keys>
>
