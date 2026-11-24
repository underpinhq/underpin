"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { useHotkeys } from "react-hotkeys-hook"

export interface Shortcut {
  /**
   * react-hotkeys-hook key string: `d`, `mod+k`, `shift+?`, `left`. Matched on the character the
   * key produces, so a letter is the key labelled with it on any layout.
   */
  keys: string

  /** Human label shown in the reference dialog, e.g. "Today". */
  label: string

  /** Section in the reference dialog, e.g. "Date range". Sections appear in registration order. */
  group: string

  handler: (event: KeyboardEvent) => void

  /** Default true. A disabled shortcut neither fires nor shows up in the reference dialog. */
  enabled?: boolean

  /** Fire while typing in inputs, textareas, selects and contenteditable. Default false. */
  enableOnFormTags?: boolean
}

export interface ShortcutGroup {
  group: string
  shortcuts: { keys: string; label: string }[]
}

/** What `findShortcutRow` reads off a key press: a DOM event or React's. */
export interface MenuKeyEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  target: EventTarget | null
}

// The registry the reference dialog is built from: every mounted shortcut's metadata, in
// registration order, behind a `useSyncExternalStore` snapshot.

type Registration = Pick<Shortcut, "group" | "keys" | "label">

const EMPTY: ShortcutGroup[] = []
const listeners = new Set<() => void>()

let registrations: Registration[] = []
let snapshot = EMPTY

/** Rebuilt once per change, so `useSyncExternalStore` sees a referentially stable snapshot. */
function publish() {
  const groups = new Map<string, ShortcutGroup>()
  const seen = new Set<string>()

  for (const { group, keys, label } of registrations) {
    const id = `${group}\t${keys}\t${label}`
    if (seen.has(id)) continue
    seen.add(id)

    const existing = groups.get(group) ?? { group, shortcuts: [] }
    existing.shortcuts.push({ keys, label })
    groups.set(group, existing)
  }

  snapshot = groups.size ? [...groups.values()] : EMPTY
  for (const listener of listeners) listener()
}

/** Add rows to the registry and get back the call that removes them. `useShortcuts` is the way in. */
export function registerShortcuts(entries: Registration[]) {
  registrations = [...registrations, ...entries]
  publish()

  return () => {
    registrations = registrations.filter(entry => !entries.includes(entry))
    publish()
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => void listeners.delete(onChange)
}

/** The current list outside React, for tests. */
export function getShortcutList() {
  return snapshot
}

/** The shortcuts mounted right now, grouped, for the reference dialog. Empty on the server. */
export function useShortcutList(): ShortcutGroup[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  )
}

// Matching a keystroke to a handler.

/**
 * `useKey`: match the character the key produced, not its physical position, so `d` is the key
 * labelled D on an AZERTY keyboard too. Form tags are filtered per shortcut below, and
 * `preventDefault` is ours: the library would run it before knowing whether anything matched.
 *
 * `capture`: an open Base UI popup (a menu, a select) calls `stopPropagation` on every printable
 * key to feed its own typeahead, so a listener on the document would never see the keys a
 * dropdown covers. Capturing runs the page's shortcuts first, and a match stops the key there.
 */
const HOTKEY_OPTIONS = {
  useKey: true,
  enableOnFormTags: true,
  enableOnContentEditable: true,
  eventListenerOptions: { capture: true },
}

/**
 * Widgets that take every key typed inside them: an open modal, and the popups that read a
 * printable key as typeahead.
 */
const KEY_OWNER_SELECTOR = '[role="dialog"],[role="menu"],[role="menubar"],[role="listbox"]'

/** Composite widgets that move their own focus with the keys below and leave the rest alone. */
const NAVIGATOR_SELECTOR = '[role="tablist"],[role="grid"],[role="radiogroup"]'
const NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]

/** A menu's rows of every kind: an item, a radio and a checkbox. */
const MENU_ROW_SELECTOR = '[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]'

const FORM_TAGS = ["INPUT", "TEXTAREA", "SELECT"]

function isFormTarget(target: Element | null) {
  return (
    !!target && (FORM_TAGS.includes(target.tagName) || (target as HTMLElement).isContentEditable)
  )
}

/**
 * A key string as the library reports the hotkey it matched, lower-cased and trimmed, so two can
 * be compared like for like. A shortcut badge names its key this way in `data-shortcut`.
 */
export function toHotkey(keys: string) {
  return keys.trim().toLowerCase()
}

/** The badge an open menu prints for `key`, found by the `data-shortcut` the badge carries. */
function findMenuBadge(menu: Element, key: string) {
  const hotkey = toHotkey(key)
  return [...menu.querySelectorAll<HTMLElement>("[data-shortcut]")].find(
    badge => badge.dataset.shortcut === hotkey,
  )
}

/**
 * Whether `key` is one an open menu prints outside its rows, a hint beside a control in the menu
 * such as the date range's "Show by B": it stays the page's shortcut, so pressing it does what
 * the hint says. A row's own badge belongs to the menu, which picks that row instead.
 */
function isMenuHint(owner: Element, target: Element, key: string) {
  if (!owner.matches('[role="menu"]') || isFormTarget(target)) return false
  const badge = findMenuBadge(owner, key)
  return !!badge && !badge.closest(MENU_ROW_SELECTOR)
}

/**
 * Whether a key typed over `target` belongs to the widget around it rather than to the page's
 * shortcuts. Anything typed inside an open modal belongs to that modal, the shortcuts the modal
 * registered itself included; that is the ceiling on one flat registry, and per-modal scopes
 * (react-hotkeys-hook's HotkeysProvider) are what lifts it. A menu or a listbox reads letters as
 * typeahead, so it keeps every key too, except the keys a menu prints: a row's badge picks that
 * row (`findShortcutRow`), and a hint outside the rows stays the page's. Tabs, a grid and a
 * radio group only step with the arrow keys, Home and End: stepping through a card's tabs must
 * not also step the date range, but a letter typed after clicking a tab still reaches the page.
 */
export function isWidgetKey(target: Element | null, key: string) {
  if (!target) return false
  const owner = target.closest(KEY_OWNER_SELECTOR)
  if (owner) return !isMenuHint(owner, target, key)
  return NAVIGATION_KEYS.includes(key) && !!target.closest(NAVIGATOR_SELECTOR)
}

/** A text field with nothing typed in it yet, so a key pressed there is not part of a query. */
function isEmptyField(target: Element) {
  return (
    (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
    target.value === ""
  )
}

/**
 * The row of an open menu whose badge shows the key pressed, for the menu to pick as a click
 * would. The letters printed beside the rows answer ahead of the menu's typeahead, which would
 * jump to the first row starting with that letter instead. Only a single character counts, with
 * no Ctrl, Cmd or Alt held (Shift may be, for a `?`). In a field in the menu, such as its search,
 * a key counts only while the field is empty: the search takes focus as the menu opens, and the
 * keys printed on its rows still work then, while a query once begun keeps every key it types.
 */
export function findShortcutRow(menu: Element, event: MenuKeyEvent) {
  const { key, ctrlKey, metaKey, altKey, target } = event
  if (ctrlKey || metaKey || altKey || key.length !== 1 || key === " ") return
  if (target instanceof Element && isFormTarget(target) && !isEmptyField(target)) return
  return findMenuBadge(menu, key)?.closest<HTMLElement>(MENU_ROW_SELECTOR) ?? undefined
}

/**
 * Register any number of shortcuts for as long as the component is mounted. One `useHotkeys` call
 * carries them all, since the list may change length between renders, and the callback routes
 * back to the right handler by the hotkey string the library matched.
 */
export function useShortcuts(shortcuts: Shortcut[]) {
  const active = shortcuts.filter(shortcut => shortcut.enabled !== false)

  // The latest handlers, read by the dispatch callback without re-registering anything.
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  })

  const hotkeys = [...new Set(active.map(shortcut => toHotkey(shortcut.keys)))].join(",")

  useHotkeys(
    hotkeys,
    (event, hotkeysEvent) => {
      if (event.repeat) return

      const target = event.target instanceof Element ? event.target : null

      if (isWidgetKey(target, event.key)) return

      const typing = isFormTarget(target)
      const matched = activeRef.current.filter(
        shortcut =>
          toHotkey(shortcut.keys) === hotkeysEvent.hotkey &&
          (shortcut.enableOnFormTags === true || !typing),
      )

      if (matched.length === 0) return

      // The key belongs to the shortcut, not to whatever it was typed over: an open dropdown
      // should not also run its typeahead on it.
      event.preventDefault()
      event.stopPropagation()
      for (const shortcut of matched) shortcut.handler(event)
    },
    HOTKEY_OPTIONS,
  )

  // Only the metadata reaches the dialog, so re-register when that changes, not on every
  // render.
  const signature = active
    .map(shortcut => `${shortcut.group}\t${shortcut.keys}\t${shortcut.label}`)
    .join("\n")

  useEffect(() => {
    return registerShortcuts(
      activeRef.current.map(({ group, keys, label }) => ({ group, keys, label })),
    )
  }, [signature])
}

/** A single shortcut, for the common case. */
export function useShortcut(shortcut: Shortcut) {
  useShortcuts([shortcut])
}

// Spelling a key string out as badge parts.

/** In Apple order (control, option, shift, command): [mac glyph, label elsewhere]. */
const MODIFIERS: Record<string, [string, string]> = {
  ctrl: ["⌃", "Ctrl"],
  alt: ["⌥", "Alt"],
  shift: ["⇧", "⇧"],
  mod: ["⌘", "Ctrl"],
}

/** Each modifier as a screen reader should say it: [on a mac, elsewhere]. */
const SPOKEN_MODIFIERS: Record<string, [string, string]> = {
  ctrl: ["Control", "Control"],
  alt: ["Option", "Alt"],
  shift: ["Shift", "Shift"],
  mod: ["Command", "Control"],
}

const KEY_LABELS: Record<string, string> = {
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
  esc: "Esc",
  escape: "Esc",
  enter: "↵",
  space: "Space",
}

/** Each modifier as `aria-keyshortcuts` names it: [on a mac, elsewhere]. */
const ARIA_MODIFIERS: Record<string, [string, string]> = {
  ctrl: ["Control", "Control"],
  alt: ["Alt", "Alt"],
  shift: ["Shift", "Shift"],
  mod: ["Meta", "Control"],
}

/** The keys whose `aria-keyshortcuts` name is not the key itself, capitalised. */
const ARIA_KEYS: Record<string, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  esc: "Escape",
  escape: "Escape",
  enter: "Enter",
  space: "Space",
}

/** The keys whose badge is a glyph a screen reader would name by its Unicode name. */
const SPOKEN_KEYS: Record<string, string> = {
  left: "Left arrow",
  right: "Right arrow",
  up: "Up arrow",
  down: "Down arrow",
  esc: "Escape",
  escape: "Escape",
  enter: "Enter",
}

/**
 * Deliberately the same rule react-hotkeys-hook applies internally to decide whether `mod`
 * means Meta or Control. It does not export it, and it only ever runs on a keystroke, so it
 * cannot be reused, but it is the authority on what `mod` actually matches. Detecting the
 * platform some other way (navigator.platform, userAgentData) risks a badge that says ⌘ while
 * the matcher is waiting for Ctrl, and the label would be lying about the shortcut.
 */
export function isMacUserAgent(userAgent: string): boolean {
  return /mac/i.test(userAgent) && !/iphone|ipad|ipod/i.test(userAgent)
}

/** Read at call time, not at import: on the server there is no navigator at all. */
function readIsMac() {
  return typeof navigator !== "undefined" && isMacUserAgent(navigator.userAgent)
}

// The platform never changes within a document, so the store never notifies.
function noSubscribe() {
  return () => {}
}

/**
 * Whether to spell shortcuts the Apple way. A hook rather than a module constant because this
 * package renders under SSR: read at import time, the server produced "Ctrl" and the client
 * hydrated "⌘", which is a hydration mismatch on every shortcut badge. Returning false as the
 * server snapshot makes the first client render agree, then React re-renders with the truth.
 */
export function useIsMac() {
  return useSyncExternalStore(noSubscribe, readIsMac, () => false)
}

interface ParsedKeys {
  /** In Apple order. */
  modifiers: string[]
  key: string
}

/** A key string split into its modifiers, in Apple order, and its key. */
function parseKeys(keys: string): ParsedKeys {
  const parts = toHotkey(keys)
    .split("+")
    .map(part => part.trim())
  const key = parts.find(part => !(part in MODIFIERS)) ?? ""
  const written = parts.filter(part => part in MODIFIERS)

  // `shift+?` is typed as one key; the shift is only there so the library can match it.
  const shiftedSymbol = written.length === 1 && written[0] === "shift" && /^[^a-z0-9]$/.test(key)
  const modifiers = shiftedSymbol
    ? []
    : Object.keys(MODIFIERS).filter(modifier => written.includes(modifier))

  return { modifiers, key }
}

function formatKeyName(key: string) {
  return `${key.charAt(0).toUpperCase()}${key.slice(1)}`
}

/** A key string as badge parts: the modifiers in Apple order, then the key. Platform injectable for tests. */
export function formatKeys(keys: string, mac = readIsMac()): string[] {
  const { modifiers, key } = parseKeys(keys)

  return [
    ...modifiers.map(modifier => MODIFIERS[modifier]?.[mac ? 0 : 1] ?? modifier),
    KEY_LABELS[key] ?? formatKeyName(key),
  ]
}

/**
 * A key string as a screen reader should say it ("Command K"): the badge's glyphs would be read
 * by their Unicode names, "place of interest sign" for ⌘. Platform injectable for tests.
 */
export function formatSpokenKeys(keys: string, mac = readIsMac()) {
  const { modifiers, key } = parseKeys(keys)

  return [
    ...modifiers.map(modifier => SPOKEN_MODIFIERS[modifier]?.[mac ? 0 : 1] ?? modifier),
    SPOKEN_KEYS[key] ?? formatKeyName(key),
  ].join(" ")
}

/**
 * A key string as the `aria-keyshortcuts` attribute writes it ("Meta+K"), so assistive
 * technology announces the shortcut without it joining the control's name. Platform injectable
 * for tests.
 */
export function formatAriaKeys(keys: string, mac = readIsMac()) {
  const { modifiers, key } = parseKeys(keys)

  return [
    ...modifiers.map(modifier => ARIA_MODIFIERS[modifier]?.[mac ? 0 : 1] ?? modifier),
    ARIA_KEYS[key] ?? formatKeyName(key),
  ].join("+")
}
