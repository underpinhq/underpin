# @underpin/ui

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
