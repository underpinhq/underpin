# Underpin

The source of the `@underpin` npm packages, shared by the products built on them.

| Package | Description |
| --- | --- |
| [`@underpin/ui`](packages/ui) | React components on Base UI and Tailwind CSS v4 ([npm](https://www.npmjs.com/package/@underpin/ui)) |
| [`@underpin/utils`](packages/utils) | A lightweight set of TypeScript utilities, renamed from `@dirstack/utils` |
| [`@underpin/analytics`](packages/analytics) | Server-side user-agent parsing, bot detection, client IP and geo lookup |
| [`@underpin/analytics-react`](packages/analytics-react) | React icons for analytics values: browser logos, OS marks, device glyphs, flags and favicons |
| [`@underpin/fetch`](packages/fetch) | A server-side download that refuses private addresses, redirects included |
| [`@underpin/favicon`](packages/favicon) | A server-side favicon lookup: the site's own icon, Google's service or logo.dev |
| [`@underpin/config`](packages/config) | Shared lint, format and commit configs, and the `underpin` release CLI and workflows, renamed from `@dirstack/kodeks` ([npm](https://www.npmjs.com/package/@underpin/config)) |

Upgrading from `@dirstack/ui` 1.x: [`packages/ui/MIGRATION.md`](packages/ui/MIGRATION.md).

## Contributing

`packages/ui` is developed in a private monorepo and synced here one way, so a change to it made here is overwritten by the next sync. Issues about it are welcome. Every other package is developed in this repository.

```bash
bun install
bun run check-types
bun run test
bun run build
```

## Releases

Each version is published to npm from this repository's GitHub Actions with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so every release carries a [provenance attestation](https://docs.npmjs.com/generating-provenance-statements) that links it to the commit and the workflow run that built it.

## License

MIT
