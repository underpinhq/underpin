"use client"

import type { RowData } from "@tanstack/react-table"
import { createContext, type MouseEvent as ReactMouseEvent, use } from "react"
import { DataTableRowWrapperContext, type DataTableRowWrapperProps } from "../lib/data-table-row"
import { cn } from "../lib/variants"
import { DataTable, type DataTableLabels, type DataTableProps } from "./data-table"
import { DragHandle, type SortableItem, SortableList, useSortableItem } from "./sortable"

/** The words of a `SortableDataTable`: a `DataTable`'s, and the grip's. */
export interface SortableDataTableLabels extends DataTableLabels {
  /** The grip of one row, named by `getRowLabel`. */
  reorder: (name: string) => string
}

/** When the grips show: on every row, or only on the row under the pointer or holding focus. */
type HandleVisibility = "always" | "hover"

/** What every row of a `SortableDataTable` shares. */
interface SortableSettings {
  disabled: boolean
  handleVisibility: HandleVisibility
  reorder: SortableDataTableLabels["reorder"]
}

function formatReorderLabel(name: string) {
  return `Reorder ${name}`
}

const SortableSettingsContext = createContext<SortableSettings>({
  disabled: false,
  handleVisibility: "always",
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

/**
 * The gutter the grips sit in: the first column, the head's included, starts 28px in rather
 * than 20px, so the grip sits 6px from the card's edge and 6px before the first cell's content,
 * and the names still line up with their column name. A cell across the whole row (the empty or
 * error message, a group heading) keeps its own inset, so a message stays centred.
 */
const GUTTER_CLASSES = [
  "[&_[role=listitem]>:first-child:not(.col-span-full)]:pl-7",
  "[&_[role=row]>:first-child:not(.col-span-full)]:pl-7",
].join(" ")

/**
 * What a working grip adds: its hit area, from the card's edge to the first cell's content, and
 * on a touch screen 44px wide, over the content's icon. The pseudo element is part of the button.
 */
const GRIP_HIT_AREA_CLASSES = [
  "after:absolute after:-inset-y-2.5 after:-left-1 after:w-7",
  "pointer-coarse:after:-inset-y-3 pointer-coarse:after:w-11",
].join(" ")

/**
 * Hides a grip while its row is neither under the pointer nor holding focus, on a screen with a
 * pointer that hovers. A touch screen has no hover, so its grips stay quiet but visible: there
 * the grip is what the finger presses. Opacity alone hides it, so it stays in the tab order and
 * the screen reader still names it, and the gutter keeps its width.
 */
const HIDDEN_AT_REST_CLASSES =
  "[@media(hover:hover)]:group-[:not(:hover,:focus-within)]/row:opacity-0"

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
 * Clicks the link of the row a grip sits in with the same button and modifier keys, so a
 * cmd-click or a middle click on the grip opens the row in a new tab, as it would on the link.
 */
function forwardToRowLink(event: ReactMouseEvent<HTMLButtonElement>) {
  const row = event.currentTarget.closest('[role="row"], [role="listitem"]')
  const link = row?.querySelector("[data-row-link]")
  if (!link) return
  const { detail, button, metaKey, ctrlKey, shiftKey, altKey } = event
  link.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
      detail,
      button,
      metaKey,
      ctrlKey,
      shiftKey,
      altKey,
    }),
  )
}

/**
 * Opens the row a grip sits in when a pointer or a finger presses it without dragging, as a
 * press anywhere else on the row does. A key press clicks the grip too, with no `detail`, and
 * opens nothing: the keys on the grip move the row.
 */
function openRow(event: ReactMouseEvent<HTMLButtonElement>) {
  if (event.detail === 0) return
  forwardToRowLink(event)
}

/** Opens the row in a new tab on a middle click, which fires no `click` on the grip. */
function openRowInNewTab(event: ReactMouseEvent<HTMLButtonElement>) {
  if (event.button !== 1) return
  forwardToRowLink(event)
}

/**
 * The grip that moves its row, placed by a column's cell, usually in the name cell's `leading`.
 * It takes itself out of the cell into the row's gutter, above the row link, which covers the
 * row and would otherwise take the press. By default it shows on every row, on touch screens
 * too, so every row says the list can be reordered: quiet at rest, full under the pointer and on
 * focus, and on the lifted copy. With `handleVisibility="hover"`, a screen that hovers shows it
 * only on the row under the pointer or holding focus. A press that does not drag opens the row.
 * While the table is disabled it stays quiet, drops its hit area and lets a finger scroll the
 * page. Outside a `SortableDataTable` it draws nothing.
 */
export function DataTableDragHandle({ className }: DataTableDragHandleProps) {
  const handle = use(DragHandleContext)
  if (!handle) return null

  return (
    <DragHandle
      label={handle.reorder(handle.name)}
      sortable={handle.sortable}
      className={cn(
        "absolute top-1/2 left-1 z-10 size-5 -translate-y-1/2 transition-opacity duration-150 ease-out",
        !handle.sortable
          ? "opacity-100"
          : [
              handle.disabled
                ? "cursor-default touch-auto opacity-45 active:cursor-default"
                : [
                    GRIP_HIT_AREA_CLASSES,
                    "opacity-45 group-hover/row:opacity-100 focus-visible:opacity-100",
                  ],
              handle.handleVisibility === "hover" && HIDDEN_AT_REST_CLASSES,
            ],
        className,
      )}
      onClick={handle.sortable ? openRow : undefined}
      onAuxClick={handle.sortable ? openRowInNewTab : undefined}
    />
  )
}

export interface SortableDataTableProps<TData extends RowData> extends Omit<
  DataTableProps<TData>,
  "labels"
> {
  /** What a row is called in what the screen reader hears: "site", "field". */
  noun: string
  /** No row moves while true: a save in flight, a search that leaves gaps in the order. */
  disabled?: boolean
  /**
   * When the grips show. `always` draws one on every row. `hover` shows a row's grip only while
   * the pointer is over the row or something in it has focus, for a list where reordering is
   * rare; a touch screen, which cannot hover, still shows every grip.
   */
  handleVisibility?: HandleVisibility
  /** Moves the row at `from` to `to`, both indexes in `data`. */
  onMove: (from: number, to: number) => void
  labels?: Partial<SortableDataTableLabels>
}

/**
 * A `DataTable` whose rows the reader drags into their own order, keeping its head, columns
 * and row links. A column's cell places the grip with `DataTableDragHandle`, and the table
 * leaves a gutter for it. A pointer picks up the whole row once it moves 6px, so a click still
 * opens the row's link. A finger picks it up at once from the grip, or after a 250ms press
 * anywhere else, so a swipe still scrolls. The arrow keys on the grip move the row one place.
 * While a row moves, its own box stays behind as the slot it lands in, and a copy drawn as a
 * one-row table of the same columns follows the pointer. The order is `data`'s, so the app owns
 * it: `onMove` reports a move and the app hands back the reordered rows.
 */
export function SortableDataTable<TData extends RowData>({
  noun,
  disabled = false,
  handleVisibility = "always",
  onMove,
  labels,
  className,
  ...rest
}: SortableDataTableProps<TData>) {
  const props = { ...rest, className: cn(GUTTER_CLASSES, className) }
  const { data, getRowId, getRowLabel } = props
  const settings: SortableSettings = {
    disabled,
    handleVisibility,
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
      activator="both"
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
