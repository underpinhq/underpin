# @underpin/analytics

## 0.1.1

### Patch Changes

- Install outside the monorepo. 0.1.0 listed its `@underpin` dependencies as `workspace:^`, which no package manager can resolve from npm. This release lists real version ranges. ([ba47043](https://github.com/underpinhq/underpin/commit/ba47043283d5c6f75b6002b632a3e22d8c2a4d36))
- Updated dependencies
  - @underpin/fetch@0.1.1

## 0.1.0

### Minor Changes

- Add `@underpin/analytics/favicon`: `findFavicon(domain, providers)` asks each provider in turn and returns the first icon. It ships three providers: `directProvider()` fetches the site's own `/favicon.ico` through `@underpin/fetch`, `googleProvider()` asks Google's s2 service, and `logoDevProvider({ token })` asks logo.dev. Every provider reads the image type from the bytes and refuses SVG. `resolveLandingHost(url)` finds where a short link lands, with every hop checked. ([9513f43](https://github.com/underpinhq/underpin/commit/9513f43421e853967eaa0223661d9c26f6b24e7c))
- First release of `@underpin/analytics`, server-side analytics helpers with one subpath per feature: ([859aaf5](https://github.com/underpinhq/underpin/commit/859aaf540523c3b9bcac53c0c683a8a510574d8d))

  - `@underpin/analytics/user-agent`: `parseUserAgent(userAgent, hints?)` returns the browser, OS and device names `ua-parser-js` 2.x gives, on the MIT-licensed 1.x parser. It reads `Sec-CH-UA*` Client Hints when given.
  - `@underpin/analytics/bots`: `detectBot`, `isBot`, `isAncientBrowser` and `isBackendClient`.
  - `@underpin/analytics/geo`: `openGeoDatabase` looks up countries and cities in a GeoLite2 or DB-IP MMDB file you provide, and `resolveGeo` merges it with Cloudflare's country.
- Add `@underpin/analytics/referrer`: `createReferrerClassifier(dataset)` names the source of a visit and its GA4-style channel from the referrer, the campaign parameters and the ad click ids. The referrer list is yours to supply: Snowplow's referer-parser list is GPL-3.0, so the `underpin-referers <output.json>` command downloads and flattens it, and writes its licence notice beside it, for you to commit. `@underpin/analytics/referrer-dataset` exports the same steps (`downloadReferrerDataset`, `parseReferrerDataset`, `REFERER_PARSER_NOTICE`) for a script of your own. The package's own overrides for AI assistants and social platforms are included. ([4659627](https://github.com/underpinhq/underpin/commit/46596275efb3138117bad846188625b55d07cea1))

### Patch Changes

- Updated dependencies
  - @underpin/fetch@0.1.0
  - @underpin/utils@3.5.0
