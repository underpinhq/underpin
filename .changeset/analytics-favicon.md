---
"@underpin/analytics": minor
---

Add `@underpin/analytics/favicon`: `findFavicon(domain, providers)` asks each provider in turn and returns the first icon. It ships three providers: `directProvider()` fetches the site's own `/favicon.ico` through `@underpin/fetch`, `googleProvider()` asks Google's s2 service, and `logoDevProvider({ token })` asks logo.dev. Every provider reads the image type from the bytes and refuses SVG. `resolveLandingHost(url)` finds where a short link lands, with every hop checked.
