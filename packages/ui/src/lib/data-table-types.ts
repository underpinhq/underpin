/**
 * The types a table's state is made of, with no import, so a router adapter that reads only
 * these (`data-table-search`) never pulls in react-table's types.
 */

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

/** How the table hands over a change of its state. */
export interface DataTableChangeOptions {
  /**
   * True when the table corrects the state itself (a page past the end), so a router adapter
   * replaces the history entry rather than adding one the reader would land back on.
   */
  replace: boolean
}
