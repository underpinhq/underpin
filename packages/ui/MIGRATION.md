# Migrating from `@dirstack/ui` 1.x to `@underpin/ui` 2.0

`@dirstack/ui` is now `@underpin/ui`, and its first release under the new name is 2.0.0. This file lists every change that breaks code written against `@dirstack/ui@1.15.0`, with its before and after. Changes that only add a prop, a component or a subpath are left out.

## Rename the package

Swap the package, then replace `@dirstack/ui` with `@underpin/ui` in every import and in your stylesheet. The subpaths keep their names.

```bash
npm uninstall @dirstack/ui react-hook-form recharts @number-flow/react
npm install @underpin/ui
npm install @tanstack/react-form   # only if you use @underpin/ui/form
```

```tsx
// Before
import { Button } from "@dirstack/ui/button"
// After
import { Button } from "@underpin/ui/button"
```

```css
/* Before */
@import "@dirstack/ui/styles.css";
/* After */
@import "@underpin/ui/styles.css";
```

`@dirstack/ui` gets no more releases.

## Dependencies

- `react-hook-form` is no longer a peer. `@tanstack/react-form` 1 is an optional peer, needed only by `@underpin/ui/form`.
- `recharts` and `@number-flow/react` are no longer dependencies. `@tanstack/charts`, `d3-shape`, `react-day-picker`, `react-hotkeys-hook` and `@fontsource-variable/geist-mono` are new dependencies, installed with the package. Inter ships inside the package. `cn` moves from 0.2 to 0.5 and `tailwind-variants` from 3 to 4.
- Import through the subpaths only (`@underpin/ui/button`). The published package is the built `dist` folder, so its files sit at the package root.
- `sideEffects` is `["**/*.css"]`, so a bundler keeps `import "@underpin/ui/styles.css"`.

## Stylesheet

### Fonts

`styles.css` now loads Inter from its own `fonts.css`, whose font files ship in the package, and Geist Mono from `@fontsource-variable/geist-mono`. Remove your own Inter loading, or the font loads twice. Your bundler must resolve the relative `url()`s in `fonts.css`, as Vite, Next.js and every Tailwind v4 setup do. `--font-mono` is Geist Mono instead of `monospace`. Sans text takes Inter's `cv01`, `cv11` and `ss03` alternates, which change a few letters (a single-storey `a` among them) in your own text too.

### Colour tokens

The shadcn-style names are replaced by tokens named after their job. Rename each utility (`bg-background` becomes `bg-canvas`, `text-muted-foreground` becomes `text-ink-muted`) and each `var(--color-*)`.

| 1.x | 2.0 |
| --- | --- |
| `background` | `canvas` |
| `foreground`, `card-foreground`, `popover-foreground` | `ink` |
| `card` | `surface` |
| `popover` | `overlay` |
| `primary` / `primary-foreground` | `ink` / `ink-inverse` (a solid ink fill), or `brand` / `brand-on` for the brand colour |
| `secondary`, `muted`, `accent` | `fill` (`fill-subtle` for a hover or a highlight) |
| `secondary-foreground`, `accent-foreground` | `ink-secondary` |
| `muted-foreground` | `ink-muted` |
| `destructive` | `danger` |
| `success-foreground`, `warning-foreground`, `danger-foreground` | `success-ink`, `warning-ink`, `danger-ink` |
| `border` | `edge`; a bare `border` class draws it. The strengths are `edge-subtle`, `edge`, `edge-strong`, `edge-solid` and `edge-float` |
| `input`, `ring` | `edge-strong`; the focus ring is `focus` |
| `chart-1` | `chart-1`, now the brand colour |

`success`, `warning`, `danger`, their `-subtle` fills and `chart-1` to `chart-5` keep their names. The eight `sidebar-*` tokens and the `.bg-dashed` utility are removed with no replacement. Dark mode still comes from `light-dark()` and `data-theme` on `<html>`.

### Sizes and base rules

- Controls follow a 24, 28, 32 and 36 px scale. `--spacing-control` is 32px instead of 34px.

  | Control | 1.x | 2.0 |
  | --- | --- | --- |
  | Button and Input `sm` | about 26px | 28px |
  | Button and Input `md` | 34px | 32px |
  | Button and Input `lg` | about 38–40px | 36px |
  | Tabs segmented `md` | 34px | 32px |

- The radius scale is 2px rounder: `--radius-xs` to `--radius-xl` are 4, 6, 8, 10 and 14px instead of Tailwind's 2, 4, 6, 8 and 12px. Every `rounded-*` class in your own code changes with it.
- `text-control` keeps 13px, with a 16px line height instead of 1.25. `text-2xs` (11/14), `text-copy` (13/20) and `text-figure` (28px) are new.
- The global rule that sized every `svg[aria-label*="Icon"]` to 1em is gone. Give your own icons a size, or wrap them with `icon()` from `@underpin/ui/icon`.
- New base rules: a `:focus-visible` outline on every element, `text-wrap: pretty`, `cursor: pointer` on links, buttons and `label[for]`, `pointer-events: none` on disabled controls, and a reduced-motion override.

## Removed subpaths

| 1.x | 2.0 |
| --- | --- |
| `animated-number` | `formatted-number`: static text, no animation |
| `form-row` | the field components in `form` (see Forms) |
| `view-tabs` | `view-picker`, a segmented radio group with the same props |
| `responsive-menu` | none: use `menu` |

```tsx
// Before
<AnimatedNumber value={n} format={{ notation: "compact" }} />
// After
<FormattedNumber value={n} format={value => compact.format(value)} />
```

`FormattedNumber` takes `format: (value: number) => string`. The `locales`, `animated` and other NumberFlow props are gone. `ViewPicker` takes `variant: "segmented" | "plain"` and `size: "md" | "sm" | "xs"`.

## Removed exports

- `@underpin/ui/animation`: `ANIMATION_DURATION` is 250 instead of 500. `ANIMATION_EASING` and `useReducedMotion` are removed. `easeOutExpo` and `CHART_TRANSITION` replace the easing. Read reduced motion with your own media query.
- `@underpin/ui/classes`: `controlTextClasses` is removed; use the `text-control` utility. `descriptionClasses` is `text-copy` (13/20) instead of `text-sm` and adds `max-w-prose`. `eyebrowClasses` is 12px instead of 11px.
- `@underpin/ui/interactive`: `interactiveVariants` drops `hover` and `focus`, and takes `interactive` (default `true`) and `bordered`. Its base no longer reserves a transparent 1px border, `bordered` draws `border-edge-strong`, and `aria-invalid` turns the border `danger`.

```ts
// Before
interactiveVariants({ hover: true, focus: true, bordered: true })
// After
interactiveVariants({ interactive: true, bordered: true })
```
- `@underpin/ui/chart`: `ChartContainer`, `ChartTooltip` and `ChartConfig` are removed (see Charts).
- `@underpin/ui/time-series-chart`: `niceMax(max, intervals)` is removed. `niceTicks(max, { integer, format })` in `@underpin/ui/time-series` returns the ticks.
- `@underpin/ui/form`: the react-hook-form API (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField`) is removed (see Forms).
- `@underpin/ui/variants`: `cn` and `variants` are instances configured with the theme's text sizes, so `cn("text-control text-ink-muted")` keeps both classes. Their call signatures are unchanged.

## Forms

The form components are built on TanStack Form instead of react-hook-form.

```tsx
// Before
const form = useForm<Values>({ resolver, defaultValues })

<Form {...form}>
  <form onSubmit={form.handleSubmit(save)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Save</Button>
  </form>
</Form>
```

```tsx
// After, once per app
import { createFormHook } from "@tanstack/react-form"
import {
  fieldComponents,
  fieldContext,
  formComponents,
  formContext,
} from "@underpin/ui/form"

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
})

// After, in a component
const form = useAppForm({
  defaultValues,
  validators: { onSubmit: schema },
  onSubmit: ({ value }) => save(value),
})

<Form form={form}>
  <form.AppField name="email">{field => <field.TextField label="Email" />}</form.AppField>
  <form.SubmitButton>Save</form.SubmitButton>
</Form>
```

- `Form` renders the `<form>` element itself, with `noValidate`. On submit it validates and focuses the first invalid field.
- The field components are `Field`, `TextField`, `TextareaField`, `NumberField`, `SelectField`, `DateField`, `SwitchField`, `CheckboxField` and `RadioCardField`. The form components are `SubmitButton` and `FormError`.
- `FormRow`'s `layout`, `isRequired`, `labelClassName`, `valueClassName` and `description` props move to `Field` unchanged.
- A custom control goes inside `<field.Field label="…">`, as an element or as a function of the control props. You bind its value.

## Charts

Charts are drawn with `@tanstack/charts` instead of recharts.

- `ChartTooltipContent` is no longer a recharts `content` prop. It takes `{ title, items, details, footer, className }`, where each item is `{ key, label, value, color, indicator }` and `indicator` is `"dot"` or `"outline"` (it was `"line"`, `"dot"` or `"dashed"`).
- `TimeSeriesChart` requires `formatTick`, `formatValue`, `formatDate` and `formatTooltipDate`; they had `Intl` defaults before. The `ticks` prop is removed.

## Components

### Button

```tsx
// Before
<Button variant="danger">Delete</Button>
<Button hover={false} focus={false} />
// After
<Button tone="danger">Delete</Button>
<Button interactive={false} />
```

- `type` defaults to `"button"`. A Button inside a form no longer submits it: give the submit button `type="submit"`, or use `form.SubmitButton`.
- `hover` and `focus` are removed. `interactive` (default `true`) and `bordered` replace them, and focus is the global `:focus-visible` ring.
- Every size has a fixed height (see Sizes), and a Button with no children renders square.

### Badge

`variant` is now the shape (`soft`, `outline`, `solid`) and `tone` the colour.

| 1.x | 2.0 |
| --- | --- |
| `variant="secondary"`, `variant="neutral"` | `variant="outline"` |
| `variant="soft"` | `variant="soft"` (the default) |
| `variant="success"` (also `warning`, `danger`) | `tone="success" variant="outline"` |

### Callout

```tsx
// Before
<Callout variant="warning">…</Callout>
// After
<Callout tone="warning">…</Callout>
```

`variant="soft"` becomes `tone="neutral"`. The tone's icon renders by default; `prefix` replaces it. The role is `note` whatever the tone. Pass `live="polite"` for a `status` or `live="assertive"` for an `alert`.

### Tooltip

```tsx
// Before
<Tooltip tooltip="Copy" open={open} onOpenChange={setOpen}>
  <Button />
</Tooltip>

// After: once, around the app
<TooltipProvider>{app}</TooltipProvider>
// then
<Tooltip tooltip="Copy">
  <Button />
</Tooltip>
```

- **`TooltipProvider` is required.** It renders the one popup every tooltip shares, and without it a `Tooltip` shows nothing.
- `Tooltip` takes `id`, `children`, `tooltip`, `side`, `align`, `variant` (`"default"` or `"rich"`) and `className`. The root props (`open`, `defaultOpen`, `onOpenChange`, the delays) are removed. For a controlled tooltip, compose `TooltipRoot` and `TooltipContent`.
- The surface is light (`bg-overlay`) instead of a dark `bg-foreground`, and `sideOffset` is 8 instead of 4.

### StatStrip

```tsx
// Before
<StatStripItem render={<button onClick={select} />} selected format={{ notation: "compact" }} />
// After
<StatStripItem onSelect={select} selected format={value => compact.format(value)} />
```

- `StatStripItem` renders an `aria-pressed` toggle when it has `onSelect`. `format` is a function and values no longer animate. `hint` accepts any `ReactNode`.
- `StatStrip variant="track"` no longer draws its own track: it is an unstyled band meant for the inside of a `Card`. `row` (`"lg"` or `"wide"`) sets the width where the strip becomes one row.

### Dialog

```tsx
// Before
<DialogContent>
  <DialogHeader>…</DialogHeader>
  …
  <DialogFooter bordered>…</DialogFooter>
</DialogContent>

// After
<DialogContent>
  <DialogHeader>…</DialogHeader>
  <DialogBody>…</DialogBody>
  <DialogFooter>…</DialogFooter>
</DialogContent>
```

- `DialogContent` is always flush, and its `flush` prop is removed. `DialogBody` adds the padding and the gap.
- `DialogFooter` is always a bordered band, and its `bordered` prop is removed.
- `Dialog` takes Base UI `Drawer.Root` props at every width. `DialogContent`'s `render` must be an element, its `className` a string and its `style` a style object: Base UI's state-function forms of both no longer type-check.

### BarList

`BarList` is a table.

```tsx
// Before
<BarList>
  <BarList.Row label="Google" value={40} max={100} />
</BarList>

// After
<BarList>
  <BarList.Header value="Visitors" />
  <BarList.Body>
    <BarList.Row label="Google" value={40} max={100} />
  </BarList.Body>
</BarList>
```

`BarList.Row` is a `<tr>`. Its `render`, `suffix` and `animated` props are removed: a click target for the whole row goes in `overlay`. `format` and `secondaryFormat` are functions. `BarList.Skeleton` is a `<tbody>`.

### Inputs

- `Input`, `Textarea` and `SelectTrigger` drop `hover` and `focus`. Use `interactive` and `bordered`.
- `Input` sizes follow the new scale, and the 16px text on touch screens is gone.
- Password managers are kept out by default (`data-1p-ignore` and its peers). Pass `allowPasswordManager` on a sign-in or password field.

### Smaller changes

- `NavButton`: `title` is renamed to `label`.
- `navItem`: `variant="bordered"` is `"outline"`. The active item is marked with `aria-current="page"` instead of `data-status="active"`.
- `Kbd`: `variant="secondary"` is `"outline"`, the default.
- `EmptyState`: `variant="dashed"` is removed with no replacement.
- `Ping`: `animate` defaults to `false`.
- `Menu` and `Select` are no longer modal: the page keeps scrolling, and a click outside closes the popup and reaches the control under it. Pass `modal` to get the 1.x behaviour back. On a touch screen a tap outside only closes the popup.
- `Popover`, `Menu` and `Select` content sit 6px from the trigger instead of 4px.
- `MenuItem` with a single-key `MenuShortcut` now runs when that key is pressed while the menu is open. The press is handled before Base UI's typeahead and does not reach a listener on the row or above it.
- `EntityAvatar`: at most 2 initials at every size (`md` and `lg` showed 3), and the avatar is `aria-hidden` unless it has a `label`.
- `Menu`: checkbox and radio items show a trailing check instead of a leading indicator.
- `Select`: the item check moves to the right.
- `ThemeSelect`: a segmented radio group instead of `Tabs`. It takes `SegmentedControl` props instead of `Tabs` root props, plus `compact`.
- `DetailRow density="form"` and `FormSection`: the two-column layout switches on the container width (`@xl`) instead of the viewport (`sm`). `FormSection` is the container, so a `DetailRow` outside one stays stacked.
- `Card`: `rounded-lg` (10px) instead of `rounded-xl`, and `CardPanel` pads 20px instead of 24px from `md` up.
- `Toaster`: every toast has the light surface instead of a coloured fill, stays for 6 seconds and has a close button.
- `Heading`: `h1` to `h4` use `text-balance` instead of `text-pretty`.
- `Page`: the gap between sections is 20px instead of 24px.
