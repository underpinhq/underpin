---
"@underpin/favicon": minor
---

First release of `@underpin/favicon`, the favicon lookup from `@underpin/analytics/favicon` as a package of its own, with the same exports. `findFavicon(domain, providers)` asks each provider in turn and returns the first icon. `directProvider()` downloads the site's own `/favicon.ico` through `@underpin/fetch`, `googleProvider()` asks Google's s2 service and `logoDevProvider({ token })` asks logo.dev. Every provider reads the image type from the bytes and refuses SVG. `resolveLandingHost(url)` finds where a short link lands, with every hop checked. It installs only `@underpin/fetch` and `@underpin/utils`.
