# @underpin/analytics

## 0.4.0

### Minor Changes

- `parseUserAgent` takes an optional third argument, `{ parser }`, for an app's own `ua-parser-js` 2.x or PRO `UAParser` class. With it, the result keeps that parser's names as they are. The mobile prefix still comes off `browserFamily`, `deviceType` still defaults to "desktop", and the Client Hints still apply. The app needs its own license for the parser: the free 2.x build is AGPL-3.0. Without a parser, nothing changes. The new `UserAgentParser`, `UserAgentParserResult` and `ParseUserAgentOptions` types describe what the parser must provide. ([d4ebd59](https://github.com/underpinhq/underpin/commit/d4ebd5912c8449134dac6f16bb2a951e0ebcbc79))

## 0.3.0

### Minor Changes

- Remove `@underpin/analytics/favicon`. The favicon lookup moved to `@underpin/favicon`, with the same exports. Change the import from `@underpin/analytics/favicon` to `@underpin/favicon`. `@underpin/analytics` no longer depends on `@underpin/fetch`. ([d99221f](https://github.com/underpinhq/underpin/commit/d99221fbb0691bdba48e2ad5e0aa53c34b74d577))

## 0.2.0

### Minor Changes

- `detectBot` now passes the whole user agent to `isbot`, so a crawler token after the first 512 characters gives "crawler" again. The version checks still read only the first 512 characters. ([2868b7d](https://github.com/underpinhq/underpin/commit/2868b7d22f7287ab4452c88e28f359ccafd793af))

  `openGeoDatabase` now keeps the last 10,000 decoded records in memory, as `maxmind.open` does, so repeated lookups no longer decode the same record again. The new `loadGeoDatabase(path)` reads the file without blocking the event loop and returns a promise, for a job that refreshes the database while the server runs.
- `utm_medium=mcp` now gives the channel "AI". It used to give "Paid Search", because the paid rule matches any medium that contains "cp". A new `findSource` option of `createReferrerClassifier` resolves a `utm_source` the referrer list does not know, such as an MCP client name like `claude-code`, to a source and medium of your own. It runs after the built-in lookups. ([84e66ab](https://github.com/underpinhq/underpin/commit/84e66abc81c22d85030c4da50cb9d7d76ed0df86))

### Patch Changes

- `parseUserAgent` now reads the real iOS version from Safari on iOS 26 and later. Safari freezes the OS token at `iPhone OS 18_6` or `18_7` and writes the real version after `Version/`, so an iOS 26.2 visit used to come back as `osVersion` "18.7". It now comes back as "26.2". ([e98141d](https://github.com/underpinhq/underpin/commit/e98141df203a57a321e08653e12ef4686e14309f))

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
