# @underpin/analytics-react

## 0.1.2

### Patch Changes

- The `Favicon` docs now point to `@underpin/favicon` for serving icons, since `@underpin/analytics/favicon` moved there. ([c48ad02](https://github.com/underpinhq/underpin/commit/c48ad023f3ea07d210b6556de59c8ccde3715915))

## 0.1.1

### Patch Changes

- `BrowserIcon` now draws the Tor logo, from alrra/browser-logos, for a browser stored as "Tor". Tor Browser sends a plain Firefox user agent, so `parseUserAgent` never returns that name. The name comes from rows another tool stored. ([21bbcb5](https://github.com/underpinhq/underpin/commit/21bbcb542b142e0b4d9c735e30ff6e9cd307f092))

## 0.1.0

### Minor Changes

- First release of `@underpin/analytics-react`: `BrowserIcon`, `OsIcon`, `DeviceIcon`, `Flag` and `Favicon` for the values `@underpin/analytics` returns. Each flag and browser logo is its own ES module loaded with `import()`, so any bundler splits them and nothing loads from a CDN. `preloadImages` warms the cache, so a client render shows them without a gap. ([eb2ef82](https://github.com/underpinhq/underpin/commit/eb2ef82c685013b2fe943975f1bbc126613f4c40))
