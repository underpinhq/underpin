import { FROM_LG, matchesMedia } from "./media"

/**
 * The view transition between a product's own rail and an area's (`AreaRail`): the rail's
 * body drifts 8px and fades out, and the new one drifts in from 8px the other way and fades
 * in (`styles.css`). Entering an area moves it left, leaving moves it right. The page beside
 * it swaps at once.
 */

/** The transition types `styles.css` answers for the rail. */
export type AreaRailType = "area-enter" | "area-leave"

/**
 * Whether the browser can tell one view transition from another, which the rail's step needs:
 * without types, a router that is handed a view transition cross-fades the whole page instead.
 * False on the server.
 */
export function hasViewTransitionTypes() {
  if (typeof CSS === "undefined") return false

  return CSS.supports?.("selector(:active-view-transition-type(a))") ?? false
}

/**
 * The view transition types for a navigation between two pages, or `false` for none. Pass the
 * router's two locations and a function that names a location's area, `undefined` for a page
 * outside every area. Answer from the two locations rather than from the link, so the
 * browser's Back travels the way the links do: TanStack Router's `defaultViewTransition.types`
 * hands this its `fromLocation` and `toLocation`.
 *
 * Nothing steps on the first page (no `from`), between two pages of one area, or under `lg`,
 * where the rail is hidden and the drawer closes as the page changes. Nor does anything step
 * without `matchMedia`, on the server or in a test without a DOM.
 */
export function getAreaRailTypes<Location>(
  from: Location | undefined,
  to: Location,
  findArea: (location: Location) => string | undefined,
): AreaRailType[] | false {
  if (from === undefined || !matchesMedia(FROM_LG)) return false

  const fromArea = findArea(from)
  const toArea = findArea(to)
  if (fromArea === toArea) return false

  return [toArea ? "area-enter" : "area-leave"]
}
