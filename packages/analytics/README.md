# @underpin/analytics

Server-side helpers for analytics ingest: user-agent parsing, bot detection, the client IP and a geo lookup. Plain TypeScript with no framework. Each feature is its own subpath, so a server bundles only what it imports.

```bash
bun add @underpin/analytics
```

Requires Node.js 22.12 or later, or Bun. The package ships ES modules only.

## `@underpin/analytics/user-agent`

```ts
import { parseUserAgent } from "@underpin/analytics/user-agent"

parseUserAgent(request.headers.get("user-agent"), request.headers)
// {
//   browser: "Mobile Chrome", browserFamily: "Chrome", browserVersion: "141.0.7390.108",
//   os: "Android", osVersion: "16", deviceType: "mobile", deviceVendor: "", deviceModel: "Pixel 9",
// }
```

`parseUserAgent` runs [`ua-parser-js`](https://github.com/faisalman/ua-parser-js) 1.0.x, the last MIT-licensed line (2.x is AGPL). A mapping layer turns its output into the names `ua-parser-js` 2.x gives, so a product that stored 2.x names keeps its data. A test corpus of 248 real user agents checks every name Highseat stores.

- `browser` keeps the parser's mobile prefix ("Mobile Safari"). `browserFamily` drops it ("Safari").
- `deviceType` is "desktop" when the user agent names no device. An empty user agent gives empty strings in every field.
- The second argument takes the `Sec-CH-UA*` Client Hints, as a `Headers` object or a plain object with lowercase keys. They only fill in what a reduced user agent freezes or leaves out: Windows 11, the real macOS and Android versions, the phone model, and a Chromium browser such as Brave that sends a plain Chrome user agent. Without hints, the result is the same as before.

## `@underpin/analytics/bots`

```ts
import { detectBot, isBackendClient, isBot } from "@underpin/analytics/bots"

detectBot("Googlebot/2.1 (+http://www.google.com/bot.html)") // "crawler"
detectBot("") // "missing"
detectBot(oldChromeUserAgent) // "spoofed"
isBackendClient("node") // true
```

Crawlers come from [`isbot`](https://github.com/omrilotan/isbot). A browser or OS version below a 2020-era floor (Chrome 80, Firefox 80, Safari 13, iOS 13, Android 7) reads as spoofed. Only the user agent is judged. Datacenter IPs and spam referrers are the caller's own checks.

## `@underpin/analytics/client-ip`

```ts
import { getClientIp } from "@underpin/analytics/client-ip"

// One reverse proxy in front, behind Cloudflare.
getClientIp(request.headers, { trustedProxies: 1, cloudflare: true, socketAddress })
// { ip: "203.0.113.7", source: "cf-connecting-ip" }

// Proxies on a private network.
getClientIp(request.headers, { trustedProxies: ["10.0.0.0/8"], socketAddress })
```

The trusted proxies are always config. With none, `x-forwarded-for` is ignored and the socket address is the client.

- `trustedProxies: n` reads the entry `n` hops from the right of `x-forwarded-for`.
- `trustedProxies: [...ranges]` skips every entry from the right inside a range and returns the first one outside. The header is read only when `socketAddress` is inside the ranges too: a socket outside them is a direct client, and an unknown socket proves nothing.
- `cloudflare: true` believes `cf-connecting-ip` only when the peer is one of Cloudflare's published addresses.
- `x-real-ip` is never read.

## `@underpin/analytics/geo`

```ts
import { getEdgeCountry, openGeoDatabase, resolveGeo } from "@underpin/analytics/geo"

const geo = openGeoDatabase("data/GeoLite2-City.mmdb")

geo.lookup("81.2.69.142") // { country: "GB", region: "ENG", city: "London", latitude: 51.5142, longitude: -0.0931 }
geo.lookupCountry("81.2.69.142") // "GB"
getEdgeCountry(request.headers, clientIp.source) // Cloudflare's `cf-ipcountry`, when it gave the IP
resolveGeo(edgeCountry, geo.lookup(clientIp.ip)) // the edge's country, with the database's city only where both agree
```

`openGeoDatabase` reads any MMDB file: MaxMind GeoLite2 or GeoIP2, or DB-IP, Country or City. The package bundles no database. Download one, pass its path, and open it once at startup. A missing or broken file throws, so a server that runs without geo data catches the error. Unknown countries (DB-IP's "ZZ", "XX", Cloudflare's Tor code "T1") come back as an empty string.

## `@underpin/analytics/favicon`

```ts
import { directProvider, findFavicon, googleProvider, logoDevProvider } from "@underpin/analytics/favicon"

const providers = [directProvider(), googleProvider()]
const favicon = await findFavicon("example.com", providers)
// { body: Uint8Array, contentType: "image/png" } or null
```

`findFavicon` asks each provider in turn and returns the first icon. Storage and caching stay with you.

- **It resolves to null** only when every provider answered that the host has no icon, so you may cache the miss.
- **It rejects** when no icon was found and a provider failed (an outage, a rate limit, a timeout), so the next request asks again.
- **A miss** is a 4xx answer other than 408 and 429, a host that does not exist, a private address, or a body that is no image or is too large. A cancelled call rejects with the abort reason.

| Provider | Source | Notes |
| --- | --- | --- |
| `directProvider()` | The site's own `/favicon.ico` | Downloads through `@underpin/fetch`, so every address, redirects included, must be public. The host never leaves your server. |
| `googleProvider()` | Google's s2 favicon service | The widest coverage. Its grey-globe 404 counts as a miss. Proxy the icon, so browsers never contact Google. |
| `logoDevProvider({ token })` | logo.dev | Asks for `fallback=404`, so no generated monogram, at logo.dev's default size unless you pass `size`. Re-host the icon, so your key stays private. |

Every provider reads the image type from the bytes and accepts PNG, ICO, GIF, JPEG and WebP up to 128 KB. An SVG can carry script, so it is never accepted. `resolveLandingHost(url)` follows a short link's redirects with guarded `HEAD` requests and returns the host it lands on, to ask a provider about. A landing site that refuses `HEAD` still counts.

## `@underpin/analytics/referrer`

```ts
import { createReferrerClassifier, type ReferrerDataset } from "@underpin/analytics/referrer"
import dataset from "./data/referers.json" with { type: "json" }

const { resolveReferrer } = createReferrerClassifier(dataset as ReferrerDataset)

resolveReferrer({ referrer: "https://news.ycombinator.com/item?id=1" }, { domain: "example.com" })
// { domain: "news.ycombinator.com", source: "Hacker News", channel: "Organic Social" }
resolveReferrer({ utm_source: "newsletter", utm_medium: "email" })
// { domain: "", source: "newsletter", channel: "Email" }
```

It names the source of a visit (Google, Hacker News, the raw host when unknown) and a default channel in the style of Google Analytics 4 (GA4): Direct, Organic Search, Paid Search, Organic Social, Paid Social, Email, Referral, Affiliate, Display, AI or Other. `resolveReferrer` folds a self-referral, and a return from a sign-in or checkout host, to Direct. Campaign parameters and ad click ids (`gclid`, `msclkid`, `fbclid` and others) decide paid channels.

**You supply the referrer list.** The usual one, Snowplow's [referer-parser](https://github.com/snowplow-referer-parser/referer-parser), is GPL-3.0, so this MIT package cannot bundle it. Download it once with the `underpin-referers` command, commit both files it writes, and run it again every few months:

```bash
bunx underpin-referers src/data/referers.json
```

It writes the flattened list to `src/data/referers.json` and the list's licence notice to `src/data/NOTICE.md`. `--url <yaml url>` downloads another copy of `referers.yml`.

`@underpin/analytics/referrer-dataset` holds the same steps for a script of your own: `downloadReferrerDataset(url?)` downloads and flattens the list, `parseReferrerDataset(yaml)` flattens a copy you already have, and `REFERER_PARSER_NOTICE` is the notice text. It is a separate subpath, so the classifier never loads the YAML parser. The package's own layer (`REFERRER_OVERRIDES` for AI assistants, X, Bluesky and developer communities, `REFERRER_RENAMES` and `PASS_THROUGH_HOSTS`) is MIT, and each can be replaced through the options.

## License

MIT
