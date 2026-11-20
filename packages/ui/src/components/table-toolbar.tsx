"use client"

import type { ComponentProps, ReactNode } from "react"
import { CancelIcon, PlusCircleIcon } from "../lib/icons"
import { interactiveVariants } from "../lib/interactive"
import { cn } from "../lib/variants"
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./menu"

export interface TableFacetOption {
  value: string
  label: ReactNode
}

const FACET_TRIGGER_CLASSES = cn(
  interactiveVariants(),
  "inline-flex h-control items-center gap-1.5 rounded-md border pr-3 pl-2.5 font-medium text-control text-ink",
  "hover:bg-fill-subtle data-popup-open:bg-fill-subtle [&_svg]:size-3.5",
  // Empty, it is a dashed outline with no lift; with a value it is a raised surface.
  "border-dashed border-edge",
  "data-active:border-solid data-active:bg-surface data-active:pr-1.5 data-active:shadow-control",
)

const CHIP_PART_CLASSES = cn(
  interactiveVariants(),
  "inline-flex items-center px-2 outline-offset-[-2px] hover:bg-fill-subtle data-popup-open:bg-fill-subtle",
)

interface ChipPartProps {
  /** The menu that changes this part: `MenuItem`s. Left out, the part is plain text. */
  menu?: ReactNode
  /** Names the part's menu for a screen reader. */
  label: string
  className?: string
  children: ReactNode
}

function ChipPart({ menu, label, className, children }: ChipPartProps) {
  if (!menu) {
    return <span className={cn("inline-flex items-center px-2", className)}>{children}</span>
  }

  return (
    <Menu>
      <MenuTrigger className={cn(CHIP_PART_CLASSES, className)}>{children}</MenuTrigger>
      <MenuContent label={label} align="start">
        {menu}
      </MenuContent>
    </Menu>
  )
}

interface TableToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  /** A `SearchInput`, 200px wide; on a phone it fills its own row. */
  search?: ReactNode
  /** The filters: a `TableFacetFilter` per common field, the Filter button, its chips. */
  children?: ReactNode
  /** The sort picker (only for an order no column shows) and the column picker. */
  end?: ReactNode
}

/**
 * The row above a table: the search, then the filters, which wrap onto a second row, then the
 * pickers at the end. Page actions ("New site") belong in the page header, never here.
 */
export function TableToolbar({ search, children, end, className, ...props }: TableToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
      {search && <div className="w-50 max-sm:w-full *:w-full">{search}</div>}
      {children}
      {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
    </div>
  )
}

interface TableFacetFilterProps {
  /** The field: "Category", "Status". */
  label: string
  options: TableFacetOption[]
  /** The chosen values, empty while the filter is off. */
  value: string[]
  onValueChange: (value: string[]) => void
  /** What the trigger shows for several values. */
  formatSelected?: (count: number) => string
  clearLabel?: string
}

/**
 * A column filter in the toolbar, 32px like a button. Off, it is a dashed button with a plus;
 * on, it shows the chosen value, or how many are chosen, after a divider. Its menu ticks values
 * on and off and clears the filter. A filter with a relation (is not, contains) is a
 * `TableFilterChip`.
 */
export function TableFacetFilter({
  label,
  options,
  value,
  onValueChange,
  formatSelected = count => `${count} selected`,
  clearLabel = "Clear filter",
}: TableFacetFilterProps) {
  const chosen = options.filter(option => value.includes(option.value))
  const summary = chosen.length === 1 ? chosen[0]?.label : formatSelected(chosen.length)

  return (
    <Menu>
      <MenuTrigger
        data-active={chosen.length > 0 ? "" : undefined}
        className={FACET_TRIGGER_CLASSES}
      >
        <PlusCircleIcon className="text-ink-secondary" />
        {label}
        {chosen.length > 0 && (
          <>
            <span aria-hidden className="h-4 w-px bg-edge" />
            <span className="inline-flex h-5 items-center rounded-sm bg-fill px-1.5 text-xs">
              {summary}
            </span>
          </>
        )}
      </MenuTrigger>
      <MenuContent label={label} align="start">
        {options.map(option => (
          <MenuCheckboxItem
            key={option.value}
            checked={value.includes(option.value)}
            onCheckedChange={checked =>
              onValueChange(
                checked
                  ? [...value, option.value]
                  : value.filter(chosenValue => chosenValue !== option.value),
              )
            }
          >
            {option.label}
          </MenuCheckboxItem>
        ))}
        {chosen.length > 0 && (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => onValueChange([])}>{clearLabel}</MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  )
}

interface TableFilterChipProps {
  field: ReactNode
  /** The relation: "is", "is not", "contains", "before". */
  operator: ReactNode
  value: ReactNode
  /** The items of each part's menu. A part with none is plain text. */
  fieldMenu?: ReactNode
  operatorMenu?: ReactNode
  valueMenu?: ReactNode
  onRemove: () => void
  removeLabel?: string
  className?: string
}

/**
 * One filter added from the Filter menu: the field, the relation and the value, each opening its
 * own menu, then a cross that removes it. Chips follow the filter buttons and wrap.
 */
export function TableFilterChip({
  field,
  operator,
  value,
  fieldMenu,
  operatorMenu,
  valueMenu,
  onRemove,
  removeLabel = "Remove filter",
  className,
}: TableFilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-control items-stretch divide-x divide-edge-subtle overflow-clip rounded-md border bg-surface text-control shadow-control",
        className,
      )}
    >
      <ChipPart menu={fieldMenu} label="Field" className="pl-2.5 text-ink-secondary">
        {field}
      </ChipPart>
      <ChipPart menu={operatorMenu} label="Relation" className="text-ink-muted">
        {operator}
      </ChipPart>
      <ChipPart menu={valueMenu} label="Value" className="font-medium text-ink">
        {value}
      </ChipPart>
      <button
        type="button"
        aria-label={removeLabel}
        className={cn(CHIP_PART_CLASSES, "w-7 justify-center px-0 text-ink-muted hover:text-ink")}
        onClick={onRemove}
      >
        <CancelIcon className="size-3" />
      </button>
    </span>
  )
}
