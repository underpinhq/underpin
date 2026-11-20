"use client"

import { useRender } from "@base-ui/react/use-render"
import {
  Children,
  type ComponentProps,
  createContext,
  type CSSProperties,
  type ReactNode,
  use,
} from "react"
import { rowPressClasses } from "../lib/classes"
import { AlertIcon, ArrowDownIcon, ArrowUpIcon, FilterIcon } from "../lib/icons"
import { cn, variants, type VariantProps } from "../lib/variants"
import { Checkbox } from "./checkbox"
import { CopyButton } from "./copy-button"
import { EmptyState } from "./empty-state"
import { Skeleton } from "./skeleton"
import { Sparkline } from "./sparkline"

// The parts are table elements laid out as a CSS grid, so they carry their table roles
// explicitly: a browser that sees `display: grid` on a `<table>` may stop exposing it as one.
/* oxlint-disable jsx-a11y/no-redundant-roles */

/**
 * Which columns give way as the table's box narrows: a `medium` column hides below the `@2xl`
 * container width (672px), a `low` one below `@4xl` (896px). A column with none always shows.
 */
export type TableColumnPriority = "medium" | "low"

export interface TableColumn {
  /** The column's grid track: `minmax(0,1fr)` for the name, a fixed `6rem` for a figure. */
  width: string
  priority?: TableColumnPriority
  /** Where a skeleton row puts its stand-in. */
  align?: "start" | "end"
  /** Whether a skeleton row draws a stand-in here. Off for a checkbox or actions column. */
  skeleton?: boolean
}

type TableLayout = "table" | "list"

interface TableContextValue {
  layout: TableLayout
  columns: TableColumn[]
}

const TableContext = createContext<TableContextValue>({ layout: "table", columns: [] })

/**
 * The classes that hide a cell of a column with a priority, on its head and on every cell, so
 * the column drops out whole. `Table` drops its track from the grid at the same widths.
 */
export const tableColumnPriorityClasses: Record<TableColumnPriority, string> = {
  medium: "@max-2xl:hidden",
  low: "@max-4xl:hidden",
}

function formatColumnTemplate(columns: TableColumn[], hidden: TableColumnPriority[]) {
  return columns
    .filter(column => !column.priority || !hidden.includes(column.priority))
    .map(column => column.width)
    .join(" ")
}

const ROW_GRID_CLASSES = "col-span-full grid grid-cols-subgrid"

const tableVariants = variants({
  slots: {
    container: "@container relative",
    table: [
      "grid w-full text-control text-ink",
      "grid-cols-(--table-columns) @2xl:grid-cols-(--table-columns-md) @4xl:grid-cols-(--table-columns-lg)",
      // A sticky header pushes the sticky group headings down by its own height.
      "has-[>[data-sticky]]:[--table-header-height:--spacing(10)]",
    ],
  },

  variants: {
    variant: {
      // The card surface, its edge drawn by the wrapper so the rows' fills stay inside it.
      card: { container: "overflow-clip rounded-lg border bg-surface shadow-card" },
      // No surface, for a table inside another card or a dialog.
      flush: {},
    },
  },

  defaultVariants: {
    variant: "card",
  },
})

const tableRowVariants = variants({
  base: [
    ROW_GRID_CLASSES,
    "group/row relative items-center border-t border-edge-subtle",
    // Only a row that opens something answers the pointer. The hover and focus fills leave out a
    // pressed link: they match with the same weight as the press fill and come later in the
    // stylesheet, so they would hide it.
    "has-[[data-row-link]:not(:active)]:hover:bg-canvas has-[[data-row-link]:focus-visible:not(:active)]:bg-canvas",
    rowPressClasses,
    "data-selected:bg-fill-subtle data-selected:hover:bg-fill-subtle",
    // The cell holding the row link sits on a layer above its neighbours. A faded cell is a
    // stacking context of its own, and a later one would otherwise paint over the link's box.
    // A grid item takes `z-index` without being positioned, so the link still fills the row.
    "*:has-[[data-row-link]]:z-1",
    // An archived or blocked record fades, all but its menu. A cell holding a control above the
    // row link (the checkbox, a copy button) fades its content instead: faded whole, it would be
    // a stacking context under the link's layer, and the control could not be clicked.
    "data-inactive:*:not-data-[slot=actions]:not-data-[slot=checkbox]:not-data-[slot=mono]:opacity-50",
  ],

  variants: {
    size: {
      /** 32px, for a feed or a dense list. */
      compact: "h-8",
      /** 44px, a one-line row. */
      default: "h-11",
      /** 52px, for a two-line name cell. */
      identity: "h-13",
    },
  },

  defaultVariants: {
    size: "default",
  },
})

const tableCellVariants = variants({
  base: "flex min-w-0 items-center gap-2 px-2 first:pl-5 last:pr-5",

  variants: {
    align: {
      start: "justify-start text-left",
      end: "justify-end text-right",
    },
    priority: tableColumnPriorityClasses,
  },

  defaultVariants: {
    align: "start",
  },
})

type TableCellVariantProps = VariantProps<typeof tableCellVariants>

/** Varied widths for a skeleton row's first line, so a stack of them does not read as stripes. */
const SKELETON_NAME_WIDTHS = ["w-36", "w-28", "w-40", "w-32", "w-24"]

const MESSAGE_ICONS = {
  filtered: <FilterIcon />,
  error: <AlertIcon />,
}

export interface TableProps
  extends Omit<ComponentProps<"table">, "children">, VariantProps<typeof tableVariants> {
  /** Every column in order, the same list the head and the cells of each row follow. */
  columns: TableColumn[]
  /**
   * `list` draws the same rows with no column names, for a list of records (members, API keys):
   * the rows are list items rather than table rows.
   */
  layout?: TableLayout
  /** The band under the rows: `Pagination` or `PaginationInfinite`. */
  footer?: ReactNode
  /** Classes for the box around the table: the card, or the bare wrapper of a flush table. */
  containerClassName?: string
  children?: ReactNode
}

/**
 * A table on a CSS grid. The root sets one grid template from `columns`, and the header and
 * every row take it as a subgrid, so the columns line up however the rows are grouped. A row
 * stays a positioned box, which a real table row is not in Safari, so a stretched link can
 * fill it (`TableRowLink`). Columns with a `priority` drop out as the table's own box narrows.
 * Set `--table-sticky-top` on it when a sticky header must clear a bar pinned above it.
 */
export function Table({
  columns,
  layout = "table",
  variant,
  footer,
  className,
  containerClassName,
  style,
  children,
  ...props
}: TableProps) {
  const styles = tableVariants({ variant })
  const template = {
    "--table-columns": formatColumnTemplate(columns, ["medium", "low"]),
    "--table-columns-md": formatColumnTemplate(columns, ["low"]),
    "--table-columns-lg": formatColumnTemplate(columns, []),
    ...style,
  } as CSSProperties
  const Root = layout === "list" ? "div" : "table"

  return (
    <TableContext value={{ layout, columns }}>
      <div className={styles.container({ className: containerClassName })}>
        <Root
          role={layout === "list" ? "list" : "table"}
          className={styles.table({ className })}
          style={template}
          {...props}
        >
          {children}
        </Root>
        {footer}
      </div>
    </TableContext>
  )
}

interface TableHeaderProps extends ComponentProps<"thead"> {
  /** Keeps the column names in view while the rows scroll under them. */
  sticky?: boolean
}

/**
 * The row of column names: 40px, on the surface, with one line under it in the card's edge
 * colour. The first row draws no line of its own, so the two never stack. A list has none, and
 * renders nothing for one.
 */
export function TableHeader({ sticky, className, children, ...props }: TableHeaderProps) {
  if (use(TableContext).layout === "list") return null

  return (
    <thead
      role="rowgroup"
      data-sticky={sticky ? "" : undefined}
      className={cn(
        ROW_GRID_CLASSES,
        "border-b bg-surface",
        sticky && "sticky top-(--table-sticky-top,0px) z-20",
        className,
      )}
      {...props}
    >
      {/* The rule reads a header row as interactive; the role restores what `display: grid` drops. */}
      {/* oxlint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
      <tr role="row" className={cn(ROW_GRID_CLASSES, "h-10 items-center")}>
        {children}
      </tr>
    </thead>
  )
}

/**
 * The rows. A table cut into runs (days, workspaces) takes one body per run, each opening with
 * its `TableGroupHeader`, so the heading sticks while its own rows are in view.
 */
export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  const { layout } = use(TableContext)
  const Body = layout === "list" ? "div" : "tbody"

  return (
    <Body
      role={layout === "list" ? "presentation" : "rowgroup"}
      className={cn(
        ROW_GRID_CLASSES,
        // The first row of the table sits under the header's line, or the card's edge.
        "[&:first-of-type>:first-child]:border-t-0",
        className,
      )}
      {...props}
    />
  )
}

export interface TableRowProps extends ComponentProps<"tr">, VariantProps<typeof tableRowVariants> {
  selected?: boolean
  /** Dims the row's cells, for a record that is archived or blocked. */
  inactive?: boolean
}

/**
 * One record. A row whose name is a `TableRowLink` opens it from anywhere on the row and takes
 * the hover fill; a row without one keeps its background under the pointer.
 */
export function TableRow({ size, selected, inactive, className, ...props }: TableRowProps) {
  const { layout } = use(TableContext)
  const Row = layout === "list" ? "div" : "tr"

  return (
    <Row
      role={layout === "list" ? "listitem" : "row"}
      data-selected={selected ? "" : undefined}
      data-inactive={inactive ? "" : undefined}
      className={tableRowVariants({ size, className })}
      {...props}
    />
  )
}

export interface TableHeadProps extends Omit<ComponentProps<"th">, "align">, TableCellVariantProps {
  /** The order the table is in by this column. Left out for a column that does not sort. */
  sort?: "ascending" | "descending" | "none"
  /** Turns the name into a button that sorts by the column. */
  onSort?: () => void
}

/**
 * A column name, in the control weight. A sortable column is a button, with the arrow of its
 * order while the table is sorted by it; unsorted, it looks like any other name.
 */
export function TableHead({
  align,
  priority,
  sort,
  onSort,
  className,
  children,
  ...props
}: TableHeadProps) {
  const sorted = sort === "ascending" || sort === "descending"
  const Arrow = sort === "ascending" ? ArrowUpIcon : ArrowDownIcon

  return (
    <th
      role="columnheader"
      scope="col"
      aria-sort={sort}
      className={tableCellVariants({
        align,
        priority,
        className: cn("gap-1 font-medium text-control text-ink", className),
      })}
      {...props}
    >
      {onSort ? (
        <button
          type="button"
          className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-xs hover:text-ink-secondary"
          onClick={onSort}
        >
          <span className="truncate">{children}</span>
          {sorted && <Arrow className="size-3 shrink-0" />}
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export interface TableCellProps
  extends Omit<ComponentProps<"td">, "align">, TableCellVariantProps {}

/**
 * One cell, the Text type: a line of ink that ends in an ellipsis. Every other cell type is
 * built on it. Give it the `align` and `priority` of its column's head.
 */
export function TableCell({ align, priority, className, children, ...props }: TableCellProps) {
  const { layout } = use(TableContext)
  const Cell = layout === "list" ? "div" : "td"
  const text = typeof children === "string" || typeof children === "number"

  return (
    <Cell
      role={layout === "list" ? undefined : "cell"}
      className={tableCellVariants({ align, priority, className })}
      {...props}
    >
      {text ? <span className="truncate">{children}</span> : children}
    </Cell>
  )
}

/**
 * The record's name as a link that covers the whole row: its box stretches over the row, and
 * the focus ring is drawn round the row. The checkbox, the menu and any other link in the row
 * sit above it (`relative z-10`, as the checkbox and actions cells do), so each keeps its own
 * click. Pass `render` for a router's link.
 */
export function TableRowLink({ render, className, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    render,
    defaultTagName: "a",
    props: {
      "data-row-link": "",
      "data-press-target": "",
      className: cn(
        "truncate outline-none after:absolute after:inset-0",
        "focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus",
        className,
      ),
      ...props,
    },
  })
}

interface TableIdentityCellProps extends Omit<TableCellProps, "title"> {
  /** A favicon, an avatar or a letter tile, sized 28px (`size-7`) by the caller. */
  leading?: ReactNode
  /** The record's name, usually a `TableRowLink`. */
  title: ReactNode
  /** One muted line under the name: a domain, an email. */
  detail?: ReactNode
  /** A flag or a badge after the name. */
  extras?: ReactNode
}

/** The name column: the leading mark, the name in the control weight and a muted line. */
export function TableIdentityCell({
  leading,
  title,
  detail,
  extras,
  className,
  ...props
}: TableIdentityCellProps) {
  return (
    <TableCell className={cn("gap-3", className)} {...props}>
      {leading && <span className="flex shrink-0">{leading}</span>}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-medium">{title}</span>
          {extras && <span className="flex shrink-0 items-center gap-1.5">{extras}</span>}
        </span>
        {detail && <span className="truncate text-ink-muted text-xs">{detail}</span>}
      </span>
    </TableCell>
  )
}

/**
 * A figure, Number or Money: end-aligned in tabular figures. The caller formats the value, a
 * sum of money with its currency.
 */
export function TableNumberCell({ align = "end", className, ...props }: TableCellProps) {
  return <TableCell align={align} className={cn("tabular-nums", className)} {...props} />
}

/** A date, muted: pass a `RelativeTime`, which keeps the exact moment for its tooltip. */
export function TableDateCell({ className, ...props }: TableCellProps) {
  return <TableCell className={cn("text-ink-muted tabular-nums", className)} {...props} />
}

/** A status: pass one `Badge`. */
export function TableBadgeCell(props: TableCellProps) {
  return <TableCell {...props} />
}

interface TableTagsCellProps extends Omit<TableCellProps, "children"> {
  /** One `Badge` per tag. */
  tags: ReactNode[]
  /** How many show before the rest fold into "+N". */
  max?: number
}

/** Tags: the first two, then a count of the rest. */
export function TableTagsCell({ tags, max = 2, className, ...props }: TableTagsCellProps) {
  const rest = tags.length - max

  return (
    <TableCell className={cn("gap-1", className)} {...props}>
      {Children.toArray(tags.slice(0, max))}
      {rest > 0 && <span className="shrink-0 text-ink-muted text-xs tabular-nums">+{rest}</span>}
    </TableCell>
  )
}

interface TableSparklineCellProps extends Omit<TableCellProps, "children"> {
  data: number[]
}

/** A trend: a `Sparkline` across the cell, 32px tall. */
export function TableSparklineCell({ data, ...props }: TableSparklineCellProps) {
  return (
    <TableCell {...props}>
      <Sparkline data={data} className="h-8 w-full" />
    </TableCell>
  )
}

interface TableMeterCellProps extends Omit<TableCellProps, "children"> {
  value: number
  max: number
  /** The usage as text, formatted by the caller: "8,240 of 10,000". */
  label?: ReactNode
}

/** Usage against a limit: a thin bar, then the figure. The bar turns warning past 90%. */
export function TableMeterCell({ value, max, label, className, ...props }: TableMeterCellProps) {
  const share = max > 0 ? Math.min(value / max, 1) : 0

  return (
    <TableCell className={cn("gap-2", className)} {...props}>
      <span
        // A native `<meter>` draws its own bar, which the theme's tokens cannot reach.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={typeof label === "string" ? label : undefined}
        className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-fill"
      >
        <span
          className={cn("block h-full rounded-full bg-ink", share > 0.9 && "bg-warning")}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      {label && <span className="truncate text-ink-muted text-xs tabular-nums">{label}</span>}
    </TableCell>
  )
}

interface TableCountryCellProps extends Omit<TableCellProps, "children"> {
  /** The country's flag. */
  flag: ReactNode
  name: ReactNode
}

/** A country: its flag and its name. */
export function TableCountryCell({ flag, name, ...props }: TableCountryCellProps) {
  return (
    <TableCell {...props}>
      <span className="flex shrink-0">{flag}</span>
      <span className="truncate">{name}</span>
    </TableCell>
  )
}

interface TableMonoCellProps extends Omit<TableCellProps, "children"> {
  value: string
  /** Adds a copy button after the value. */
  copy?: boolean
}

/** A machine string (a key, an id) in mono, with a copy button that sits above the row link. */
export function TableMonoCell({ value, copy, className, ...props }: TableMonoCellProps) {
  return (
    <TableCell data-slot="mono" className={cn("gap-1", className)} {...props}>
      <span className="truncate font-mono text-ink-secondary text-xs in-data-inactive:opacity-50">
        {value}
      </span>
      {copy && (
        <CopyButton
          value={value}
          variant="ghost"
          size="xs"
          className="relative z-10 in-data-inactive:opacity-50"
        />
      )}
    </TableCell>
  )
}

interface TablePersonCellProps extends Omit<TableCellProps, "children"> {
  /** An avatar, sized 20px (`size-5`) by the caller. */
  avatar?: ReactNode
  name: ReactNode
}

/** A person on one line: a 20px avatar and the name. */
export function TablePersonCell({ avatar, name, ...props }: TablePersonCellProps) {
  return (
    <TableCell {...props}>
      {avatar && <span className="flex shrink-0">{avatar}</span>}
      <span className="truncate">{name}</span>
    </TableCell>
  )
}

/**
 * The row's menu, end-aligned above the row link. It shows on hover, on keyboard focus, while
 * open, and always on a touch screen, which has no hover to give.
 */
export function TableActionsCell({ align = "end", className, children, ...props }: TableCellProps) {
  return (
    <TableCell data-slot="actions" align={align} className={className} {...props}>
      <span
        className={cn(
          "relative z-10 flex",
          "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 has-data-popup-open:opacity-100 pointer-coarse:opacity-100",
        )}
      >
        {children}
      </span>
    </TableCell>
  )
}

interface TableCheckboxCellProps
  extends
    Omit<TableCellProps, "children" | "onChange">,
    Pick<ComponentProps<typeof Checkbox>, "checked" | "indeterminate" | "onCheckedChange"> {
  /** Names the checkbox: "Select openalternative.com", "Select all". */
  label: string
  /** Renders a head cell for the header row: the select-all box. Ignored in a list. */
  header?: boolean
}

/** Selects the row, or every row on the page in the header. */
export function TableCheckboxCell({
  label,
  header: headerProp,
  checked,
  indeterminate,
  onCheckedChange,
  className,
  ...props
}: TableCheckboxCellProps) {
  // A list has no header row, so a header box there renders as a plain cell.
  const { layout } = use(TableContext)
  const header = headerProp && layout === "table"
  const box = (
    <Checkbox
      aria-label={label}
      checked={checked}
      indeterminate={indeterminate}
      className="relative z-10 in-data-inactive:opacity-50"
      onCheckedChange={onCheckedChange}
    />
  )
  const classes = cn("pr-0 first:pl-4", className)

  if (header) {
    const { align, priority, ...headProps } = props
    return (
      <th
        role="columnheader"
        scope="col"
        data-slot="checkbox"
        className={tableCellVariants({ align, priority, className: classes })}
        {...headProps}
      >
        {box}
      </th>
    )
  }

  return (
    <TableCell data-slot="checkbox" className={classes} {...props}>
      {box}
    </TableCell>
  )
}

interface TableGroupHeaderProps extends ComponentProps<"tr"> {}

/**
 * A heading row for the run of rows under it: a day of a feed, a workspace of a list. It sticks
 * under the header while its own body is in view, and the next one pushes it out. Opaque, so the
 * rows slide under it.
 */
export function TableGroupHeader({ className, children, ...props }: TableGroupHeaderProps) {
  const { layout } = use(TableContext)
  const list = layout === "list"
  const Row = list ? "div" : "tr"
  const Heading = list ? "div" : "th"

  return (
    <Row
      role={list ? "listitem" : "row"}
      className={cn(
        ROW_GRID_CLASSES,
        // Above the controls of the rows sliding under it (`z-10`), below a sticky header (`z-20`).
        "sticky top-[calc(var(--table-sticky-top,0px)+var(--table-header-height,0px))] z-15",
        "h-7 border-t border-edge-subtle bg-fill-subtle",
        className,
      )}
      {...props}
    >
      <Heading
        role={list ? "heading" : "rowheader"}
        aria-level={list ? 3 : undefined}
        scope={list ? undefined : "rowgroup"}
        className="col-span-full flex items-center px-5 text-left font-medium text-ink-secondary text-xs"
      >
        {children}
      </Heading>
    </Row>
  )
}

interface TableSkeletonRowProps extends VariantProps<typeof tableRowVariants> {
  /** The row's place in the stack, which picks the width of its first line. */
  index?: number
}

/**
 * A loading row the size of the rows it stands in for, one stand-in per column of the table.
 * Put five in the body on a first load; while a later page loads, keep the old rows and dim them.
 */
export function TableSkeletonRow({ size, index = 0 }: TableSkeletonRowProps) {
  const { columns } = use(TableContext)
  const nameWidth = SKELETON_NAME_WIDTHS[index % SKELETON_NAME_WIDTHS.length]
  // The first column that draws a stand-in, past a leading checkbox.
  const nameColumn = columns.findIndex(column => column.skeleton !== false)

  return (
    <TableRow size={size} aria-hidden>
      {columns.map((column, position) => (
        <TableCell
          // oxlint-disable-next-line react/no-array-index-key
          key={position}
          align={column.align}
          priority={column.priority}
          className="gap-2"
        >
          {column.skeleton === false ? null : position === nameColumn && size === "identity" ? (
            <>
              <Skeleton className="size-7 shrink-0 rounded-md" />
              <span className="flex flex-col gap-1.5">
                <Skeleton className={cn("h-3", nameWidth)} />
                <Skeleton className="h-2.5 w-24" />
              </span>
            </>
          ) : (
            <Skeleton className={cn("h-3", position === nameColumn ? nameWidth : "w-16")} />
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

interface TableMessageProps {
  /**
   * `empty`: nothing exists yet, with the create action. `filtered`: nothing matches, with a way
   * to clear the filters. `error`: the load failed, with a retry.
   */
  kind: "empty" | "filtered" | "error"
  /** Required for `empty`; `filtered` and `error` draw a filter and an alert by default. */
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

/**
 * Stands in for the rows: the small empty state across every column, under the header, which
 * keeps its line. Put it inside `TableBody`.
 */
export function TableMessage({ kind, icon, title, description, action }: TableMessageProps) {
  const { layout } = use(TableContext)
  const list = layout === "list"
  const Row = list ? "div" : "tr"
  const Cell = list ? "div" : "td"

  return (
    <Row
      role={list ? "listitem" : "row"}
      data-kind={kind}
      className={cn(ROW_GRID_CLASSES, "border-t border-edge-subtle")}
    >
      <Cell role={list ? undefined : "cell"} className="col-span-full py-5">
        <EmptyState
          size="sm"
          role={kind === "error" ? "alert" : undefined}
          icon={icon ?? (kind === "empty" ? undefined : MESSAGE_ICONS[kind])}
          title={title}
          description={description}
          action={action}
        />
      </Cell>
    </Row>
  )
}
