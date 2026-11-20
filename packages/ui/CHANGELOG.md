# @underpin/ui

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
