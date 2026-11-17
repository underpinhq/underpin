# Underpin

The source monorepo of the `@underpin` npm packages. Bun workspaces and Turborepo, one package per directory in `packages/`.

## Where each package is developed

This repository is a hybrid:

- **`packages/ui` (`@underpin/ui`) is developed in Highseat**, in its `packages/ui`. Highseat's `sync-ui.yml` copies it here on every change, with `underpin sync-public` and `packagesOnly`. Each sync replaces `packages/ui` and nothing else.
- **Every other package is developed here.** The root files (this file, `package.json`, `bun.lock`, the workflows, the configs) are this repository's own source too.

Rules:

- **Never edit `packages/ui` here.** The next sync overwrites the change. Make it in Highseat. That covers its `package.json`, its `CHANGELOG.md` and its version: Highseat versions the UI with its own changesets, so `.changeset/config.json` here ignores `@underpin/ui`.
- **Lint and format skip `packages/ui`.** Highseat lints and formats it. Type checks, tests and the build here do cover it, so a sync that breaks this repository shows up in CI on `main`.
- **A sync pushes straight to `main`** and may update `bun.lock` when a UI dependency changes. A pull request that also changes `bun.lock` rebases after a sync.
- **The UI source moves here later**, once its daily churn drops. Until then, keep these rules.

## Checks

```bash
bun run lint:check
bun run format:check
bun run check-types
bun run test
bun run build
```

`bun run test` runs `bun test --isolate` from the root, across every package. `--isolate` gives each test file a fresh global scope, which the happy-dom suites in `packages/ui` need.

## Releasing

Releases use Changesets. Pushing to `main` never publishes a package that has no new version.

1. **A PR that changes what a package ships carries a changeset.** Run `bunx changeset`, pick the package and the bump, and write the entry for the people who use the package. It lands in that package's `CHANGELOG.md` and in its GitHub Release.
2. **Pick the bump by its effect on existing users.** A fix is a patch. A new export, option or command is a minor. A removed or renamed export, a changed signature or return value, or any change that makes a working setup fail is a major.
3. **A change that ships nothing needs no changeset.** That covers tests, READMEs and the root configs and workflows. CI runs `bunx changeset status --since=origin/main`.
4. **`release.yml` versions and publishes.** While changesets are pending, its `version` job opens or updates the "Version Packages" PR. Merging that PR bumps the versions on `main`. Its `release` job then runs `underpin publish`, which publishes every version listed in `underpin.release.json` that is not on npm yet, and creates one GitHub Release per package version, tagged `<name>@<version>`.

Rules:

- **Never publish by hand.** npm accepts only trusted publishing from this repository's `release.yml`. Renaming `release.yml` breaks publishing until each package's trusted publisher on npmjs.com names the new file.
- **A package publishes only when `underpin.release.json` lists it and its `package.json` is not private.** A new package starts private and unlisted. Before it is listed, its name needs a placeholder version on npm and a trusted publisher pointing at `underpinhq/underpin` and `release.yml`.
- **`@underpin/config` is pinned exactly.** It was `@dirstack/kodeks`, and its source is still `dirstack/kodeks`. `release.yml` calls its workflows at the commit SHA of a release there, and the root `package.json` takes its exact version. Bump them together.
