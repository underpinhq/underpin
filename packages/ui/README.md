# @underpin/ui

React components built on [Base UI](https://base-ui.com) and styled with Tailwind CSS v4 design tokens. Each component is its own subpath, so an app loads only what it imports.

This package was published as `@dirstack/ui` up to 1.15.0. Upgrading from `@dirstack/ui` 1.x to `@underpin/ui` 2.0? [`MIGRATION.md`](MIGRATION.md) lists the rename and every breaking change, with its before and after.

## Install

```bash
npm install @underpin/ui @base-ui/react tailwindcss tailwindcss-animate
```

Peers: `react` and `react-dom` 19 or newer, `@base-ui/react` 1, `tailwindcss` 4 and `tailwindcss-animate` 1. `@tanstack/react-form` 1 is optional and only `@underpin/ui/form` needs it.

## Styles

Import the stylesheet once in your Tailwind entry, after Tailwind itself:

```css
@import "tailwindcss";
@import "@underpin/ui/styles.css";
```

The stylesheet carries the design tokens, the `tailwindcss-animate` plugin, the Inter and Geist Mono variable fonts, and a `@source` rule that scans the built components. You do not add the package to your own `@source` list.

Every colour is a `light-dark()` pair. Left alone it follows the operating system, and `data-theme="dark"` or `data-theme="light"` on `<html>` forces one. `@underpin/ui/theme` manages that attribute: `useTheme()` returns `[theme, setTheme]` and stores the choice in `localStorage.theme`, and `ThemeSelect` is a ready System, Light and Dark control. To avoid a flash of the wrong scheme, apply the stored theme before first paint:

```html
<script>try{var t=localStorage.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>
```

## Usage

```tsx
import { Button } from "@underpin/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@underpin/ui/dialog"
import { cn } from "@underpin/ui/variants"
```

Every component under `src/components` is a subpath: `@underpin/ui/<file name>`. The helpers have fixed subpaths: `variants` (`cn`, `variants`, `VariantProps`), `classes`, `interactive`, `slot`, `tone`, `animation`, `icon`, `day`, `shortcuts`, `media`, `time-series`, `chart-curve` and `tokens` (the colour tokens as hex, for code that cannot read CSS).

Components that hold state or render a Base UI part open with `"use client"`. The rest render in a React Server Component as they are.

## License

MIT
