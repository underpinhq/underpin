# Shared analytics packages

Linear project: [P-UND-36](https://linear.app/piotrkulpinski/project/shared-analytics-packages-replace-per-product-copies-a4e0afedba72), "Shared analytics packages replace per-product copies".

Highseat, Wend, Revinel and Dirstarter each carry their own copy of the same analytics parts: user-agent parsing, bot checks, geo lookup, guarded downloads, favicons and icons. This project moves them into published `@underpin` packages in this repository, so each product deletes its copy.

## Packages

- **`@underpin/analytics`**: server-side TypeScript, no framework. One subpath per feature: `/user-agent`, `/bots`, `/client-ip`, `/geo`, `/favicon`, `/referrer`.
- **`@underpin/fetch`**: a server-only guarded download (`downloadPublicUrl`, `assertPublicUrl`, `DownloadTooLargeError`) on `isPublicIp` from `@underpin/utils`. It is its own package because Dirstarter uses it for tool media, and `@underpin/utils` must stay free of Node built-ins.
- **`@underpin/analytics-react`**: `BrowserIcon`, `OsIcon`, `DeviceIcon`, `Flag`, `Favicon`. Its icon keys are the names `/user-agent` returns.

## Decisions

- `parseUserAgent()` wraps `ua-parser-js` 1.0.x (MIT). Highseat and Wend run 2.x, which is AGPL. A mapping layer returns the names both products store today, and a test corpus proves it, so no stored data changes.
- Where Highseat and Wend store different names, `parseUserAgent` returns both: `browser` keeps the mobile prefix as Highseat stores it ("Mobile Safari"), and `browserFamily` drops it as Wend stores it ("Safari"). Both products use Highseat's device type rule.
- New packages are developed here. Only `packages/ui` is developed in Highseat and synced in.
- `analytics-react` uses no CDN and no `import.meta.glob`: one ES module per logo and flag, so any bundler splits them and Highseat's dashboard loads nothing from a third party.
- Geo data is not bundled. The consumer passes an MMDB file (GeoLite2 or DB-IP).
- Trusted proxies for the client IP are config, never hardcoded.

## Phases

1. `/user-agent`, `/bots`, `/client-ip`, `/geo` ([UND-1](https://linear.app/piotrkulpinski/issue/UND-1))
2. `@underpin/fetch` and `/favicon` ([UND-3](https://linear.app/piotrkulpinski/issue/UND-3))
3. `@underpin/analytics-react`
4. `/referrer` ([UND-5](https://linear.app/piotrkulpinski/issue/UND-5))

Later, outside this project: `@underpin/dotmap` and `lint-names`.

## Done when

- Every package above is on npm with provenance.
- Highseat, Wend, Revinel and Dirstarter have deleted their own copies and import the packages instead, tracked in each product's team.
- Neither Highseat nor Wend depends on AGPL `ua-parser-js`.
- Revinel's unguarded favicon fetch is gone.
