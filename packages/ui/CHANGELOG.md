# @underpin/ui

## 2.15.0

### Minor Changes

- `SortableDataTable` takes a new `handleVisibility` prop. The default, `"always"`, keeps a grip on every row. With `"hover"`, a row's grip shows only while the pointer is over the row or something in it has keyboard focus, and the gutter keeps its 28px so the columns stay put. A touch screen, which cannot hover, still shows every grip. The hidden grip stays in the tab order and keeps its name for screen readers.

## 2.14.0

### Minor Changes

- Breaking: `SortableDataTable` no longer takes `activator`. Every sortable table now works one way: the pointer picks up the whole row after it moves 6px, a finger picks it up from the grip after 2px of movement or after a 250ms press anywhere else, a tap or click on the grip opens the row like the rest of it, and the arrow keys on the grip move the row one place. The grip always shows, quieter at rest than under the pointer and on focus, in a gutter the table leaves for it: the first column starts 28px in, the head's included, so names still line up with their column. Remove `activator` from each `SortableDataTable`, and remove any position or size classes from `DataTableDragHandle`, which now places itself in the gutter. `SortableList` takes a new `activator="both"` for the same behaviour in a list of your own.

## 2.13.0

### Minor Changes

- `RailSearch` adds a search row to the rail: a button drawn as a search field, with a label, an optional shortcut (`keys`) and an optional hairline above (`separator`), that opens your command menu from `onClick`. `AreaRailGroup` takes `separator={false}` to leave out the hairline above the group.

## 2.12.0

### Minor Changes

- `Page width="narrow"` centers itself in the content column, so a settings or form page no longer needs `mx-auto` beside it. A narrow page meant to sit against the left edge takes `className="mx-0"`.
- `@underpin/ui/sortable-data-table` ships `SortableDataTable`, a `DataTable` whose rows the reader drags into their own order. It keeps the table's head, columns and row links, takes `noun`, `activator` (`box` picks up the whole row, `handle` only the grip), `disabled` and `onMove`, and draws the lifted copy as a one-row table of the same columns while the row's own box waits as a blank slot. `DataTableDragHandle` places the grip in a column's cell, above the row link. In a `box` table it shows on hover and focus. `DataTable` takes `skeletonRows`, the number of skeleton rows on a first load (5 by default).
- `@underpin/ui/table-columns` ships five grid tracks for a column's `width`:

  - `figureColumn(floor)` sizes a figure, a date or a short state: at least `floor` wide and as wide as its widest cell past that, so it never wraps or truncates.
  - `labelColumn(cap)` sizes a short label: as wide as its longest value up to `cap` (12rem by default), where it truncates, so the name column gets the room it leaves.
  - `shareColumn(share)` sizes a figure in a wide table: as wide as its widest cell plus `share` parts of the spare width (1 by default), so the columns spread out instead of packing against the table's end.
  - `labelShareColumn(floor, share)` sizes a short label in a wide table: `floor` wide plus `share` parts of the spare width, truncating past that. It ignores its content, so the column holds still when data replaces the skeleton rows.
  - `nameColumn(share)` sizes the name column beside `shareColumn` ones: `share` parts of the spare width (3 by default), so the name stays the widest column without taking all of it.

## 2.11.0

### Minor Changes

- `@underpin/ui/breakdown-card-tabs` ships `BreakdownCardTabs`, the small plain tab row a `BreakdownCard` takes as its `actions` to switch views. It wraps from the card's right edge, and `scroll` makes it scroll sideways on a phone instead. `aria-label` names the row, usually with the card's title. Inside `BreakdownPanelContext`, with `useBreakdownPanel()`'s props on the card body, each tab names the body as the panel it switches. `BreakdownCardTab` and `useBreakdownTabProps` tie a tab of your own, such as one that opens a menu, to the same panel.
- `Favicon` takes `fill`, which draws the image over the whole `lg` tile, clipped to its corners, for a logo made to fill its square. A pressed table row takes `bg-fill` in place of `bg-fill-strong`, and a row opened from the keyboard keeps its hover fill under the focus ring. A `StatStrip` in the `track` variant draws a top hairline when it is not the first child of its card, so it sits apart from a card header above it.
- `formatAgo` takes `style: "short"` and `RelativeTime` takes `agoStyle="short"` for the language's abbreviated units ("3 hr. ago"). `formatDayAgo` reads a calendar day against today ("yesterday", "in 2 days"), and `formatDaysAway` gives the bare count ("3 days") for a "… left" figure. `formatAgo` and `RelativeTime` take an instant and throw in development on a bare "YYYY-MM-DD", which would read as UTC midnight.
- `@underpin/ui/sortable` ships `SortableList`, `useSortableItem` and `DragHandle`, which let a reader drag a list or a grid into their own order on dnd-kit. A pointer picks up the whole item or only its grip (`activator`), and a finger picks it up after a long press. From the keyboard, the grip picks the item up with Space or Enter, or moves it one place per arrow key, and a screen reader hears each move. `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` are optional peers, needed only by an app that imports it.

## 2.10.0

### Minor Changes

- `AuthCardSkeleton` takes `mark={false}` to leave out the 40px circle over the title, for a card that loads with no mark or icon, so the content stays put when it loads.

## 2.9.0

### Minor Changes

- Breaking: `ConfirmDialog`, `ConfirmItemDialog` and `DangerRow` take one `confirm` object in place of `confirmText`, `confirmMatch`, `onConfirmTextChange` and `confirmDisabledReason`. The four props are removed. `onConfirm` keeps its signature.

  | Before | After |
  | --- | --- |
  | `confirmText="acme.com"` | `confirm={{ text: "acme.com" }}` |
  | `confirmMatch="loose"` | `confirm={{ text, match: "loose" }}` |
  | `onConfirmTextChange={setTyped}` | `confirm={{ text, onTextChange: setTyped }}` |
  | `confirmDisabledReason={reason}` | `confirm={{ disabledReason: reason }}` |

  On `ConfirmItemDialog`, `confirm.text` is still a string or a function of the item. A conditional typed confirmation becomes `confirm={isUsed ? { text: name } : undefined}`. The new `ConfirmOptions` type describes the object.
- Add `PagedDataTable` (`@underpin/ui/paged-data-table`), a `DataTable` for a list the API pages, kept in the URL. Give it the `createDataTableSearch` result as `table`, the route's `search` and `onSearchChange`, and the page's query (a TanStack Query result whose data is `{ items, total }`, or another shape mapped with the query's `select`). It shows the loading rows, the paged footer from `total`, and a message in place of rows: the error with "Try again" that refetches, "Nothing matches" with "Clear filters" after a search, filter or view, or the `empty` message.

  `views` adds view tabs with a count each, their value in one search param. The first view is the default and stays out of the URL, and a new view goes back to page 1. A view with `narrows` is a filter over the first: its empty list reads as filtered, and "Clear filters" returns to the first view. A view with `narrows: false` is a list of its own: it shows its empty message, and "Clear filters" keeps it. Left out, `narrows` is true for a view with no `empty` of its own. `DataTableViews` is the tabs alone.

  On TanStack Router, `RouterPagedDataTable` from `@underpin/ui/router` fills in `onSearchChange` and opens rows through the router. `@underpin/ui/router` now needs `@tanstack/react-table` installed too.

  ```tsx
  <RouterPagedDataTable
    aria-label="Users"
    columns={COLUMNS}
    table={USER_TABLE_SEARCH}
    search={Route.useSearch()}
    query={users}
    getRowId={user => user.id}
    views={{ param: "status", label: "Account views", options: VIEWS, counts: users.data?.counts }}
    empty={{ icon: <UsersIcon />, title: "No accounts yet" }}
    filtered={{ title: "No account matches", hint: "Try a name, an email or an id." }}
  />
  ```

  On Next.js with nuqs, create the table search with `clearValue: null` and pass `useQueryStates`'s values and setter to `PagedDataTable`. `createDataTableSearch` also returns that `clearValue`, and `TableErrorState` takes a `description`.
- `PerformanceCard` draws its strip from `series` alone. This is a breaking change: the `strip` and `chart` props are removed.

  - A series takes `tooltip`, shown under its item on hover and read to a screen reader as the item's description, and `hintHidden`, which folds its hint line away.
  - The card takes `stripError`, an error with a title, a description and a retry, shown in place of the strip while the figures failed to load. It also takes `isStripLoading`, for figures that load apart from the chart.
  - The charted item is marked as selected whenever the strip has more than one item, also when it is the only chart and so cannot be pressed.
  - `StatStripItem` takes `description`, text for a screen reader alone.

  To move a card off `strip` and `chart`, describe each item of the strip as an entry of `series`, give the entries that can be charted their `chart`, and pass the selected one's `id` as `value`.
- Add an area rail to `Shell`, for an area with its own nav such as settings or an admin panel.

  - `AreaRail` replaces the product's rows: a back row with the area's name, then the area's groups. Pass it as the Shell's `nav` and leave `top` out. `back` is the link element the row renders, so it works with any router. With TanStack Router, write `<Link to="/" activeOptions={{ exact: true }} />`: a link to `/` matches every path by prefix, and without `exact` the back row reads as the current page across the whole area. The phone drawer shows the same rail.
  - The back row's accessible name is "Leave" and the area's name, such as "Leave admin". `backLabel` replaces it, and must contain the area's visible name, so a reader who speaks the word on screen can reach the row (WCAG 2.5.3).
  - `AreaRailGroup` is one group of `NavLink` rows after a hairline, with an optional `label` heading. It needs an `aria-label`.
  - `AreaRailSkeleton` stands in while the groups load. `groups` lists each group's heading and row count.
  - Entering or leaving an area steps the rail on a wide screen. The rail's body drifts 8px and fades out, and the new one drifts in from the other side, while the page beside it swaps at once. Your router starts it as a view transition with the types from `getAreaRailTypes(from, to, findArea)` in `@underpin/ui/view-transition`. It takes the two locations and a function that names a location's area, and answers `false` on the first page, inside one area, under `lg` and without `matchMedia`. With TanStack Router, return it from `defaultViewTransition.types` as `getAreaRailTypes(fromLocation, toLocation, location => findArea(location.pathname))`, and set `defaultViewTransition` only when `hasViewTransitionTypes()` is true. Under reduced motion the rail swaps at once.
  - The Shell's rail body now carries `view-transition-name: shell-rail`, so render one Shell per document. A second one on the page, such as a preview, renames it with `railBodyClassName="[view-transition-name:preview-rail]"`. Rename any element of your own that uses `shell-rail`.
  - `matchesMedia` from `@underpin/ui/media` returns `false` where there is no `matchMedia`, as on the server, instead of throwing.

## 2.8.0

### Minor Changes

- Add two options for a table toolbar whose list loads from a server.

  - `SearchInput` takes `debounce`, in milliseconds. The field shows each key at once and calls `onValueChange` after the typing pauses. Enter, the clear button and an emptied field apply at once. Text an input method is still composing waits until the composition ends. A value changed from outside, such as by Back, replaces the text, while the field's own value coming back, trimmed or not, leaves the text alone. With `useDataTableRoute` or `getProps`, each pause replaces the history entry, so Back skips the partial searches.
  - `TableFacetFilter` takes `multiple={false}` for a field the API filters by one value. Its rows are radios, and a pick replaces the value and closes the menu. Picking the chosen value again calls nothing. `value` and `onValueChange` keep their `string[]` shape.

### Patch Changes

- `useDataTableRoute` accepts a table from `createDataTableSearch({ keys })` with renamed params, such as `{ query: "search" }`, without a type argument. Such a call failed to type check before, so `useDataTableRoute<typeof KEYS>(…)` was needed. That form still compiles.

## 2.7.0

### Minor Changes

- `Combobox` picks several values. Put `multiple` on the root and `ComboboxChips` in the input's place: each value shows as a `ComboboxChip` with its own remove button, ahead of a `ComboboxChipsInput`. Enter toggles the highlighted option, as in any listbox. A comma adds it and never takes a picked one off, and a pasted list split by commas or line breaks adds each term the label of an option in the root's `items` reads, keeping what was typed and any term longer than the input's `maxLength` in the text. Pass `commaAdds={false}` where a value may hold a comma. Backspace in the empty input removes the last chip, and Escape closes the list without clearing the chips. A screen reader hears each value added or removed, in sentences `announcements` on `ComboboxChips` can replace. A chip whose children are not plain text takes a `label` for its remove button, and a read-only field shows no remove buttons. `ComboboxValue` renders the chips of an uncontrolled field.

  `ComboboxCreateItem` offers to create a term nothing matches. The new `@underpin/ui/combobox-create` entry builds that option (`findComboboxCreateOption`), reads its label for the filter (`withComboboxCreateLabel`) and splits the terms to create out of the next value (`splitComboboxCreateValue`). With `creatable` on `ComboboxChipsInput`, pasted terms nothing matches arrive as create options too. `ComboboxFooter` and `ComboboxKeyHint` draw a band of key hints under the list. A `ComboboxItem` with a `suffix` now keeps the suffix at the row's end when the row is selected.

  The `@base-ui/react` peer range rises from `>=1` to `^1.9.0`: the chips field renders Base UI's `Combobox.InputGroup`, which earlier 1.x releases lack, and the package is tested against 1.9.

## 2.6.1

### Patch Changes

- Fix `StatStrip` shrinking every figure to nothing when one of its items is hidden at the current width, such as a `StatStripItem` (or a `PerformanceCard` series) with `className="max-sm:hidden"` on a phone. A hidden item no longer counts toward the fit, and the figures never shrink below half their size.

## 2.6.0

### Minor Changes

- Add the parts that settings and detail pages kept as local copies. Every label is a prop with an English default.

  - `SaveChangesButton` (`@underpin/ui/form`) is a settings form's submit. It stays disabled, with "No changes to save." on hover, until a field differs from its default value, and shows the form's pending state like `SubmitButton`. It is in `formComponents`, so a form hook built from them renders it as `<form.SaveChangesButton />`. Change its text with `children` and the reason with `unchangedReason`.
  - `DangerZoneCard` (`@underpin/ui/danger-zone-card`) is the last card of a settings page, headed "Danger zone". Pass `title`, `description` and `id` to change it.
  - `DangerRow` (`@underpin/ui/danger-row`) is one row of that card: a label, a description and a danger button that opens a `ConfirmDialog`. It takes the dialog's `confirmText`, `confirmMatch`, `onConfirm`, `isPending`, `onError` and labels. Return a promise from `onConfirm` (a `mutateAsync`) and the confirmation closes once it resolves. For an action that returns nothing, pass `open` and `onOpenChange` and close it yourself. `disabledReason` locks the button with a reason, `isLoading` locks it without one, and `onRetry` puts a retry in its place when what it waits for failed to load.
  - `FactsCard` and `CopyFact` (`@underpin/ui/facts-card`) list read-only facts about a record in a detail page's side column. A missing value reads as a dash, and `CopyFact` shows a machine value in mono with a copy button. Pass `record` with the ID, `createdAt` and `updatedAt` to close the card with the ID, Created and Updated, the stamps through `RelativeTime`. `time` sets their `locale`, `timeZone` and `hourCycle` as plain data, so a server component can pass it, and `renderTime` draws each stamp yourself.

  `ConfirmDialog`, `ConfirmItemDialog` and `DangerRow` take three new options. `onConfirm` keeps its signature.

  - `confirmMatch="loose"` accepts the typed text whatever its case and the spaces around it.
  - `onConfirmTextChange` reports the typed text on every change, for a server that checks it again.
  - `confirmDisabledReason` keeps the confirm button locked with that reason, and Enter does not submit, for example until a required field in `children` is filled.

## 2.5.0

### Minor Changes

- Add `PerformanceCard` (`@underpin/ui/performance-card`), the stats card of a dashboard: a strip of figures whose selected one is the series drawn under it, in one card. Pass `series` (each with an `id`, `label`, `value`, `format`, `hint`, `trend`, `className` and the `chart` it draws) and the card renders the strip and switches the chart when a figure is picked. It keeps the selection itself, or follows `value` and `onValueChange`. A selection with no chart behind it falls back to the first series that has one, and with a single chart the figures are not pressable. For figures `series` cannot describe, pass a `strip` of your own and the selected `chart` instead. The card draws the chart's loading skeleton, a dimmed and busy chart while an earlier range is still on screen, your error state when there is nothing to draw, and an empty state. A `header` slot holds your title and range control, and `children` follow the chart.

  Add `Trend` (`@underpin/ui/trend`), the arrow and percentage for a change against a compared period. Use it as a `StatStripItem`'s `trend`, in a table cell or beside any figure. Set `invert` for a figure where down is good, and `precision` to read the change to decimals of a percent. A half rounds away from zero both ways, and a change that is not a finite number renders nothing.

  Add `ZonedTime` (`@underpin/ui/zoned-time`): a short stamp whose hover reads how long ago to the second, then the same instant on UTC, on the `timeZone` you pass and on the reader's clock.

  `RelativeTime` now formats both of its readings when you leave them out: how long ago as its text, and the full moment on `timeZone`'s clock as its tooltip. `tooltip` is optional. A server render prints the full moment, and the browser replaces it with how long ago and reads it again every minute, so a page never shows a reading frozen at build time or when it opened. `hourCycle` sets a 12-hour or 24-hour clock on `RelativeTime`, `ZonedTime` and the formatters. The formatters are exported from `@underpin/ui/day`: `formatAgo`, `formatExactAgo`, `formatMoment` and `formatZonedStamps`.

  `TimeSeriesChart` now loads its chart code on demand, showing `TimeSeriesChartSkeleton` until it arrives. A load that fails shows a retry in the chart's place instead of breaking the page. `aria-label` names the chart for a screen reader where `label` says too little. Import it from `@underpin/ui/time-series-chart` directly and drop any lazy wrapper of your own. Call `loadTimeSeriesChart()` to start loading the code early, for example in a route loader.

  `StatStripItem` takes `loading`, which draws a skeleton in place of the figure and hides the trend.

## 2.4.0

### Minor Changes

- Add `Favicon` (`@underpin/ui/favicon`), a site's icon at the sizes tables and headers use: `sm` (16px) for a list row, `md` (20px) beside a heading, and `lg`, a 28px tile for a table's identity cell or a settings row. Pass the icon's URL as `src`, from your own favicon route or a stored upload, and the site's name or hostname as `name`. The first letter of the name, past a leading `www.`, shows while the icon loads. Without a `name`, the box stays empty while it loads. Pass `fallback` (a globe, say) to show it when the icon fails or there is no `src`. Without one, the letter stays. In dark mode the icon sits on a light plate, so a black icon stays visible. An icon that loads before a server-rendered page hydrates is read as it mounts, so Next.js pages never get stuck on the letter.
- Add five parts that dashboards kept as local copies. None imports a router or a product's logo, and every label is a prop with an English default.

  - `ConfirmDialog` and `ConfirmItemDialog` (`@underpin/ui/confirm-dialog`) ask before a change: a question, its consequence and a button repeating the question. Return a promise from `onConfirm` and the button shows it pending, the dialog ignores Escape, Cancel and a press outside until it settles, and then closes. A rejection keeps the dialog open and reaches `onError`. Pass `confirmText` to make the reader type it before the action unlocks. The field takes focus and starts empty on every opening. Drive the dialog with `open`, or hand it a `trigger`. The dialog is a form, so `children` add fields but never a form of their own. `ConfirmItemDialog` is open while its `item` is set and words its text from that item.
  - `ErrorState` and `TableErrorState` (`@underpin/ui/error-state`) stand in for data that failed to load, with a "Try again" button when you pass `onRetry`. `variant="page"` is the heading and sentence for your router's error boundary, announced as an alert.
  - `NotFound` (`@underpin/ui/not-found`) is the card for a URL no route matches. Pass your router's link to the home page as `action`.
  - `CopySecret` (`@underpin/ui/copy-secret`) is a dialog's body and footer for a secret shown once, such as a new API key, with a copy button and Done.
  - `AuthCard`, `AuthCardSkeleton` and `AuthPage` (`@underpin/ui/auth-card`) lay out a signed-out step: the card with its title, error, providers, form and footer link, on a page with your logo in the band at the top. `AuthPage` renders its column as `<main id="main">`. Pass `render={<div />}` inside a layout that has its own `<main>`.

  `CopyInput` takes `copyLabel`, `copiedLabel`, `failedLabel` and `onCopied` for its copy button, and `CopySecret` passes them through.

## 2.3.0

### Minor Changes

- Add `RangePicker` (`@underpin/ui/range-picker`), the date range control for a stats page's toolbar. Pass your own preset ranges in groups, each with an optional single-key shortcut. The trigger reads the picked preset's label, or the `label` you pass for a range no preset names. Add `previous` and `next` for arrow buttons (and the arrow keys) that step through calendar ranges, each with its tooltip and the reason it is disabled at a bound. Rows you pass as children follow the presets in the menu, such as a comparison or a bucket-size switch.
- Add `BackLink` to `@underpin/ui/section-header`, the chevron link back to a record's list for `SectionHeader`'s `back` slot, and `ActionsMenu` to `@underpin/ui/menu`, the "…" menu of a list row or card (`placement="row"`, the default) or a page header (`placement="page"`, a secondary button). `TableActionsMenu` is now `ActionsMenu` at its row placement.

  Add `@underpin/ui/data-table-search`, which keeps a `DataTable`'s state in the URL without depending on a router. It needs `zod`, a new optional peer dependency. `createDataTableSearch` takes everything that shapes a table's params once: `keys` to rename any of `page`, `perPage`, `sort`, `order` and `query` (`{ query: "search" }`, and it throws when two fields share a name), `perPageOptions` for the page sizes the URL may carry, the default `perPage` and `sort`, `clearValue` for the value that removes a param, and `readFilters` and `writeFilters` to keep the filters in the table's own params. It returns `schema`, a zod object to extend with the table's own params, which drops a value it cannot read rather than failing the route; `read` and `write`, which turn search params into a `DataTableState` and back, leaving the defaults and any page size the table does not offer out of the URL; `hasUnreadablePage`, which tells a route when to redirect away from a page such as `?page=0`; and `getProps`, which returns the table's `state` and `onStateChange` and asks for a replaced history entry while the reader types a search. `DataTableSearch<Keys>` types the result. `read` takes parsed params or raw text and reads `null` as an absent param, and `write` clears a param with `undefined`, which TanStack Router drops. With nuqs, pass `clearValue: null` and hand `useQueryStates`'s values to `read` and `write`'s result to its setter. The factory sorts by one column: `sort` names a column and `order` its direction. `DataTableState`, `DataTableSort` and `DataTableChangeOptions` now live in a module with no react-table types, so this entry works beside any react-table version.

  Add `@underpin/ui/router` for TanStack Router. It needs `@tanstack/react-router`, a new optional peer dependency, and `zod`. `RouterRowLink` is a row link for `DataTable`'s `renderRowLink` that opens and preloads the row's route, keeping its search params and hash. `useDataTableRoute(table, search)` keeps a table described by `createDataTableSearch` in the current route's search params. TanStack Router parses search params as JSON by default, so a hand-typed `?query=1e3` reads as `1000`; the links the table writes itself come back exact.
- Add `Shell` from `@underpin/ui/shell`, the signed-in frame of a dashboard. It draws a skip link, a 224px rail on large screens and `<main>` on the page container. Under `lg` the rail gives way to a sticky bar whose toggle opens the rail's rows and footer in a `SideDrawer`. A plain click on a link in the drawer closes it, but a link that opens elsewhere (a modifier held, a `target` other than `_self`, `download`) does not. A change of `navigationKey` closes it too: pass the router's current URL (TanStack Router's `location.href`, Next.js's `usePathname()`) to close it on any navigation. It also closes when the screen grows past `lg`. `open` and `onOpenChange` control it, for an action that is not a link. `RailTop` holds the rail's switcher and `RailBottom` the user menu's trigger.

  `NavLink` in `@underpin/ui/nav` is a rail row that is a link. It renders an `<a>`, or a router's link passed as `render`, whose own handlers and classes it keeps. It reads `aria-current="page"` for the current page, which `active` sets for a router that does not, such as Next.js's. `count` puts a figure at the row's end and `dot` a status dot, which `pulse` animates.

  `styles.css` adds the `page-container` utility the shell uses: full width, centred, capped at `max-w-7xl`, with `px-4 md:px-6`.

## 2.2.0

### Minor Changes

- Add `TableActionsMenu`, the row's "…" menu for a `TableActionsCell`. `TableMessage` with `kind="error"` takes `onRetry` and draws a "Try again" button, its label set by `retryLabel`. `DataTable` no longer needs `state` and `onStateChange` for a table with nothing to page, sort or search. A paged `DataTable` takes `total: undefined` while no page has arrived: it then draws no band and keeps the page the state asks for, so a failed later page shows its error instead of moving the reader to page 1.

## 2.1.0

### Minor Changes

- A `ButtonGroup` keeps one edge weight in every state. A member answers hover with its fill alone, stays in line with its shadow when pressed and darkens instead, and a disabled member keeps its edge.

  `Button` looks different in two states. A disabled button no longer fades as a whole: its label and icons fade to half strength while its fill and edge stay, it goes flat on its own, and a disabled primary still turns grey. A pressed button darkens one step past its hover fill (`bg-ink/80` for primary, `bg-danger/80` for danger, `bg-fill` for secondary and ghost) as well as dropping 1px on its own. A disabled button no longer takes the hover fill.

  `styles.css` adds two Tailwind variants to every consumer's build: `ui-pressed` (held down, on a control that can run) and `ui-standalone` (not inside a `ButtonGroup`). They are public and may be used in a product's own classes. `ButtonGroup` now sets `data-slot="button-group"`, which `ui-standalone` reads. `Pagination` keeps its rounded ends on a phone.
- Add `DataTable`, which draws the table parts from `@tanstack/react-table` v9 column definitions. `@tanstack/react-table` is a new optional peer dependency. `@underpin/ui/data-table` holds `DataTable` and `DataTableRowLink`, and `@underpin/ui/data-table-state` holds `createDataTableColumnHelper`, the `DataTableState` type and `changeDataTableState`. A column's `meta` sets its `align`, `width`, `priority` and `sortable` (`true`, or `"descending"` for a column that sorts descending first). The state (page, page size, sort, search and filters) is controlled, so an app keeps it in its router's search params. When the table moves a page past the end to the last page, `onStateChange` receives `{ replace: true }`, so the app replaces the history entry. The `pagination` prop takes a paged footer (`{ type: "pages", total }`) or an infinite one (`{ type: "infinite", hasMore, isLoadingMore, onLoadMore }`). Rows can link to their record (`getRowHref`), take a checkbox with Shift ranges and per-row disabling (`enableRowSelection`) that feeds the bulk action bar (`bulkActions`), fade archived records (`isRowInactive`), and keep the columns a reader hides in `localStorage` (`storageKey`). Every label is a prop with an English default. `Pagination` takes `labels` for its words, with the count and the page as functions of their figures (`range`, `rangeShort`, `pageOf`) so a language can order them, `TableCheckboxCell` takes `disabled`, and `TableColumnScope` hands the cells inside it their column's `align` and `priority`.
- A table column takes a third priority, `lowest`, which drops it below a 1152px table, for a table with more columns than a laptop's content column holds. `TableMeterCell` takes a `tone` (`neutral`, `brand`, `warning` or `danger`) for a meter whose state the app knows better than its share does, such as a usage lock or a failed job; without one the bar stays ink and turns warning past 90%. Its `layout="ring"` draws a 14px ring before the figure in place of the bar, for a narrow column whose figure needs the room. The underlined `Tabs` row scrolls sideways when it is wider than its box, so view tabs fit on a phone, and it opens with the active tab in view.
- Add the table system. `@underpin/ui/table` holds `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead` and `TableCell` on a CSS grid with subgrid rows, a `TableRowLink` that opens the record from anywhere on its row, a `list` layout, one cell per column type (identity, number, date, badge, tags, sparkline, meter, country, mono, person, actions, checkbox), column priorities that drop columns as the table narrows, and `TableGroupHeader`, `TableSkeletonRow` and `TableMessage`. `@underpin/ui/table-toolbar` adds `TableToolbar`, `TableFacetFilter` and `TableFilterChip`, and `@underpin/ui/bulk-action-bar` adds `BulkActionBar`. `Pagination` becomes the footer band, with first and last buttons, "Page X of Y", an optional per-page select, a `loading` state and a `format` prop for figures; a single page now keeps its count. `PaginationInfinite` is the band for a list that loads as it scrolls, on `useLoadMore` from `@underpin/ui/load-more`. `Tabs` gains the `underline` variant and `TabsCount`.

### Patch Changes

- Give the trailing inset to the last table cell still shown. When a column with a `priority` drops as the table narrows, the cell before it now keeps the row's 20px end padding. Head and body cells with a priority carry it as `data-priority`.

## 2.0.0

### Major Changes

- First release under the `@underpin` scope, the successor of `@dirstack/ui` 1.15.0. Imports move from `@dirstack/ui/<name>` to `@underpin/ui/<name>`. The release carries every change made since 1.15.0, many of them breaking: removed components, forms on TanStack Form, charts on TanStack Charts, renamed tokens and control sizes, and fonts loaded by the stylesheet. `MIGRATION.md` lists each one with its before and after.
