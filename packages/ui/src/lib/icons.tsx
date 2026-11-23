import {
  Add01Icon,
  Alert02Icon,
  AlertCircleIcon as AlertCircleDef,
  ApproximatelyEqualIcon as ApproximatelyEqualDef,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CancelCircleIcon as CancelCircleDef,
  CheckmarkCircle02Icon,
  DragDropVerticalIcon,
  ListFilterIcon,
  ComputerIcon as ComputerDef,
  Copy01Icon,
  HelpCircleIcon,
  InformationCircleIcon,
  Loading03Icon,
  Moon02Icon,
  MoreHorizontalCircle01Icon,
  PlusSignCircleIcon,
  Refresh01Icon,
  Remove01Icon,
  Search01Icon,
  Sun03Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"
import type { ComponentProps } from "react"
import { icon } from "./icon"

// The handful of structural glyphs the package's own components render. This file lives in
// `lib/` rather than `components/` so the `"./*"` wildcard export, which maps into
// `components/`, never exposes it.

export const AlertIcon = icon(Alert02Icon, "AlertIcon")
export const AlertCircleIcon = icon(AlertCircleDef, "AlertCircleIcon")
export const ApproximatelyEqualIcon = icon(ApproximatelyEqualDef, "ApproximatelyEqualIcon")
export const ArrowDownIcon = icon(ArrowDown02Icon, "ArrowDownIcon")
export const ArrowUpIcon = icon(ArrowUp02Icon, "ArrowUpIcon")
export const ArrowUpRightIcon = icon(ArrowUpRight01Icon, "ArrowUpRightIcon")
export const CalendarIcon = icon(Calendar03Icon, "CalendarIcon")
export const CancelIcon = icon(Cancel01Icon, "CancelIcon")
export const CancelCircleIcon = icon(CancelCircleDef, "CancelCircleIcon")
export const CheckIcon = icon(Tick02Icon, "CheckIcon")
export const CheckCircleIcon = icon(CheckmarkCircle02Icon, "CheckCircleIcon")
export const ChevronDownIcon = icon(ArrowDown01Icon, "ChevronDownIcon")
export const ChevronsLeftIcon = icon(ArrowLeftDoubleIcon, "ChevronsLeftIcon")
export const ChevronsRightIcon = icon(ArrowRightDoubleIcon, "ChevronsRightIcon")
export const ChevronLeftIcon = icon(ArrowLeft01Icon, "ChevronLeftIcon")
export const ChevronRightIcon = icon(ArrowRight01Icon, "ChevronRightIcon")
export const ChevronUpIcon = icon(ArrowUp01Icon, "ChevronUpIcon")
export const ChevronsUpDownIcon = icon(UnfoldMoreIcon, "ChevronsUpDownIcon")
export const ComputerIcon = icon(ComputerDef, "ComputerIcon")
export const CopyIcon = icon(Copy01Icon, "CopyIcon")
export const DashIcon = icon(Remove01Icon, "DashIcon")
export const FilterIcon = icon(ListFilterIcon, "FilterIcon")
export const GripIcon = icon(DragDropVerticalIcon, "GripIcon")
export const HelpIcon = icon(HelpCircleIcon, "HelpIcon")
export const InfoIcon = icon(InformationCircleIcon, "InfoIcon")
export const LoadingIcon = icon(Loading03Icon, "LoadingIcon")
export const MoonIcon = icon(Moon02Icon, "MoonIcon")
// Filled: a hollow dot all but disappears at the size a menu trigger draws it.
export const MoreIcon = icon(MoreHorizontalCircle01Icon, "MoreIcon", { fill: "currentColor" })
export const PlusIcon = icon(Add01Icon, "PlusIcon")
export const PlusCircleIcon = icon(PlusSignCircleIcon, "PlusCircleIcon")
export const RefreshIcon = icon(Refresh01Icon, "RefreshIcon")
export const SearchIcon = icon(Search01Icon, "SearchIcon")
export const SunIcon = icon(Sun03Icon, "SunIcon")

interface SidebarIconProps extends ComponentProps<"svg"> {
  /** Fills the panel's left pane, for the toggle of a drawer that is open. */
  open?: boolean
}

/**
 * The phone shell's drawer toggle: an outlined panel whose left pane is filled in both states,
 * wide while the drawer is open and narrowed to a bar while it is closed. Hand drawn, since
 * Hugeicons' free set has no panel glyph in this style.
 */
export function SidebarIcon({ open, ...props }: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4" width="18" height="16" rx="4.5" />
      {/* The pane keeps its left edge, its height and its fill in both states, so opening the
          drawer only widens it. `rx` clamps itself to half the width at the narrow end. */}
      <rect
        x="6.25"
        y="7.5"
        width={open ? 4 : 1.5}
        height="9"
        rx="1.25"
        fill="currentColor"
        stroke="none"
        className="transition-[width] duration-150 ease-out-expo motion-reduce:transition-none"
      />
    </svg>
  )
}
