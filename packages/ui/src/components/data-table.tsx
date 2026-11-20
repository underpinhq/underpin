"use client"

import type { useRender } from "@base-ui/react/use-render"
import {
  type Cell,
  type Column,
  type ColumnDef,
  type ColumnVisibilityState,
  FlexRender,
  functionalUpdate,
  type Header,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table as ReactTable,
  type TableOptions,
  type Updater,
  useTable,
} from "@tanstack/react-table"
import {
  createContext,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  changeDataTableState,
  clampPage,
  DATA_TABLE_FEATURES,
  type DataTableFeatures,
  type DataTableState,
  DEFAULT_PER_PAGE,
  formatRowSetKey,
  getPageCount,
  readColumnVisibility,
  writeColumnVisibility,
} from "../lib/data-table-state"
import { ChevronDownIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { BulkActionBar } from "./bulk-action-bar"
import { Button } from "./button"
import { Menu, MenuCheckboxItem, MenuContent, MenuTrigger } from "./menu"
import { Pagination, PaginationInfinite, type PaginationLabels } from "./pagination"
import {
  Table,
  TableBody,
  TableCheckboxCell,
  type TableColumn,
  TableColumnScope,
  TableHead,
  TableHeader,
  type TableProps,
  TableRow,
  type TableRowProps,
  TableRowLink,
  TableSkeletonRow,
} from "./table"

/** The id of the checkbox column a table with selection opens with. */
const SELECT_COLUMN_ID = "select"

/** Skeleton rows on a first load, and at the end of the list while the next batch loads. */
const FIRST_LOAD_ROWS = 5
const MORE_ROWS = 3

/** The words of a `DataTable`, each a prop with an English default. */
export interface DataTableLabels {
  selectAll: string
  /** The checkbox of one row, named by `getRowLabel`. */
  selectRow: (name: string) => string
  /** The column picker's button. */
  columns: string
  /** The count of an infinite table's band, from the formatted number of loaded rows. */
  rowCount: (count: string) => ReactNode
  /** The bulk action bar's count, from the formatted number of selected rows. */
  selected: (count: string) => ReactNode
  /** Names the bulk action bar for a screen reader. */
  selection: string
  clearSelection: string
  loadingMore: ReactNode
  endOfList: ReactNode
  /** The paged band's words. */
  pagination?: Partial<PaginationLabels>
}

/** The state of a table that pages, sorts and searches nothing, one object so it stays stable. */
const STATIC_STATE: DataTableState = {}

function ignoreStateChange() {}

const DATA_TABLE_LABELS: DataTableLabels = {
  selectAll: "Select all",
  selectRow: name => `Select ${name}`,
  columns: "Columns",
  rowCount: count => `${count} rows`,
  selected: count => `${count} selected`,
  selection: "Selection",
  clearSelection: "Clear selection",
  loadingMore: "Loading more…",
  endOfList: "End of list",
}

/** The footer of a table whose rows come a page at a time. Page and page size live in `state`. */
interface DataTablePages {
  type: "pages"
  /**
   * Every row the query matches, across all pages. Undefined while no page has arrived (a first
   * load, a failed page): the table then draws no band and leaves the page as the state asks,
   * so a failed page keeps its error in place instead of moving the reader to page 1.
   */
  total: number | undefined
  /** The page sizes the reader picks from. Left out, the band has no per-page select. */
  perPageOptions?: number[]
}

/** The footer of a table that loads the next batch as its end scrolls into view. */
interface DataTableInfinite {
  type: "infinite"
  hasMore: boolean
  isLoadingMore: boolean
  /** Asks for the next batch. Pass a stable callback. */
  onLoadMore: () => void
  /** False after a failed batch, so the band does not ask for it again at once. */
  enabled?: boolean
  /** The count at the start of the band. Left out, it is the number of loaded rows. */
  count?: ReactNode
}

export type DataTablePagination = DataTablePages | DataTableInfinite

export interface DataTableChangeOptions {
  /**
   * True when the table corrects the state itself (a page past the end), so a router adapter
   * replaces the history entry rather than adding one the reader would land back on.
   */
  replace: boolean
}

/** What the toolbar render prop receives. */
export interface DataTableToolbarContext {
  state: DataTableState
  /** Changes part of the state under the paging rules: a new search or filter goes to page 1. */
  setState: (change: Partial<DataTableState>) => void
  /** A menu that shows and hides the columns that allow it, for the toolbar's `end`. */
  columnPicker: ReactNode
}

export interface DataTableProps<TData extends RowData> extends Pick<
  TableProps,
  "variant" | "layout" | "className" | "containerClassName"
> {
  /** Built with `createDataTableColumnHelper`. Keep the array stable between renders. */
  columns: TableOptions<DataTableFeatures, TData>["columns"]
  /** The rows to show: this page's, or every batch loaded so far. Keep it stable too. */
  data: TData[]
  /** A stable id per row, which a selection is kept by. */
  getRowId: (row: TData) => string
  /** Names a row for a screen reader: its checkbox reads "Select <name>". Defaults to its id. */
  getRowLabel?: (row: TData) => string
  "aria-label": string
  /**
   * The page, page size, sort, search and filters. Leave it and `onStateChange` out for a short
   * table with nothing to page, sort or search.
   */
  state?: DataTableState
  onStateChange?: (state: DataTableState, options: DataTableChangeOptions) => void
  pagination?: DataTablePagination
  /**
   * A request is in flight. With no rows yet the table shows skeleton rows; with rows, it keeps
   * them and dims them until the new ones land.
   */
  loading?: boolean
  /** Stands in for the rows when there are none: a `TableMessage` (empty, filtered, error). */
  message?: ReactNode
  /** The row's link. A row with one opens from anywhere on it, through `DataTableRowLink`. */
  getRowHref?: (row: TData) => string | undefined
  /** Renders the row link through a router's link component; it receives the `href`. */
  renderRowLink?: useRender.ComponentProps<"a">["render"]
  /** Fades a row whose record is archived or blocked, all but its menu and checkbox. */
  isRowInactive?: (row: TData) => boolean
  /** Adds a checkbox column. A function disables the box of each row it returns false for. */
  enableRowSelection?: boolean | ((row: TData) => boolean)
  /** The bulk action bar's buttons for the selected rows, shown while any are selected. */
  bulkActions?: (rows: TData[], clear: () => void) => ReactNode
  /** Saves the columns the reader hides, per table, in `localStorage`. */
  storageKey?: string
  /** The row above the table: a `TableToolbar`. */
  toolbar?: (context: DataTableToolbarContext) => ReactNode
  size?: TableRowProps["size"]
  /** Formats each figure in the reader's locale. */
  format?: (value: number) => string
  labels?: Partial<DataTableLabels>
}

interface SelectionValue {
  labels: Pick<DataTableLabels, "selectAll" | "selectRow">
  /** The table's `getRowLabel`, which a checkbox calls with its own row's record. */
  getRowLabel?: (row: unknown) => string
  /** Notes whether Shift was held on a checkbox press, which turns the click into a range. */
  setRange: (range: boolean) => void
  isRange: () => boolean
}

const SelectionContext = createContext<SelectionValue>({
  labels: DATA_TABLE_LABELS,
  setRange: () => {},
  isRange: () => false,
})

interface RowLinkValue {
  href?: string
  render?: useRender.ComponentProps<"a">["render"]
}

const RowLinkContext = createContext<RowLinkValue>({})

interface DataTableRowLinkProps {
  className?: string
  children: ReactNode
}

/**
 * The record's name, inside a `DataTable` column's cell: a link over the whole row when the
 * table has `getRowHref`, plain text when it has none or the row returns none.
 */
export function DataTableRowLink({ className, children }: DataTableRowLinkProps) {
  const { href, render } = use(RowLinkContext)

  if (!href) return <span className={cn("truncate", className)}>{children}</span>

  return (
    <TableRowLink href={href} render={render} className={className}>
      {children}
    </TableRowLink>
  )
}

function getMeta<TData extends RowData>(column: {
  columnDef: ColumnDef<DataTableFeatures, TData, unknown>
}) {
  return column.columnDef.meta ?? {}
}

/** The order a sortable column's head announces. */
function getSortOrder(sorted: false | "asc" | "desc") {
  if (!sorted) return "none"
  return sorted === "asc" ? "ascending" : "descending"
}

/** The column's name in the picker: its `label`, or its header when that is a string. */
function formatColumnLabel<TData extends RowData>(
  column: Column<DataTableFeatures, TData, unknown>,
) {
  const { header } = column.columnDef
  return getMeta(column).label ?? (typeof header === "string" ? header : column.id)
}

interface HeadProps<TData extends RowData> {
  header: Header<DataTableFeatures, TData, unknown>
  /** False on a table with no `onStateChange`, where a sort would go nowhere. */
  canSort: boolean
}

function DataTableHead<TData extends RowData>({ header, canSort }: HeadProps<TData>) {
  const { column } = header
  const meta = getMeta(column)
  const { align, priority } = meta
  const sortable = canSort ? meta.sortable : undefined
  const sorted = column.getIsSorted()

  // A second click flips the order; the first takes the column's own first direction.
  function onSort() {
    column.toggleSorting(sorted ? sorted === "asc" : sortable === "descending")
  }

  // The checkbox column draws its own head, the select-all box.
  if (column.id === SELECT_COLUMN_ID) return <FlexRender header={header} />

  return (
    <TableHead
      align={align}
      priority={priority}
      sort={sortable ? getSortOrder(sorted) : undefined}
      onSort={sortable ? onSort : undefined}
    >
      <FlexRender header={header} />
    </TableHead>
  )
}

interface SelectHeadProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>
}

function SelectHead<TData extends RowData>({ table }: SelectHeadProps<TData>) {
  const { labels } = use(SelectionContext)

  return (
    <TableCheckboxCell
      header
      label={labels.selectAll}
      checked={table.getIsAllPageRowsSelected()}
      indeterminate={table.getIsSomePageRowsSelected()}
      onCheckedChange={checked => table.toggleAllPageRowsSelected(checked)}
    />
  )
}

interface SelectCellProps<TData extends RowData> {
  row: Row<DataTableFeatures, TData>
}

function SelectCell<TData extends RowData>({ row }: SelectCellProps<TData>) {
  const { labels, getRowLabel, setRange, isRange } = use(SelectionContext)

  return (
    <TableCheckboxCell
      label={labels.selectRow(getRowLabel?.(row.original) ?? row.id)}
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onClickCapture={(event: ReactMouseEvent) => setRange(event.shiftKey)}
      onKeyDownCapture={(event: ReactKeyboardEvent) => setRange(event.shiftKey)}
      onCheckedChange={checked =>
        row.getToggleSelectedHandler()({ target: { checked }, shiftKey: isRange() })
      }
    />
  )
}

interface CellProps<TData extends RowData> {
  cell: Cell<DataTableFeatures, TData, unknown>
}

function DataTableCell<TData extends RowData>({ cell }: CellProps<TData>) {
  const { align, priority } = getMeta(cell.column)

  return (
    <TableColumnScope align={align} priority={priority}>
      <FlexRender cell={cell} />
    </TableColumnScope>
  )
}

interface DataTableRowProps<TData extends RowData> {
  row: Row<DataTableFeatures, TData>
  size: TableRowProps["size"]
  inactive?: boolean
  href?: string
  render?: useRender.ComponentProps<"a">["render"]
}

function DataTableRow<TData extends RowData>({
  row,
  size,
  inactive,
  href,
  render,
}: DataTableRowProps<TData>) {
  const link = useMemo(() => ({ href, render }), [href, render])

  return (
    <RowLinkContext value={link}>
      <TableRow size={size} selected={row.getIsSelected()} inactive={inactive}>
        {row.getVisibleCells().map(cell => (
          <DataTableCell key={cell.id} cell={cell} />
        ))}
      </TableRow>
    </RowLinkContext>
  )
}

/**
 * A table drawn from react-table column definitions: the app writes columns, the wrapper draws
 * the head, the rows, the footer band, the checkbox column and the bulk action bar. Its state
 * (page, page size, sort, search, filters) is controlled and never read from the URL, so each
 * app keeps it in its own router. The server sorts, filters and pages: `data` is the rows to
 * show, in order. Paging follows one set of rules: the page is 1-based, a page past the end
 * shows the last one, a change of sort, search, filter or page size goes back to page 1, and
 * the old rows stay dimmed while the next ones load.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  getRowLabel,
  "aria-label": ariaLabel,
  state = STATIC_STATE,
  onStateChange: onStateChangeProp,
  pagination,
  loading = false,
  message,
  getRowHref,
  renderRowLink,
  isRowInactive,
  enableRowSelection,
  bulkActions,
  storageKey,
  toolbar,
  size = "default",
  format = String,
  labels: labelsProp,
  variant,
  layout,
  className,
  containerClassName,
}: DataTableProps<TData>) {
  const labels = { ...DATA_TABLE_LABELS, ...labelsProp }
  const onStateChange = onStateChangeProp ?? ignoreStateChange
  const tableRef = useRef<HTMLTableElement>(null)
  const rangeRef = useRef(false)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({})

  const rowSetKey = formatRowSetKey(state)
  const [selectionKey, setSelectionKey] = useState(rowSetKey)
  const selectable = Boolean(enableRowSelection)

  // Read after mounting, so a server render and the first client render agree: storage is
  // outside React, and a server has none.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (storageKey) setColumnVisibility(readColumnVisibility(storageKey))
  }, [storageKey])

  const sorting: SortingState = state.sort ? [state.sort] : []

  function setState(change: Partial<DataTableState>) {
    onStateChange(changeDataTableState(state, change), { replace: false })
  }

  function onSortingChange(updater: Updater<SortingState>) {
    const [sort] = functionalUpdate(updater, sorting)
    setState({ sort })
  }

  function onColumnVisibilityChange(updater: Updater<ColumnVisibilityState>) {
    const next = functionalUpdate(updater, columnVisibility)
    setColumnVisibility(next)
    if (storageKey) writeColumnVisibility(storageKey, next)
  }

  // Keyed on whether rows select, not on the callback, which a caller often writes inline.
  const allColumns = useMemo(() => {
    if (!selectable) return columns

    const select: ColumnDef<DataTableFeatures, TData, unknown> = {
      id: SELECT_COLUMN_ID,
      enableHiding: false,
      enableSorting: false,
      meta: { width: "2.25rem", skeleton: false },
      header: ({ table }) => <SelectHead table={table} />,
      cell: ({ row }) => <SelectCell row={row} />,
    }
    return [select, ...columns]
  }, [columns, selectable])

  const table = useTable({
    features: DATA_TABLE_FEATURES,
    columns: allColumns,
    data,
    getRowId,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange,
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    enableRowSelection:
      typeof enableRowSelection === "function"
        ? row => enableRowSelection(row.original)
        : selectable,
  })

  // A selection covers the rows on screen: a new page, sort, search or filter clears it, and
  // the Shift range starts over with it.
  if (selectionKey !== rowSetKey) {
    setSelectionKey(rowSetKey)
    table.resetRowSelection(true)
  }

  function clearSelection() {
    table.resetRowSelection(true)
  }

  const selection: SelectionValue = {
    labels,
    // Every row the context reaches is a `TData`, which is what `getRowLabel` takes.
    getRowLabel: getRowLabel as SelectionValue["getRowLabel"],
    setRange: range => {
      rangeRef.current = range
    },
    isRange: () => rangeRef.current,
  }

  const tableColumns: TableColumn[] = table.getVisibleLeafColumns().map(column => {
    const meta = getMeta(column)
    return {
      width: meta.width ?? "minmax(0,1fr)",
      priority: meta.priority,
      align: meta.align,
      skeleton: meta.skeleton,
    }
  })
  const headers = table.getHeaderGroups().at(-1)?.headers ?? []
  const { rows } = table.getRowModel()
  const selectedRows = table.getSelectedRowModel().rows.map(row => row.original)

  const paged = pagination?.type === "pages" ? pagination : undefined
  const infinite = pagination?.type === "infinite" ? pagination : undefined
  const perPage = state.perPage ?? DEFAULT_PER_PAGE
  const total = paged?.total
  const requestedPage = state.page ?? 1
  // With no total yet, the last page is unknown and only the first bounds the page.
  const pageCount = total === undefined ? Infinity : getPageCount(total, perPage)
  const page = clampPage(requestedPage, pageCount)

  // A page past the end (a stale link, rows deleted since) moves the state to the last page, so
  // the app asks for rows that exist. With no total yet the end is unknown, so nothing moves.
  const pastEnd = total !== undefined && !loading && requestedPage !== page
  useEffect(() => {
    if (pastEnd) onStateChange({ ...state, page }, { replace: true })
    // Only a new clamp asks again: the app's state catching up ends it.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [pastEnd, page])

  function onPageChange(next: number) {
    setState({ page: next })
    // The rows change under the reader: bring the table's top back when it has scrolled away.
    const element = tableRef.current
    if (element && element.getBoundingClientRect().top < 0) {
      element.scrollIntoView({ block: "start" })
    }
  }

  const hideable = table.getAllLeafColumns().filter(column => column.getCanHide())
  const columnPicker = hideable.length > 0 && (
    <Menu>
      <MenuTrigger render={<Button variant="secondary" suffix={<ChevronDownIcon />} />}>
        {labels.columns}
      </MenuTrigger>
      <MenuContent label={labels.columns} align="end">
        {hideable.map(column => (
          <MenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            closeOnClick={false}
            onCheckedChange={checked => column.toggleVisibility(checked)}
          >
            {formatColumnLabel(column)}
          </MenuCheckboxItem>
        ))}
      </MenuContent>
    </Menu>
  )

  const firstLoad = loading && rows.length === 0
  const dimmed = loading && rows.length > 0
  const loadingMore = infinite?.isLoadingMore === true && rows.length > 0

  const footer =
    paged && total !== undefined ? (
      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        perPage={perPage}
        perPageOptions={paged.perPageOptions}
        loading={loading}
        format={format}
        labels={labels.pagination}
        onPageChange={onPageChange}
        onPerPageChange={next => setState({ perPage: next })}
      />
    ) : infinite && rows.length > 0 ? (
      <PaginationInfinite
        count={infinite.count ?? labels.rowCount(format(rows.length))}
        hasMore={infinite.hasMore}
        loading={infinite.isLoadingMore}
        enabled={infinite.enabled}
        loadingLabel={labels.loadingMore}
        endLabel={labels.endOfList}
        onLoadMore={infinite.onLoadMore}
      />
    ) : undefined

  const tableElement = (
    <SelectionContext value={selection}>
      <Table
        ref={tableRef}
        aria-label={ariaLabel}
        aria-busy={loading || loadingMore || undefined}
        columns={tableColumns}
        variant={variant}
        layout={layout}
        footer={footer}
        className={className}
        containerClassName={containerClassName}
      >
        <TableHeader>
          {headers.map(header => (
            <DataTableHead
              key={header.id}
              header={header}
              canSort={onStateChangeProp !== undefined}
            />
          ))}
        </TableHeader>
        <TableBody className={cn("transition-opacity", dimmed && "opacity-50")}>
          {firstLoad
            ? Array.from({ length: FIRST_LOAD_ROWS }, (_, index) => (
                <TableSkeletonRow key={index} size={size} index={index} />
              ))
            : rows.length === 0
              ? message
              : rows.map(row => (
                  <DataTableRow
                    key={row.id}
                    row={row}
                    size={size}
                    inactive={isRowInactive?.(row.original)}
                    href={getRowHref?.(row.original)}
                    render={renderRowLink}
                  />
                ))}
          {loadingMore &&
            Array.from({ length: MORE_ROWS }, (_, index) => (
              <TableSkeletonRow key={index} size={size} index={rows.length + index} />
            ))}
        </TableBody>
      </Table>
    </SelectionContext>
  )

  const bar = bulkActions && (
    <BulkActionBar
      count={selectedRows.length}
      label={labels.selected(format(selectedRows.length))}
      aria-label={labels.selection}
      clearLabel={labels.clearSelection}
      onClear={clearSelection}
    >
      {bulkActions(selectedRows, clearSelection)}
    </BulkActionBar>
  )

  if (!toolbar) {
    return (
      <>
        {tableElement}
        {bar}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {toolbar({ state, setState, columnPicker })}
      {tableElement}
      {bar}
    </div>
  )
}
