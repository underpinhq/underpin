"use client"

import { useSyncExternalStore } from "react"
import { ComputerIcon, MoonIcon, SunIcon } from "../lib/icons"
import {
  SegmentedControl,
  SegmentedControlItem,
  type SegmentedControlProps,
} from "./segmented-control"

export type Theme = "system" | "light" | "dark"

const STORAGE_KEY = "theme"
const OS_DARK_QUERY = "(prefers-color-scheme: dark)"
const THEMES: readonly Theme[] = ["system", "light", "dark"]

/**
 * Tiny module store behind `useTheme`. One value shared by every subscriber, kept in step with
 * `localStorage` (and with other tabs through the `storage` event) and mirrored onto
 * `<html data-theme>`, which is what the stylesheet's `color-scheme` rules key on.
 */
const listeners = new Set<() => void>()
let current: Theme | undefined
// Kept, not re-queried: `matchMedia` returns a new list per call, and a listener only comes off
// the list it was added to.
let osScheme: MediaQueryList | undefined

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.includes(value as Theme)
}

function readStored(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : "system"
  } catch {
    // Storage can be unavailable (privacy mode, sandboxed iframe) — fall back to the OS.
    return "system"
  }
}

function writeStored(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage being unavailable only costs persistence; the in-memory value still applies.
  }
}

/**
 * `system` clears the attribute so `color-scheme: light dark` follows the OS; anything else
 * pins it.
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement

  if (theme === "system") delete root.dataset.theme
  else root.dataset.theme = theme
}

/**
 * Narrows every transition to geometry until the next style pass is done. A theme change swaps
 * every token at once, and anything that transitions a colour (a card's edge, a button's fill)
 * would otherwise tween into the new scheme while the rest of the page flips. Movement keeps
 * its transition: the theme picker's pill slides to the chosen option in the same frames.
 * Called before the change, or from the OS scheme's change event, which fires before the
 * browser restyles.
 */
function suspendColorTransitions() {
  const style = document.createElement("style")
  style.textContent =
    "*,*::before,*::after{transition-property:translate,transform,width,height!important}"
  document.head.append(style)

  // Two frames: a callback queued from the media query event can still run before that
  // frame's style pass, and the override has to outlive it.
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()))
}

function emit() {
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent) {
  // `key === null` is a `clear()` from another tab; treat it as a reset.
  if (event.key !== null && event.key !== STORAGE_KEY) return

  current = readStored()
  suspendColorTransitions()
  applyTheme(current)
  emit()
}

function onSchemeChange() {
  // A pinned theme ignores the OS; only `system` repaints when it flips.
  if (current === "system") suspendColorTransitions()
}

function getSnapshot(): Theme {
  current ??= readStored()
  return current
}

function getServerSnapshot(): Theme {
  return "system"
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage)
    osScheme = window.matchMedia(OS_DARK_QUERY)
    osScheme.addEventListener("change", onSchemeChange)
    // Apps that skip the inline script still land on the stored theme, one paint late.
    applyTheme(getSnapshot())
  }

  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return

    window.removeEventListener("storage", onStorage)
    osScheme?.removeEventListener("change", onSchemeChange)
  }
}

function setTheme(theme: Theme) {
  if (theme === current) return

  current = theme
  writeStored(theme)
  suspendColorTransitions()
  applyTheme(theme)
  emit()
}

/**
 * The current theme and its setter. Persists to `localStorage["theme"]`, stays in sync across
 * tabs, and drives the stylesheet's `light-dark()` tokens by setting `data-theme` on `<html>`
 * (`system` removes it so the OS decides). SSR-safe: the server renders `system`.
 *
 * The hook only applies the stored theme once the first subscriber mounts. To avoid a flash of
 * the wrong scheme, apply it before first paint with this inline script in `<head>`:
 *
 * ```html
 * <script>try{var t=localStorage.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>
 * ```
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return [theme, setTheme]
}

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: ComputerIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const

interface ThemeSelectProps extends Omit<
  SegmentedControlProps<Theme>,
  "value" | "defaultValue" | "onValueChange" | "variant" | "size"
> {
  /**
   * The smallest track with one icon per theme, for a menu row where the labelled control
   * would not fit.
   */
  compact?: boolean
}

/**
 * Segmented System / Light / Dark control bound to `useTheme`, for a settings page or an
 * account menu.
 */
export function ThemeSelect({ compact, ...props }: ThemeSelectProps) {
  const [theme, setTheme] = useTheme()

  return (
    <SegmentedControl
      value={theme}
      size={compact ? "xs" : "md"}
      aria-label="Theme"
      onValueChange={setTheme}
      {...props}
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <SegmentedControlItem key={value} value={value} aria-label={compact ? label : undefined}>
          {compact ? <Icon /> : label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
