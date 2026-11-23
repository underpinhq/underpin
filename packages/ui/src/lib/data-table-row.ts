"use client"

import { type ComponentType, createContext, type ReactNode } from "react"
import type { TableRowProps } from "../components/table"

/**
 * How a part built on `DataTable` reaches into each of its rows without the table depending on
 * it: `SortableDataTable` puts a wrapper here that makes every row draggable, so `DataTable`
 * never loads the drag library itself. The package keeps this module off its public exports.
 */

export interface DataTableRowWrapperProps {
  /** The row's id, from the table's `getRowId`. */
  rowId: string
  /** What the screen reader calls the row, from the table's `getRowLabel`. */
  label: string
  /** Draws the row with the props the wrapper adds to its `TableRow`. */
  children: (props: Partial<TableRowProps>) => ReactNode
}

/** The wrapper around each row of the `DataTable` inside it. Keep the component stable. */
export const DataTableRowWrapperContext = createContext<
  ComponentType<DataTableRowWrapperProps> | undefined
>(undefined)
