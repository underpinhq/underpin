"use client"

import { startTransition, useEffect, useState, useSyncExternalStore } from "react"

/**
 * Below Tailwind's `sm` (40rem), i.e. the phone layout. Kept as a constant so this JS-driven
 * switch flips on exactly the same pixel as the `max-sm:` classes components style with.
 */
const BELOW_SM = "(max-width: 39.9375rem)"

/** Tailwind's `lg` and up, where an app shell has room for a side rail. */
export const FROM_LG = "(min-width: 64rem)"

/** A mouse or trackpad: the device the `pointer-fine:` variant styles for. */
export const POINTER_FINE = "(pointer: fine)"

interface MediaQueryStore {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => boolean
}

// One store per query string, so every component watching the same query shares a listener
// and `useSyncExternalStore` gets the referentially stable callbacks it compares on.
const stores = new Map<string, MediaQueryStore>()

/**
 * Whether a media query matches right now, for a callback. False where there is no
 * `matchMedia`, as on the server. A render reads `useMediaQuery` instead, which is false on
 * the server and re-renders when the answer changes.
 */
export function matchesMedia(query: string): boolean {
  if (typeof matchMedia === "undefined") return false

  return matchMedia(query).matches
}

// `matchMedia` is only ever touched inside these callbacks, which is what keeps the module
// importable on the server.
function storeFor(query: string): MediaQueryStore {
  const existing = stores.get(query)
  if (existing) return existing

  const store: MediaQueryStore = {
    subscribe(onChange) {
      const list = matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    getSnapshot() {
      return matchesMedia(query)
    },
  }
  stores.set(query, store)

  return store
}

function serverSnapshot() {
  return false
}

/**
 * Whether a media query matches, re-rendering when that changes. False on the server and
 * through hydration, so the first client render matches the markup; React then re-renders
 * with the truth. Pass a module constant: the store is keyed on the string.
 */
export function useMediaQuery(query: string): boolean {
  const { subscribe, getSnapshot } = storeFor(query)

  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}

/**
 * Whether the viewport is under `sm`. A component that swaps on it remounts when the
 * breakpoint is crossed, which only ever happens on a resize.
 */
export function useBelowSm() {
  return useMediaQuery(BELOW_SM)
}

/**
 * Whether a popup opening now takes the phone's bottom sheet: true under `sm`. The answer is
 * read once, when the caller mounts, and held. Call it from inside the popup's portal, which
 * mounts as the popup opens and unmounts once it has closed: a popup then keeps one shape for
 * as long as it is open, and a resize across `sm` neither moves nor remounts it.
 */
export function usePopupSheet() {
  const [sheet] = useState(() => matchesMedia(BELOW_SM))

  return sheet
}

/**
 * Whether a popup takes the phone's bottom sheet, for a caller that renders the sheet or a
 * popover itself rather than through `Dialog`. It follows the viewport while `open`
 * is false and holds while it is true, so a resize across `sm` neither swaps the component in
 * use nor drops what is typed in it.
 */
export function useSheetWhileOpen(open: boolean) {
  const belowSm = useBelowSm()
  const [sheet, setSheet] = useState(belowSm)

  // Adjusting state while rendering: only a closed popup takes up a new answer.
  if (!open && sheet !== belowSm) setSheet(belowSm)

  return sheet
}

interface ElementWidthOptions {
  /** Rounds the width down to a multiple of this many pixels. */
  step?: number
  /** Applies a new width as a transition. Default true. */
  deferred?: boolean
}

/**
 * The width of the element the caller holds in state, in pixels, rounded down to a multiple
 * of `step`, and `undefined` until it has been measured. The rounding is what makes the
 * reading usable as a key: a drag-resize would otherwise report every pixel on the way, and
 * anything derived from the width (a lattice, a bucket count) would be rebuilt on each one.
 *
 * The element comes from a callback ref (`ref={setElement}`) rather than a `RefObject`, so
 * one that mounts later than the hook is measured as soon as it arrives: a `RefObject` is the
 * same object on every render, so an effect keyed on it never runs again, and an element
 * mounted after an error state gave way would never be observed at all.
 *
 * The new width arrives as a transition by default, so a drag-resize stays responsive while the
 * work behind it re-runs. A transition waits on every other pending one, so while a page loads
 * its data the first width can land a second late: `deferred: false` applies it at once, for
 * a layout that reads wrong until measured.
 */
export function useElementWidth(
  element: HTMLElement | null,
  { step = 1, deferred = true }: ElementWidthOptions = {},
) {
  const [width, setWidth] = useState<number>()

  useEffect(() => {
    if (!element) return

    function apply(measured: number) {
      const next = measured > 0 ? Math.floor(measured / step) * step : undefined
      if (deferred) startTransition(() => setWidth(next))
      else setWidth(next)
    }

    // Urgent means now: layout already knows the width a frame before the observer reports it.
    if (!deferred) apply(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => apply(entry?.contentRect.width ?? 0))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, step, deferred])

  return width
}
