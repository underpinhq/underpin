# @underpin/favicon

Finds a site's favicon on the server, from the site itself or from an icon service, and checks every download. It returns the icon's bytes and type. Storage and caching stay with you.

```bash
bun add @underpin/favicon
```

Server-only: it runs on Node.js 22.12 or later, or Bun. Every download goes through [`@underpin/fetch`](../fetch), so a host that resolves to a private address counts as a miss.

## Usage

```ts
import { directProvider, findFavicon, googleProvider, logoDevProvider } from "@underpin/favicon"

const providers = [directProvider(), googleProvider()]
const favicon = await findFavicon("example.com", providers)
// { body: Uint8Array, contentType: "image/png" } or null
```

`findFavicon` asks each provider in turn and returns the first icon.

- **It resolves to null** only when every provider answered that the host has no icon, so you may cache the miss.
- **It rejects** when no icon was found and a provider failed (an outage, a rate limit, a timeout), so the next request asks again.
- **A miss** is a 4xx answer other than 408 and 429, a host that does not exist, a private address, or a body that is no image or is too large. A cancelled call rejects with the abort reason.

| Provider | Source | Notes |
| --- | --- | --- |
| `directProvider()` | The site's own `/favicon.ico` | Downloads through `@underpin/fetch`, so every address, redirects included, must be public. The host never leaves your server. |
| `googleProvider()` | Google's s2 favicon service | The widest coverage. Its grey-globe 404 counts as a miss. Proxy the icon, so browsers never contact Google. |
| `logoDevProvider({ token })` | logo.dev | Asks for `fallback=404`, so no generated monogram, at logo.dev's default size unless you pass `size`. Re-host the icon, so your key stays private. |

Every provider reads the image type from the bytes and accepts PNG, ICO, GIF, JPEG and WebP up to 128 KB. An SVG can carry script, so it is never accepted. `resolveLandingHost(url)` follows a short link's redirects with guarded `HEAD` requests and returns the host it lands on, to ask a provider about. A landing site that refuses `HEAD` still counts.

## License

MIT
