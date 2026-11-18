# @underpin/analytics-react

React icons for the values `@underpin/analytics` returns: browser logos, OS marks, device glyphs, country flags and favicons.

```bash
bun add @underpin/analytics-react
```

Requires React 19.

## Usage

```tsx
import { BrowserIcon, DeviceIcon, Favicon, Flag, OsIcon } from "@underpin/analytics-react"

<BrowserIcon name="Mobile Safari" />
<OsIcon name="macOS" className="text-muted" />
<DeviceIcon type="tablet" />
<Flag code="PL" />
<Favicon domain="example.com" src={domain => `/api/favicon/${domain}`} />
```

`name` and `type` take the names `parseUserAgent` from `@underpin/analytics/user-agent` returns, in any case. Every component takes `size` (16 pixels by default), `className` and `title`. Without a `title` an icon is decorative (`aria-hidden`).

## How images load

Each flag and each browser logo is its own ES module that holds the image as a data URI, loaded with `import()`. Any bundler splits them into separate chunks, so a page downloads only the images it shows, from its own origin. Nothing loads from a CDN, and nothing needs `import.meta.glob` or an asset loader.

An image that has not loaded yet renders as an empty space of its size, so rows keep their layout. A server render and the client's hydration always render that space, so their markup matches. The client swaps in each image after hydration.

`preloadImages` warms the client's cache, so a client render shows the images without a gap. Call it before a list of rows appears:

```ts
import { preloadImages } from "@underpin/analytics-react"

await preloadImages({ flags: ["pl", "de"], browsers: ["Chrome", "Safari"] })
```

`loadFlag(code)` and `loadBrowserLogo(name)` return one data URI, and `useFlag` and `useBrowserLogo` are the hooks the components use.

## Fallbacks

| Component | Without an image |
| --- | --- |
| `BrowserIcon` | A browser-window glyph. 14 logos cover Chrome, Chromium, Safari (desktop and iOS), Firefox, Edge, Opera, Opera GX, Samsung Internet, Brave, Vivaldi, Yandex, UC Browser and Tor. Mobile and webview names use their browser's logo. |
| `OsIcon` | A desktop glyph. Marks cover Apple systems, Android, Windows, Chrome OS, HarmonyOS, Linux, Ubuntu, Fedora, Debian, FreeBSD and PlayStation. |
| `Flag` | A globe, for an empty code or a code flag-icons has no flag for. |
| `Favicon` | A globe, for an empty domain or an image that fails to load. |

`BrowserIcon`, `OsIcon`, `Flag` and `Favicon` take a `fallback` to render your own icon instead. OS marks and glyphs draw in `currentColor`.

`Favicon` never builds a third-party URL. Serve icons from your own endpoint with `findFavicon` from `@underpin/favicon`, and pass its URL as `src`.

## Licences

The package is MIT. Flags come from flag-icons (MIT), browser logos from alrra/browser-logos (MIT), OS marks from Simple Icons (CC0) and device glyphs from Lucide (ISC). `NOTICE.md` holds their notices.
