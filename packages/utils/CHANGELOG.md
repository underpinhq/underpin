# @underpin/utils

## 3.7.0

### Minor Changes

- Add `escapeXml`, which escapes `&`, `<`, `>`, `"` and `'` as XML entities. Use it for any text you write into XML or HTML by hand, such as the URLs in a sitemap. ([8b7dd19](https://github.com/underpinhq/underpin/commit/8b7dd19732bac597a0d1d7d4b3e3007b027dbb24))

## 3.6.0

### Minor Changes

- Add `formatDisplayUrl`, which turns a URL into the short form a reader expects: `https://www.example.com/ai/?utm_source=x&ref=y` becomes `example.com/ai?ref=y`. It drops the protocol, a leading `www.`, every `utm_*` param, common ad click ids such as `fbclid` and `gclid`, and a trailing slash. Other query params and the hash stay. Input that is not a full URL, such as `example.com/a/`, is cleaned the same way. ([548c698](https://github.com/underpinhq/underpin/commit/548c698becdb684e5a8a5e94378ad47cd28a130a))

## 3.5.0

### Minor Changes

- `getClientIp` takes `trustedProxies` and `socketAddress`, for servers behind more than one proxy or reachable directly. Passing either one applies stricter rules: only the entries the trusted proxies wrote are read, and `x-real-ip` is never read. Called as before, it behaves as before. `resolveClientIp` returns the address together with the header it came from. ([64360ad](https://github.com/underpinhq/underpin/commit/64360ad80d022c99780f42232605bddc8a3b5acc))

  New helpers: `timeoutSignal(ms, signal?)` combines a timeout with a caller's `AbortSignal`, `getParentDomains(hostname)` lists a hostname and the domains above it, and `isHostnameAllowed(hostname, site)` checks a hostname against a site's domain and extra hostnames.

  `isHostname` now accepts punycode top-level domains such as `xn--p1ai`.
