import { cn } from "./variants"

/**
 * Enter/exit animation classes for Base UI popups (Menu, Select, Popover, …).
 * Keyed on Base UI's `data-open`/`data-closed` state attributes and the positioner's
 * `data-[side=*]`, with the zoom anchored to the `--transform-origin` Base UI exposes on
 * the popup. Animation utilities (and their `duration-*`/`ease-*` bindings) come from
 * `tailwindcss-animate`.
 *
 * The `data-closed` animation is essential: Base UI keeps the popup mounted until the
 * exit animation finishes, so without it there is no close animation at all. The exit holds its
 * last frame (`fill-mode-forwards`): a keyframe animation otherwise hands the popup back to full
 * opacity the moment it ends, and any frame painted before the unmount flashes the whole panel.
 *
 * Feel: a 97% zoom out of the trigger and an 8px directional slide. Enter is 150ms on
 * `--ease-out-expo`; exit is a plainer, faster 100ms ease-out, since a popup on its way out has
 * nothing to announce. `data-instant` collapses the duration to 0 so Base UI's instant transitions
 * (keyboard nav between items, grouped tooltips) don't stutter.
 */
export const popoverAnimationClasses = [
  "origin-(--transform-origin) data-instant:duration-0",
  "data-open:duration-150 data-open:animate-in data-open:ease-out-expo data-open:fade-in-0 data-open:zoom-in-97",
  "data-closed:duration-100 data-closed:animate-out data-closed:fill-mode-forwards data-closed:ease-out data-closed:fade-out-0 data-closed:zoom-out-97",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=bottom]:slide-out-to-top-2",
  "data-[side=left]:slide-in-from-right-2 data-[side=left]:slide-out-to-right-2",
  "data-[side=right]:slide-in-from-left-2 data-[side=right]:slide-out-to-left-2",
  "data-[side=top]:slide-in-from-bottom-2 data-[side=top]:slide-out-to-bottom-2",
]

/**
 * How a tooltip comes and goes. Transitions rather than the popups' keyframes, so a pointer that
 * leaves and returns mid-way turns the panel around from where it is instead of restarting it.
 * The panel grows out of its arrow's tip (`--transform-origin`) from 96% while it fades in, and
 * only fades on the way out, faster than it came: nothing travels, since a tooltip opens on
 * every pass of the pointer and movement there costs attention each time. The scale is left out
 * for a reader who asks for reduced motion, and `data-instant` (a keyboard focus, a sibling
 * taking over within the provider's timeout, a dismissal) skips the transition altogether.
 */
export const tooltipAnimationClasses = [
  "origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out-expo",
  "data-starting-style:opacity-0 motion-safe:data-starting-style:scale-96",
  "data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-out",
  "data-instant:transition-none",
]

/**
 * The invisible layer between an anchored popup (a menu, a select, a popover) and the page. A
 * mouse passes through it, so one click closes the popup and reaches the control underneath. A
 * finger stops on it: a tap meant to dismiss the popup must not land on a link, and `touch-none`
 * stops a drag beside the popup from scrolling the page.
 */
export const popupBackdropClasses =
  "pointer-events-none fixed inset-0 z-50 touch-none pointer-coarse:pointer-events-auto"

/**
 * The panel every floating list and popover is drawn on: popover fill, `lg` corners, and a 1px
 * border over `shadow-popup`. The corners nest the rows inside: the list's 4px padding plus the
 * row's `sm` radius. Menu, Combobox, Select, Autocomplete, Popover and the toast share it so
 * they read as the same card.
 */
export const popupSurfaceClasses =
  "rounded-lg border border-edge-float bg-overlay text-ink shadow-popup"

/**
 * A single chevron in a button's suffix, turning over while the button's menu is open so it
 * points at what it opened. Never on a two-way chevron, which looks the same turned over and only
 * spins. A plain ease-out: the half turn is long, and `--ease-out-expo` covers nearly all of it
 * in the first few frames, which reads as a flicker.
 */
export const chevronTurnClasses =
  "transition-[rotate] duration-200 ease-out group-aria-expanded/button:rotate-180"

export const POPUP_SIDE_OFFSET = 6

/**
 * The surface every tooltip on the site is drawn on, Base UI's and the chart's alike: the popup
 * panel at caption size under the lower tooltip shadow, so a tooltip reads as the same card as
 * a menu or a popover, only smaller and closer to the page. `tooltipLabelClasses` mutes a label
 * against it and `tooltipRuleClasses` draws a rule inside it.
 */
export const tooltipSurfaceClasses =
  "rounded-md border border-edge-float bg-overlay text-ink shadow-tooltip text-xs"
export const tooltipLabelClasses = "text-ink-muted"
export const tooltipRuleClasses = "border-edge"

/**
 * Small muted label over a group of items: sidebar sections, menu groups. One place so every
 * eyebrow in the app shares its size and weight.
 */
export const eyebrowClasses = "text-xs font-medium text-ink-muted"

/**
 * A headline number: a stat, a usage total, a site's visitors. Every figure shares the weight
 * and tracking; the caller sets the size, `text-figure` or a fluid one with `leading-figure`.
 */
export const figureClasses = "font-display font-semibold tracking-figure tabular-nums"

/**
 * A 20px glyph on a raised tile over a heading: an empty state, a step reached from a link. The
 * tile is drawn like a segmented control's chosen option, an edged surface lifted by the control
 * shadow. The caller sets the tile's size.
 */
export const iconTileClasses =
  "flex shrink-0 items-center justify-center rounded-lg border border-edge-strong bg-surface text-ink-secondary shadow-control [&_svg]:size-5"

/**
 * Muted supporting copy under a heading, label, or control: one step under the 14px label it
 * sits beneath, on the 20px reading line, since a description is a sentence to read rather
 * than a label to scan. It stops at a readable line length, however wide its row grows; a
 * container that borrows the type sets `max-w-none`.
 */
export const descriptionClasses = "max-w-prose text-copy text-ink-muted"

/**
 * A row of a table or a list, pressed: `bg-fill`, past its hover fill and short of the strong
 * fill a pressed menu item takes, since a row is a far larger box. Only the press fades. A
 * pointer sweeping down the list lights and clears each row at once, since a fading row trails
 * the cursor and reads as lag. The row's link or button carries `data-press-target`, so a press
 * on a smaller control in the row leaves the row alone. A row opened from the keyboard keeps its
 * focus ring and hover fill instead: the ring already marks it, and a dark fill inside the ring
 * reads as a selection.
 */
export const rowPressClasses = [
  "transition-colors duration-0 ease-out",
  "has-[[data-press-target]:active:not(:focus-visible)]:bg-fill has-[[data-press-target]:active:not(:focus-visible)]:duration-150",
].join(" ")

/**
 * One row in any floating list. Vertical padding, control text, secondary foreground,
 * disabled state, and the highlight. The highlight covers both `focus` (Menu, Select) and
 * `data-highlighted` (Combobox, Autocomplete) because Base UI drives those primitives
 * differently; carrying both selectors keeps every list lighting up the same way. Horizontal
 * padding stays on the component: `px-2`, or `pl-8` on an inset menu item. `cn` does not treat
 * those as the same group, so a shared `px-2` would sit beside the inset and fight it. Under a
 * finger every list's rows grow from 28px to 32px, and no further: a taller row reads as
 * padding rather than a row, and stretches a long list past the screen.
 */
export const popupItemClasses = cn(
  "flex cursor-pointer select-none items-center rounded-sm py-1.5 pointer-coarse:min-h-8",
  "text-control",
  "text-ink-secondary outline-none focus:bg-fill focus:text-ink data-highlighted:bg-fill data-highlighted:text-ink data-disabled:cursor-not-allowed data-disabled:opacity-50",
  // The highlight is the only keyboard cue in a list, so it takes the full fill and the ink rather
  // than a hover tint. A press goes a step past it and sinks, so the row answers before the menu
  // closes. A disabled row does not answer. Only the press fades: the highlight follows the
  // pointer, so it moves at once, as a native menu's does, and never trails the cursor.
  "transition-[background-color,color,box-shadow] duration-0 ease-out not-data-disabled:active:bg-fill-strong not-data-disabled:active:text-ink not-data-disabled:active:duration-75",
  "not-data-disabled:active:shadow-well",
)

/**
 * Group heading and divider around the rows of a floating list. The list itself pads with
 * `p-1` so a separator's `-mx-1` reaches the panel edge.
 */
export const popupGroupLabelClasses = cn("px-2 pt-1.5 pb-1", eyebrowClasses)
export const popupSeparatorClasses = "-mx-1 my-1 h-px shrink-0 bg-edge"

/**
 * The line that stands in for a floating list while nothing matches, or reports its loading
 * state. It collapses to nothing while it has no text.
 */
export const popupEmptyClasses = cn(
  "px-3 py-2",
  "text-control",
  "text-ink-muted empty:m-0 empty:p-0",
)

/**
 * A string a machine wrote: an id, a path, an event name, a header value. Mono, so a column of
 * them lines up on its stem and the one that differs is the one you see, and a step down from
 * the body size, since mono carries more ink per character and reads larger beside the sans it
 * sits next to.
 */
export const monoTextClasses = "font-mono text-xs"

/**
 * A table whose hairlines are borders on its cells rather than on its rows. The collapsed
 * model splits every 1px line between the two rows it parts, which puts the rows on half
 * pixels and a stuck heading half a pixel off its slot; the separate model keeps a border
 * inside its cell, where it moves with the cell when the cell sticks. Row borders do not
 * paint in this model, so every hairline is on a `th` or a `td`.
 */
export const separateTableClasses = "w-full table-fixed border-separate border-spacing-0"

/**
 * The heading cell that cuts a table into runs: a day of a feed, a group of a detail view.
 * Set in the foreground weight rather than as a muted eyebrow, since it is what a reader
 * scans for. It sticks while its own `<tbody>` is in view and is pushed out by the next one,
 * so the run a reader is in is always named at the top. Opaque: the rows slide under it. The
 * caller sets `top-*`, which depends on what else is pinned above the table.
 */
export const groupHeadingClasses = [
  "sticky z-10 h-8 border-b text-left font-semibold text-ink text-xs",
  "bg-[color-mix(in_oklab,var(--color-fill)_40%,var(--color-surface))]",
].join(" ")
