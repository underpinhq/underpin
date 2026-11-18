---
"@underpin/analytics": minor
---

First release of `@underpin/analytics`, server-side analytics helpers with one subpath per feature:

- `@underpin/analytics/user-agent`: `parseUserAgent(userAgent, hints?)` returns the browser, OS and device names `ua-parser-js` 2.x gives, on the MIT-licensed 1.x parser. It reads `Sec-CH-UA*` Client Hints when given.
- `@underpin/analytics/bots`: `detectBot`, `isBot`, `isAncientBrowser` and `isBackendClient`.
- `@underpin/analytics/client-ip`: `getClientIp` reads the visitor's IP from `x-forwarded-for` and Cloudflare's `cf-connecting-ip`, trusting only the proxies you configure.
- `@underpin/analytics/geo`: `openGeoDatabase` looks up countries and cities in a GeoLite2 or DB-IP MMDB file you provide, and `resolveGeo` merges it with Cloudflare's country.
