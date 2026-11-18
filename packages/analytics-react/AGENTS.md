# @underpin/analytics-react

React icons for `@underpin/analytics` values. Repo-wide rules (checks, changesets, releasing) are in the root `AGENTS.md`.

- **`src/generated` is written, never edited.** `scripts/generate.ts` builds it from flag-icons, Simple Icons, Lucide and `assets/browsers`, and the `build`, `check-types` and `test` scripts run it first. It is gitignored. The root `bun run test` needs it, which `bun run check-types` provides.
- **One module per image, loaded with `import()`.** Never `import.meta.glob`, a CDN or an absolute URL: products load everything from their own origin.
- **Icon keys are `parseUserAgent` names.** `src/names.ts` maps them in lowercase. Names other tools store, such as Plausible imports, sit in their own map. `src/fixtures/parser-names.json` lists the names the parser returns over 71,462 public user agents, and the snapshots in `src/__snapshots__` list every name that falls back. Review a snapshot change as a fallback decision.
- **Keep the licence notices.** A new image source adds its notice to `NOTICE.md`.
- **Every export carries an explicit type.** `isolatedDeclarations` is on.
