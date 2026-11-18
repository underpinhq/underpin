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
import { getEdgeCountry, openGeoDatabase } from "@underpin/analytics/geo"

const geo = openGeoDatabase("data/GeoLite2-City.mmdb")

geo.lookup("81.2.69.142") // { country: "GB", region: "ENG", city: "London", latitude: 51.5142, longitude: -0.0931 }
geo.lookupCountry("81.2.69.142") // "GB"
getEdgeCountry(request.headers, clientIp.source) // Cloudflare's `cf-ipcountry`, when it gave the IP
resolveGeo(edgeCountry, geo.lookup(clientIp.ip)) // the edge's country, with the database's city only where both agree
```

`openGeoDatabase` reads any MMDB file: MaxMind GeoLite2 or GeoIP2, or DB-IP, Country or City. The package bundles no database. Download one, pass its path, and open it once at startup. A missing or broken file throws, so a server that runs without geo data catches the error. Unknown countries (DB-IP's "ZZ", "XX", Cloudflare's Tor code "T1") come back as an empty string.

## License

MIT
