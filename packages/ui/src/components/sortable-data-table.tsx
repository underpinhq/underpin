"use client"

import type { RowData } from "@tanstack/react-table"
import { createContext, use } from "react"
import { DataTableRowWrapperContext, type DataTableRowWrapperProps } from "../lib/data-table-row"
import { cn } from "../lib/variants"
import { DataTable, type DataTableLabels, type DataTableProps } from "./data-table"
import {
  DragHandle,
  type SortableActivator,
  type SortableItem,
  SortableList,
  useSortableItem,
} from "./sortable"

/** The words of a `SortableDataTable`: a `DataTable`'s, and the grip's. */
export interface SortableDataTableLabels extends DataTableLabels {
  /** The grip of one row, named by `getRowLabel`. */
  reorder: (name: string) => string
}

/** What every row of a `SortableDataTable` shares. */
interface SortableSettings {
  activator: SortableActivator
  disabled: boolean
  reorder: SortableDataTableLabels["reorder"]
}

function formatReorderLabel(name: string) {
  return `Reorder ${name}`
}

const SortableSettingsContext = createContext<SortableSettings>({
  activator: "handle",
  disabled: false,
  reorder: formatReorderLabel,
})

/** What a `DataTableDragHandle` reads from the row it sits in. */
interface DragHandleValue extends SortableSettings {
  /** What the row is called for the screen reader. */
  name: string
  /** The row's part in the list. Undefined on the lifted copy, whose grip draws but does nothing. */
  sortable?: SortableItem
}

const DragHandleContext = createContext<DragHandleValue | undefined>(undefined)

/** A row's own box while it is dragged: a blank slot of its height, where the lifted copy lands. */
const DRAGGED_ROW_CLASSES = "bg-fill hover:bg-fill *:invisible"

/** Makes one row of the table draggable, and tells its grip which row it moves. */
function SortableRow({ rowId, label, children }: DataTableRowWrapperProps) {
  const settings = use(SortableSettingsContext)
  const sortable = useSortableItem(rowId)

  return (
    <DragHandleContext value={{ ...settings, name: label, sortable }}>
      {children({ ...sortable.box, className: cn(sortable.isDragging && DRAGGED_ROW_CLASSES) })}
    </DragHandleContext>
  )
}

interface DataTableDragHandleProps {
  className?: string
}

/**
 * The grip that moves its row, placed by a column's cell, usually in the name cell's `leading`.
 * It sits above the row link, which covers the row and would otherwise take the press. In a
 * `handle` table it always shows. In a `box` table, where the pointer picks up the whole row,
 * it is the keyboard's way in: it shows on hover and on focus, never on a touch screen, and not
 * at all while the table is disabled. Outside a `SortableDataTable` it draws nothing.
 */
export function DataTableDragHandle({ className }: DataTableDragHandleProps) {
  const handle = use(DragHandleContext)
  if (!handle || (handle.activator === "box" && handle.disabled)) return null

  return (
    <DragHandle
      label={handle.reorder(handle.name)}
      sortable={handle.sortable}
      className={cn(
        "relative z-10 size-6",
        handle.activator === "box" &&
          "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden",
        className,
      )}
    />
  )
}

export interface SortableDataTableProps<TData extends RowData> extends Omit<
  DataTableProps<TData>,
  "labels"
> {
  /** What a row is called in what the screen reader hears: "site", "field". */
  noun: string
  /**
   * `box`: a pointer picks up the whole row, after some movement so a click still opens its
   * link. `handle`: only the grip does, for a row the pointer has other uses for.
   */
  activator: SortableActivator
  /** No row moves while true: a save in flight, a search that leaves gaps in the order. */
  disabled?: boolean
  /** Moves the row at `from` to `to`, both indexes in `data`. */
  onMove: (from: number, to: number) => void
  labels?: Partial<SortableDataTableLabels>
}

/**
 * A `DataTable` whose rows the reader drags into their own order, keeping its head, columns
 * and row links. A column's cell places the grip with `DataTableDragHandle`. While a row moves,
 * its own box stays behind as the slot it lands in, and a copy drawn as a one-row table of the
 * same columns follows the pointer. The order is `data`'s, so the app owns it: `onMove` reports
 * a move and the app hands back the reordered rows.
 */
export function SortableDataTable<TData extends RowData>({
  noun,
  activator,
  disabled = false,
  onMove,
  labels,
  ...props
}: SortableDataTableProps<TData>) {
  const { data, getRowId, getRowLabel } = props
  const settings: SortableSettings = {
    activator,
    disabled,
    reorder: labels?.reorder ?? formatReorderLabel,
  }

  function describe(index: number) {
    const row = data[index]
    return row && (getRowLabel?.(row) ?? getRowId(row))
  }

  function renderOverlay(index: number) {
    const row = data[index]
    if (!row) return
    // A row whose label is still blank (a field with no name yet) is named by its id.
    // oxlint-disable-next-line typescript/prefer-nullish-coalescing
    const name = describe(index) || getRowId(row)

    return (
      <DragHandleContext value={{ ...settings, name }}>
        <DataTable
          {...props}
          labels={labels}
          data={[row]}
          aria-label={name}
          layout="list"
          variant="card"
          loading={false}
          message={undefined}
          toolbar={undefined}
          pagination={undefined}
          bulkActions={undefined}
          containerClassName="cursor-grabbing shadow-popup"
        />
      </DragHandleContext>
    )
  }

  return (
    <SortableList
      ids={data.map(getRowId)}
      layout="list"
      noun={noun}
      describe={describe}
      activator={activator}
      disabled={disabled}
      renderOverlay={renderOverlay}
      onMove={onMove}
    >
      <SortableSettingsContext value={settings}>
        <DataTableRowWrapperContext value={SortableRow}>
          <DataTable {...props} labels={labels} />
        </DataTableRowWrapperContext>
      </SortableSettingsContext>
    </SortableList>
  )
}
