# @underpin/fetch

## 0.1.1

### Patch Changes

- Install outside the monorepo. 0.1.0 listed its `@underpin` dependencies as `workspace:^`, which no package manager can resolve from npm. This release lists real version ranges. ([ba47043](https://github.com/underpinhq/underpin/commit/ba47043283d5c6f75b6002b632a3e22d8c2a4d36))

## 0.1.0

### Minor Changes

- First release of `@underpin/fetch`: `downloadPublicUrl(url, { maxBytes })` downloads a URL on the server only when every address it reaches is public. The check runs in the connection's DNS lookup, so DNS rebinding cannot get past it. It follows at most 3 redirects and checks each one. A redirect to another origin drops the credential headers. A body stops as soon as it passes `maxBytes`. `method: "HEAD"` finds where a link lands. `assertPublicUrl`, `PrivateAddressError`, `DownloadTooLargeError` and `HttpStatusError` are exported too. ([58f993c](https://github.com/underpinhq/underpin/commit/58f993c9ac30ae9d3ae76ffc16fa9a615bb58fc7))

### Patch Changes

- Updated dependencies
  - @underpin/utils@3.5.0
