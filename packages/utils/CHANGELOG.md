# @underpin/utils

## 3.5.0

### Minor Changes

- `getClientIp` takes `trustedProxies` and `socketAddress`, for servers behind more than one proxy or reachable directly. Passing either one applies stricter rules: only the entries the trusted proxies wrote are read, and `x-real-ip` is never read. Called as before, it behaves as before. `resolveClientIp` returns the address together with the header it came from. ([64360ad](https://github.com/underpinhq/underpin/commit/64360ad80d022c99780f42232605bddc8a3b5acc))

  New helpers: `timeoutSignal(ms, signal?)` combines a timeout with a caller's `AbortSignal`, `getParentDomains(hostname)` lists a hostname and the domains above it, and `isHostnameAllowed(hostname, site)` checks a hostname against a site's domain and extra hostnames.

  `isHostname` now accepts punycode top-level domains such as `xn--p1ai`.
