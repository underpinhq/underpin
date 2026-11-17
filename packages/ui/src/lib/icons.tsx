import {
  Alert02Icon,
  AlertCircleIcon as AlertCircleDef,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CancelCircleIcon as CancelCircleDef,
  CheckmarkCircle02Icon,
  ComputerIcon as ComputerDef,
  Copy01Icon,
  HelpCircleIcon,
  InformationCircleIcon,
  Loading03Icon,
  Moon02Icon,
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
export const ArrowUpRightIcon = icon(ArrowUpRight01Icon, "ArrowUpRightIcon")
export const CalendarIcon = icon(Calendar03Icon, "CalendarIcon")
export const CancelIcon = icon(Cancel01Icon, "CancelIcon")
export const CancelCircleIcon = icon(CancelCircleDef, "CancelCircleIcon")
export const CheckIcon = icon(Tick02Icon, "CheckIcon")
export const CheckCircleIcon = icon(CheckmarkCircle02Icon, "CheckCircleIcon")
export const ChevronDownIcon = icon(ArrowDown01Icon, "ChevronDownIcon")
export const ChevronLeftIcon = icon(ArrowLeft01Icon, "ChevronLeftIcon")
export const ChevronRightIcon = icon(ArrowRight01Icon, "ChevronRightIcon")
export const ChevronUpIcon = icon(ArrowUp01Icon, "ChevronUpIcon")
export const ChevronsUpDownIcon = icon(UnfoldMoreIcon, "ChevronsUpDownIcon")
export const ComputerIcon = icon(ComputerDef, "ComputerIcon")
export const CopyIcon = icon(Copy01Icon, "CopyIcon")
export const DashIcon = icon(Remove01Icon, "DashIcon")
export const HelpIcon = icon(HelpCircleIcon, "HelpIcon")
export const InfoIcon = icon(InformationCircleIcon, "InfoIcon")
export const LoadingIcon = icon(Loading03Icon, "LoadingIcon")
export const MoonIcon = icon(Moon02Icon, "MoonIcon")
export const SearchIcon = icon(Search01Icon, "SearchIcon")
export const SunIcon = icon(Sun03Icon, "SunIcon")
