# Underpin

The source of the `@underpin` npm packages, shared by the products built on them.

| Package | Description |
| --- | --- |
| [`@underpin/ui`](packages/ui) | React components on Base UI and Tailwind CSS v4 ([npm](https://www.npmjs.com/package/@underpin/ui)) |
| [`@underpin/utils`](packages/utils) | A lightweight set of TypeScript utilities, renamed from `@dirstack/utils` |

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
