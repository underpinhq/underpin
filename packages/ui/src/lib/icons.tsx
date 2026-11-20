import {
  Alert02Icon,
  AlertCircleIcon as AlertCircleDef,
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
import { icon } from "./icon"

// The handful of structural glyphs the package's own components render. This file lives in
// `lib/` rather than `components/` so the `"./*"` wildcard export, which maps into
// `components/`, never exposes it.

export const AlertIcon = icon(Alert02Icon, "AlertIcon")
export const AlertCircleIcon = icon(AlertCircleDef, "AlertCircleIcon")
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
export const HelpIcon = icon(HelpCircleIcon, "HelpIcon")
export const InfoIcon = icon(InformationCircleIcon, "InfoIcon")
export const LoadingIcon = icon(Loading03Icon, "LoadingIcon")
export const MoonIcon = icon(Moon02Icon, "MoonIcon")
// Filled: a hollow dot all but disappears at the size a menu trigger draws it.
export const MoreIcon = icon(MoreHorizontalCircle01Icon, "MoreIcon", { fill: "currentColor" })
export const PlusCircleIcon = icon(PlusSignCircleIcon, "PlusCircleIcon")
export const RefreshIcon = icon(Refresh01Icon, "RefreshIcon")
export const SearchIcon = icon(Search01Icon, "SearchIcon")
export const SunIcon = icon(Sun03Icon, "SunIcon")
