import { z } from "zod"
import type { DataTableChangeOptions, DataTableSort, DataTableState } from "./data-table-types"

/**
 * The bridge between a `DataTable`'s state and the URL's search params, with plain objects in
 * and out, so any router can carry it: `@underpin/ui/router` wires it to TanStack Router, and a
 * Next.js app hands the same objects to nuqs. The URL holds only what differs from the default:
 * page 1, the default page size and sort, and an empty search stay out of it.
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

/**
 * A text param a router may hand over as a number: TanStack Router's default parser reads
 * `?query=123` as JSON. Anything else is dropped.
 */
const textParam = z
  .union([z.string(), z.number()])
  .transform(value => String(value))
  .optional()
  .catch(undefined)

function createFieldShape(perPageOptions: readonly number[] | undefined) {
  return {
    page: z.coerce.number().int().min(2).optional().catch(undefined),
    perPage: z.coerce
      .number()
      .refine(value => perPageOptions?.includes(value) ?? false)
      .optional()
      .catch(undefined),
    sort: textParam,
    order: z.enum(["asc", "desc"]).optional().catch(undefined),
    query: textParam,
  }
}

type DataTableFieldShape = ReturnType<typeof createFieldShape>

type DataTableSearchShape<Keys extends DataTableSearchKeys> = {
  [Field in DataTableSearchField as DataTableSearchKey<Keys, Field>]: DataTableFieldShape[Field]
}

export interface DataTableSearchSchemaOptions<Keys extends DataTableSearchKeys> {
  keys?: Keys
  /** The page sizes the reader may pick. Left out, the URL carries no page size. */
  perPageOptions?: readonly number[]
}

/**
 * The search params a table reads. Each one the URL leaves out, or names in a form the table
 * cannot read, is the default, so a stale or edited link never fails the route. A number
 * arrives as a number from a router that parses JSON and as a string from one that does not.
 * A table's own params (a view, a facet filter) go in with `.extend()`.
 */
export function createDataTableSearchSchema<const Keys extends DataTableSearchKeys = {}>({
  keys,
  perPageOptions,
}: DataTableSearchSchemaOptions<Keys> = {}) {
  const fields = createFieldShape(perPageOptions)
  const shape = Object.fromEntries(
    Object.entries(fields).map(([field, schema]) => [
      keys?.[field as DataTableSearchField] ?? field,
      schema,
    ]),
  )

  return z.object(shape as DataTableSearchShape<Keys>)
}

/** The search params under their own names, for a table that offers no page sizes. */
export const dataTableSearchSchema = createDataTableSearchSchema()

/** A table's search params under their own names. Each one left out is the default. */
export type DataTableSearch = z.infer<typeof dataTableSearchSchema>

/** A route's search params as the helpers read them: the table's, under any names, and more. */
type SearchParams = Record<string, unknown>

export interface DataTableSearchOptions {
  /** The names the params go under, as given to `createDataTableSearchSchema`. */
  keys?: DataTableSearchKeys
  /** The sort while the URL names none. Left out, the server's own order applies. */
  sort?: DataTableSort
  /** Rows on a page while the URL names no page size. */
  perPage?: number
  /** The chosen values of each filtered field, read from the table's own params. */
  readFilters?: (search: SearchParams) => DataTableState["filters"]
  /**
   * The table's own params for its filters, every one of them present and undefined when it is
   * empty, so the write clears a filter the reader removed.
   */
  writeFilters?: (filters: NonNullable<DataTableState["filters"]>) => SearchParams
}

function getKey(keys: DataTableSearchKeys | undefined, field: DataTableSearchField) {
  return keys?.[field] ?? field
}

function findText(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function findNumber(value: unknown) {
  return typeof value === "number" ? value : undefined
}

/**
 * The direction the URL names, or the default sort's. A column the reader chose without a
 * direction reads in the default's direction too, so a written sort needs no order beside it.
 */
function isDescending(order: unknown, sort: DataTableSort | undefined) {
  if (order === "asc" || order === "desc") return order === "desc"
  return sort?.desc ?? false
}

/** The table's state from the URL, with the defaults filled in. */
export function readDataTableSearch(
  search: SearchParams,
  { keys, sort, perPage, readFilters }: DataTableSearchOptions = {},
): DataTableState {
  const id = findText(search[getKey(keys, "sort")]) ?? sort?.id
  const desc = isDescending(search[getKey(keys, "order")], sort)

  return {
    page: findNumber(search[getKey(keys, "page")]) ?? 1,
    perPage: findNumber(search[getKey(keys, "perPage")]) ?? perPage,
    sort: id === undefined ? undefined : { id, desc },
    search: findText(search[getKey(keys, "query")]),
    filters: readFilters?.(search),
  }
}

/**
 * The URL for a table's state, with the defaults left out. Every key is present, undefined when
 * it is the default, so spreading the result over the current search params clears them.
 */
export function writeDataTableSearch(
  state: DataTableState,
  { keys, sort: defaultSort, perPage: defaultPerPage, writeFilters }: DataTableSearchOptions = {},
): SearchParams {
  const { page = 1, perPage, sort, search, filters } = state
  const defaultDesc = defaultSort?.desc ?? false
  const direction = sort?.desc ? "desc" : "asc"

  return {
    [getKey(keys, "page")]: page > 1 ? page : undefined,
    [getKey(keys, "perPage")]: perPage === defaultPerPage ? undefined : perPage,
    [getKey(keys, "sort")]: sort && sort.id !== defaultSort?.id ? sort.id : undefined,
    [getKey(keys, "order")]: sort && sort.desc !== defaultDesc ? direction : undefined,
    [getKey(keys, "query")]: search?.trim() ? search : undefined,
    ...writeFilters?.(filters ?? {}),
  }
}

/**
 * Whether the URL names a page the table cannot read (`?page=1`, `?page=0`, `?page=abc`). A
 * route redirects to the address without it, so the address shows what the table shows.
 */
export function hasUnreadablePage(
  raw: SearchParams,
  search: SearchParams,
  keys?: DataTableSearchKeys,
) {
  const key = getKey(keys, "page")
  return key in raw && search[key] === undefined
}

export interface DataTableSearchPropsOptions extends DataTableSearchOptions {
  search: SearchParams
  /** Writes the new search params to the URL. */
  onSearchChange: (search: SearchParams, navigation: DataTableChangeOptions) => void
}

/**
 * The `state` and `onStateChange` that keep a `DataTable` in the URL. A new page, page size,
 * sort or filter adds a history entry, so Back returns to it. A page the table corrected past
 * the end, and a search typed a key at a time, replace the entry instead.
 */
export function getDataTableSearchProps({
  search,
  onSearchChange,
  ...options
}: DataTableSearchPropsOptions) {
  const state = readDataTableSearch(search, options)

  return {
    state,
    onStateChange: (next: DataTableState, { replace }: DataTableChangeOptions) =>
      onSearchChange(writeDataTableSearch(next, options), {
        replace: replace || (next.search ?? "") !== (state.search ?? ""),
      }),
  }
}
