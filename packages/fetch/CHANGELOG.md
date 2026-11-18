# @underpin/fetch

## 0.1.0

### Minor Changes

- First release of `@underpin/fetch`: `downloadPublicUrl(url, { maxBytes })` downloads a URL on the server only when every address it reaches is public. The check runs in the connection's DNS lookup, so DNS rebinding cannot get past it. It follows at most 3 redirects and checks each one. A redirect to another origin drops the credential headers. A body stops as soon as it passes `maxBytes`. `method: "HEAD"` finds where a link lands. `assertPublicUrl`, `PrivateAddressError`, `DownloadTooLargeError` and `HttpStatusError` are exported too. ([58f993c](https://github.com/underpinhq/underpin/commit/58f993c9ac30ae9d3ae76ffc16fa9a615bb58fc7))

### Patch Changes

- Updated dependencies
  - @underpin/utils@3.5.0
