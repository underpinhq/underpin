# Designing with @underpin/ui

The rules every design follows, in Figma and in code. Token, type and class rules live in
[`AGENTS.md`](AGENTS.md) beside this file; this file covers what a screen looks like and how
design work happens.

## Where the designs live

Figma, team "Piotr Kulpinski's team" (Professional plan):

- **Underpin UI** (folder Libraries, `qSk2ZbuEa4iZLQqgqQvuzV`): the published library. Its
  variables and styles mirror `src/tokens.json` (see below). Components mirror `src/components`:
  the controls sit on the Controls page, the rest on the `Components · …` pages. The Foundations
  board sits on the Boards page. Only components that exist in this package belong here.
- **Highseat · App** (folder Highseat, `qpyQM1TLZSe5HuoHR8Kxz8`): every Highseat screen, one
  numbered page per product area (`15 · Auth` to `99 · Proposals`). The components only
  `apps/web` has sit on its own `Components · …` pages. It uses the library and has no
  variables or styles of its own.
- **Highseat · Brand** (folder Highseat, `z6UT7EovtJ21S0DdrO9ya3`): the logo and brand assets.
- **Highseat · Icons** (folder Highseat, `D0pHKy5Dw65KSlRZ4iZyPo`): the published icon library,
  one `Icon / <Name>` component per export of `@highseat/icons`. The App and Marketing files use it.
- **Sandbox** folder: explorations and throwaway tests.

Code is the source of truth. A change to a token or a component lands in this package first,
then in the library, then gets published.

## How the library mirrors code

- **Tokens come from one file.** `bun run tokens` writes `src/tokens.json` from `styles.css`
  and Tailwind's theme: every colour in both themes, every shadow layer, the type scale,
  tracking, radii and spacing. The library takes every value from that file, and nobody types a
  value into Figma by hand.
- **Syncing is one MCP call.** After `bun run tokens`, `bun run figma:sync` in this package
  prints a script for the `use_figma` tool on Underpin UI. It creates, updates and deletes
  variables and styles until they match the file, and returns what it changed. The script
  carries a checksum of its payload and stops before changing anything if a copy altered it.
- **Names follow code by one rule**: the CSS prefix becomes the group. `--color-ink-muted` is
  the variable `color/ink-muted`, `--radius-md` is `radius/md`, `--shadow-card` is the effect
  style `shadow/card`. Each variable's code syntax is its CSS name, so Dev Mode shows what the
  code writes.
- **Two collections**: `Color` (Light and Dark modes) and `Scale` (one mode: radius and
  spacing). The `gray/*` steps sit in `Color`, hidden from publishing, so a design reaches a
  step only through the token that names its job, as code does.
- **Shadow styles carry depth only.** An outline is a 1px `border` in code and a 1px inside
  stroke bound to an edge variable in Figma. A surface takes its stroke and its shadow style
  separately, so a state that changes one leaves the other alone.
- **Every component, variable and style has a code twin under the same name**: a component is
  named after its export (`StatStripItem` is "Stat strip item"), a text style after its
  utility (`text/control-medium`). A part takes its parent's name first (`Calendar day button`,
  `Segmented control item`). Toast is named after `toast()`, the call that shows one. The
  `doc/*` text styles, which only the documentation boards use, are the one exception.

## Working in Figma

- **Publishing is manual.** An edit to Underpin UI reaches Highseat · App only after someone
  publishes the library (Assets, Libraries, Publish) and accepts the update in the app file
  (Updates button at the bottom of the left rail, "Show updates for all pages" on, Update all).
  The API can do neither.
- **The MCP budget is 200 calls a day for the whole plan**, shared by every agent and every
  product. Batch the work of one page into one `use_figma` call. Work too big for a few calls
  (rebuilding many screens) goes through a development plugin, which is not metered.
- **One agent per page.** Agents editing the same page overwrite each other without warning;
  only one agent edits the library at a time.
- **Look at the canvas, not an export.** A plugin's `exportAsync` draws semi-transparent
  variable-bound paints solid; `use_figma` screenshots and the app are right.
- Bind every colour, radius, spacing and shadow to a variable or style. A paint bound to a
  variable keeps its resolved Light value as the fallback colour, or Figma renders it black.

## Notes on screens

A screen's notes are Figma's own annotations, not note cards on the canvas. They stay attached
to the layer when it moves or is duplicated, they never show in a screenshot or an export, and
Dev Mode and the `use_figma` tool both read them. Page `16 · Onboarding` is the worked example.

- **Write only what the frame cannot show**: what a click does, what changes the state, what
  stays enabled, what happens off screen (an email, a server check). Leave out what the frame
  already shows, why the design was chosen, and how the code builds it; those belong to the
  frame itself, Linear and the code.
- **Pin a note to the layer it is about.** A note about one control goes on that control, even
  inside an instance. A frame takes one note for the screen as a whole.
- **One shape**: a bold title, then short bullets. A note about a single control may be one
  sentence with no title.
- **Every note has a category**: Interaction (behaviour and state), Content (what the words or
  data must say), Accessibility, or Development (a constraint the build must meet). A note
  whose bullets span two categories becomes two notes.
- **Annotate where a state is not obvious, not everywhere.** A frame named "loading" needs no
  note. A mobile or dark frame takes a note only where it behaves differently from its desktop
  or light twin.
- A board on `99 · Proposals` may keep one note card for its decision log, the options compared
  and the choice made. When the proposal is promoted, its decisions become annotations on the
  promoted screens and the card goes.

## Principles

- Flat, near-neutral, one accent. Colour is rationed: the brand (steel blue, or the accent a
  product sets) on charts and the data drawn like them (the chosen stat's underline), links, the
  ping and checked controls; status colours on deltas, badges and callouts; the focus ring is its
  own fixed blue. Nothing else is coloured. The bars behind breakdown rows are a hint, not a
  chart, so they stay grey.
- The fewest elements that do the job. No decorative gradients, glows, icon-tile grids or
  illustrations. An empty state is a muted icon, a title, a sentence and at most one button.
- Edges are 1px borders in the edge tokens, the ink at a fraction (white in dark), so a line
  takes its tone from what it sits on; depth comes only from the shadow tokens (control, card,
  tooltip, popup, modal, drawer, well). The strength follows the role, so related things match:
  everything operated (a field, a button, a raised key, a checkbox) takes the strong edge and
  darkens to the solid edge under the pointer; a card, a dialog and a divider take the plain
  edge; a menu, a popover, a tooltip and a toast take the float edge, plain in light and strong
  in dark, where a shadow barely shows. A selected row or radio card is a grey fill. The chosen
  segment is a raised key flush with its track, and a switch's knob a raised key inset 2px in its
  track; both tracks are the well, a tone below the card in dark, so the key is the lighter part.
  The chosen stat in a strip carries a 2px underline in the first series colour.
- A control that holds a value someone types or picks is a field: an input, a textarea, a
  select, a combobox, a date picker, a search or copy input. Every field takes the field ground,
  the strong edge and no shadow, with its value in ink at 400 and its placeholder muted, so a
  form reads as one column of openings. A control that runs a command is a button, raised; a
  toolbar's period picker is one, since it sits among commands.
- A control answers a press. A raised surface loses its drop and sits on the page: a button
  or a card with one link drops 1px, a menu row sinks into a well. Shadows under anything
  resting on the page stay crisp, a 1px drop and one short layer, never a long soft blur; only
  what floats over it (a popup, a dialog, a drawer) adds one faint long layer, so it separates
  from a busy chart or table beneath.
- Focus is one 2px ring in the focus blue, the same on every control, row, link and cell: drawn
  over the element's own edge, 1px in and 1px out with no gap, so it reads as the edge turning
  blue. On an invalid control the ring is the danger red, so the field an error belongs to stays
  marked while it is being fixed.
- Controls sit on one height scale: 24, 28, 32 (the default) and 36px. Type is Inter, with
  Geist Mono for machine strings (keys, IDs, snippets).
- Spacing sits on the 4px grid. Every list of figures aligns into columns, and every column of
  figures is tabular-nums.
- Mobile is one column with 16px page padding, and a dialog becomes a bottom sheet. Touch
  targets grow on a coarse pointer: list rows go from 28px to 32px in every menu, select and
  combobox.
- Keep the dashboard's anatomy: the stat strip with the value and "vs" line under it, dashed
  gridlines, revenue bars under the visitors line on two axes, breakdown rows with a bar behind
  the label and fixed numeric columns. The bucket still running (today, this month) draws its
  stretch of the line dashed and its bar as a dashed outline, so a period that has only begun
  never reads as a drop.

## Copy in mocks

Code owns the words, and they change with every release, so a frame never tracks the live copy.
Its copy is representative: the right shape and roughly the right length. Sync layout,
components and states with code, never wording for its own sake. A text layer changes only when
its length or structure changes the layout (a heading that wraps differently, a missing footnote,
a table where the frame has prose), and only as part of design work on that screen.

- Sentence case, plain words, no em dashes.
- Realistic data from the fleet's own sites (OpenAlternative, Dirstarter and similar).
- Money in US dollars with English formatting ("$1,234.56", compact "$9.2K"), every other figure
  in English formatting too ("12.6K", "1.8%"). The app formats in the reader's locale; a mock
  never needs to show that.
- No line ends on a lone word. Code balances wrapping (`text-pretty`, `text-balance`); a mock
  rewrites the line until it wraps evenly.
- Create flows use one set of words: the trigger reads "New X…" when it opens a dialog and "New
  X" when it links to a page, the title "New X", the submit "Create X", the toast "X created".
  Editing is "Edit X", "Save X", "X saved". "Add X" only appends to a list already on screen.

## Recipes

- **Page header**: every route opens with one `SectionHeader` at `size="page"`, the "Page header"
  component in Underpin UI. Its parts map one to one: the Back link is the `back` slot (the app's
  `BackLink`: 13px, muted, a 14px chevron, the same on every detail page, admin included), then
  `title`, `description` and the `actions` slot. On desktop the actions sit beside the title
  block. On a phone (the component's `Size=Phone`) they stay on the title line, the description
  runs the full width under both and stops at two lines, and the title drops to 20px. Only the
  primary action keeps a label. Every other action, and every destructive one, goes into a "…"
  menu after it, on desktop and phone: `ActionsMenu` with `placement="page"`, a secondary
  icon-only button with `MoreIcon`. The settings pages' Help button is the one exception: it
  keeps its own button.
  Header actions sit 6px apart, like toolbar controls. View controls (range, refresh) never sit
  in the header: they belong to the toolbar. A page with no visible title (the site dashboard)
  starts with its toolbar.
- **Toolbar**: one row under the header, 20px below it. Filter comes first and never moves; the
  filter chips follow it and wrap to a second row when they overflow. The pickers sit at the
  end: range, then compare, then Share. A live list ends with Refresh instead. A page mode
  switch (Revenue's Overview and Customers, User flow's anchor) comes before Filter. Saved
  segments live in the Filter menu, and an applied segment is one chip, holding its filters.
- **Share menu**: the dashboard's one share control is a secondary "Share" button with
  `ShareIcon`, opening a menu (Share image…, Embed…, Share links…). It replaces the separate
  Embed button. Read-only boards (a share link, the live demo) have none.
- **Phone toolbar**: one row: the range picker fills it, then Filter, then the page's action as
  an icon-only button (Share, Embed, Refresh keeps its label). The comparison and the
  granularity are groups at the end of the range menu (`PeriodPickers`). With no filter on,
  Filter opens the picker; with filters on it shows their count and opens a sheet listing the
  chips, with Add filter, Clear and Done (`FilterBar` with `collapse`). The row never grows.
- **Compare control**: every toolbar with deltas uses the same compare picker, a secondary button
  with the compare icon, the name of the comparison it is on ("vs. previous period", off
  included) and a chevron. On a phone it is a group at the end of the range menu. The funnel
  detail pages have none, because nothing on them shows a delta.
- **Chevrons**: a trigger that opens a menu or a popover ends in the down chevron
  (`ChevronDownIcon`): the range, compare and Sort pickers and card menus. The up-down
  chevron (`ChevronsUpDownIcon`) is for the form `Select`, which picks one value from a list,
  and the sidebar switchers (site, account), which change the whole context. Nothing else.
- **Breakdown rows** are 30px (`h-7.5`) everywhere, the bar behind the label spans the full row,
  numeric columns are tabular-nums at fixed widths. The bar rests on `fill-subtle`. On a row that
  filters on click, hover deepens it to `fill` and a press to `fill-strong`. No taller rows in Details dialogs, reports or
  lists.
- **Card footers** are a fixed band: hairline above, one `text-xs/5` line, the Details link at
  the start and any note at the end. In loading, error and empty states the band keeps its
  height (the Details link is laid out but invisible).
- **Details dialogs** have a search field under the header, then the column names, then rows.
  The footer band holds "Download CSV" at the start and Done at the end; the phone sheet has no
  footer.
- **Dialog footers** are a band on every dialog with actions: hairline above, buttons at the
  end, secondary then primary. A destructive dialog puts the danger button in the primary slot.
  On a phone sheet the buttons go full width and stack in reading order, primary nearest the
  thumb.
- **Timestamps** that must stay short on the page use `RelativeTime` from
  `@underpin/ui/relative-time`: the short reading in a `<time>`, the exact moment on hover. The
  hover is one line with the full date, or how long ago above one row per clock (a mono badge
  naming the zone, the date, the time). The caller formats every string.
- **Chart tooltip notes** are one line each, truncated with an ellipsis; at most two notes, then
  "and N more".

## Tables

The parts live in `@underpin/ui/table`, the toolbar in `@underpin/ui/table-toolbar`, the
footer band in `@underpin/ui/pagination` and the selection bar in
`@underpin/ui/bulk-action-bar`. Figma has one component per part on `Components · Tables`, each
description naming its code part.

- **Table, list or `BarList`.** A table holds records a reader compares across named columns:
  sites, users, invoices. A list (`layout="list"`) holds records with no column names, where each
  row reads on its own: members, API keys. A `BarList` holds one figure per label, ranked, with a
  bar behind it: the dashboard's breakdowns. Never a table for a ranking, never a bar list for
  records.
- **Grid, not table layout.** `Table` sets one grid template from its `columns`, and the header
  and every row take it as a subgrid. A row is a positioned box, so a `TableRowLink` on the name
  stretches over the whole row, in Safari too. The checkbox, the menu and any other control in a
  row sit above that link (`relative z-10`).
- **Row sizes.** Compact is 32px (a feed, a dense list), default 44px (one line), identity 52px
  (a name with a muted line under it). A skeleton row takes the size of the rows it stands in for.
- **Lines.** The header is 40px on the surface, with one line under it in the card's edge
  colour. Rows part with the subtle edge, and the first row draws none, so two lines never
  stack. An empty, loading or error body keeps the header and its line.
- **Hover.** Only a row that opens something takes the hover fill (the canvas). A row with no
  link keeps its background, and only its menu answers. A selected row keeps the subtle fill.
- **Columns that give way.** A column with `priority: "medium"` drops below a 672px table, one
  with `"low"` below 896px. Pass the same priority to the column's head and cells. The name
  column never drops.
- **States.** Five skeleton rows on a first load. While a later page loads, keep the old rows
  and dim them. `TableMessage` replaces the rows: `empty` with the create action, `filtered`
  with a way to clear the filters, `error` with a retry.
- **Footer modes.** Paged: the `Pagination` band, "Showing 26–50 of 1,204", an optional
  per-page select, "Page 2 of 49" and the joined first, previous, next and last buttons. A
  single page keeps the count and drops the controls. Infinite: `PaginationInfinite`, the count,
  then "Loading more…" while the next batch loads and "End of list" at the end. A table that
  shows everything at once (the sites list) has no band.
- **Which footer.** Page a table a reader works through and returns to a place in (admin
  lists, reports). Load as it scrolls when the newest rows matter most and a reader rarely goes
  far (an event feed).
- **Toolbar.** Search first (200px), then a `TableFacetFilter` for each of the two or three
  common fields, the Filter button and its `TableFilterChip`s, which wrap. The sort and column
  pickers sit at the end. Page actions stay in the page header.
- **Views and selection.** Fixed views sit above the toolbar as `Tabs` with
  `variant="underline"`, each with a `TabsCount`. While rows are selected, `BulkActionBar`
  floats at the bottom centre and owns the selection count. A selection covers the current page.

## Icons

Hugeicons at stroke 1.75 in their 24px grid: 16px in rows and menus, 14px inside buttons. The
stroke scales with the icon, so a Figma icon draws about 1.17px at 16px and 1.02px at 14px.
`bun .docs/design/hugesvg.mjs Settings02Icon Add01Icon` (from the repo root) prints the SVGs for
a design file. Code imports them from `@highseat/icons`, and the Highseat · Icons library
(`D0pHKy5Dw65KSlRZ4iZyPo`) holds one `Icon / <Name>` component per export: `Icon / Funnel` is
`FunnelIcon`. A new glyph goes into both together.
