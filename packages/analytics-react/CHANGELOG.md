# @underpin/analytics-react

## 0.1.0

### Minor Changes

- First release of `@underpin/analytics-react`: `BrowserIcon`, `OsIcon`, `DeviceIcon`, `Flag` and `Favicon` for the values `@underpin/analytics` returns. Each flag and browser logo is its own ES module loaded with `import()`, so any bundler splits them and nothing loads from a CDN. `preloadImages` warms the cache, so a client render shows them without a gap. ([eb2ef82](https://github.com/underpinhq/underpin/commit/eb2ef82c685013b2fe943975f1bbc126613f4c40))
