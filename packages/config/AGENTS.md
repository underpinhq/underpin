# @underpin/config

Shared lint, format, commit and release configs, plus the `underpin` CLI in `cli/` (also installed as `kodeks`, its earlier name). It was `@dirstack/kodeks` up to 1.11.0. Repo-wide rules (checks, changesets, releasing) are in the root `AGENTS.md`.

- **The package ships `cli/` (built to `dist/`), `configs/`, `skills/` and `package.json`**, plus the reusable workflows in the root `.github/workflows/public-*.yml`. A change to any of them needs a changeset for `@underpin/config`.
- **Pick the bump by its effect on existing users.** A fix is a patch. A new config, command, option or workflow input is a minor. A removed export, a renamed flag or input, or any change that makes a working setup fail is a major.
- **This repository runs its own source.** The root configs import `configs/` directly, and `release.yml` runs the CLI built from the same commit. A change here applies to this repository's own lint, format and release at once.
- **Never run `bunx underpin` or `bunx kodeks`.** Outside an install both names resolve unrelated packages on npm. Run `bun run underpin <command>` from the root after `bun run build`. `bin/underpin.js` is committed, so the bin links before `dist` exists, and it needs a build to run.
- **Imports in `cli/` stay relative.** The CLI ships as plain `tsc` output, which resolves no path alias.
- **Pin every action in the reusable workflows to a full commit SHA.** Other repositories call them with publishing rights and a deploy key.
