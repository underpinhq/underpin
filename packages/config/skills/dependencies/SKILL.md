---
name: dependencies
description: Upgrade project dependencies to their latest versions safely. Use when the user asks to "update dependencies", "upgrade deps", "bump packages", "check for outdated packages", or wants to refresh a lockfile. Auto-detects the package manager (bun, pnpm, yarn, npm) and handles monorepos by upgrading every workspace package.
---

# Dependencies

Upgrade project dependencies to the latest versions in a controlled, verifiable way.

## 1. Detect the package manager

Inspect the repo root before running anything:

- `bun.lock` or `bun.lockb` → **bun** (default for this user)
- `pnpm-lock.yaml` → **pnpm**
- `yarn.lock` → **yarn**
- `package-lock.json` → **npm**

Also check the `packageManager` field in `package.json`. Use whatever the project actually uses — never switch managers.

## 2. Detect monorepo layout

Look for any of:

- `workspaces` field in root `package.json` (bun, npm, yarn)
- `pnpm-workspace.yaml` (pnpm)
- `turbo.json`, `nx.json`, `lerna.json` as a hint

If it's a monorepo, every workspace `package.json` must be upgraded. Don't skip the root — it usually owns dev tooling.

## 3. Check what's outdated

Run from the repo root:

```bash
bun outdated                    # bun
pnpm -r outdated                # pnpm (recursive)
yarn outdated                   # yarn
npm outdated                    # npm
```

For a clearer per-package view in monorepos, list workspaces and check each:

```bash
# bun monorepo: scan every workspace
for dir in $(bun pm ls --workspaces 2>/dev/null | awk '/^@/{print $NF}'); do
  echo "=== $dir ==="; (cd "$dir" && bun outdated)
done
```

## 4. Upgrade interactively with taze

`taze` is package-manager-agnostic, supports monorepos, and respects semver ranges. Prefer it over manager-specific upgrade commands.

```bash
bunx taze -r -I        # bun  — recursive, interactive
pnpm dlx taze -r -I    # pnpm
yarn dlx taze -r -I    # yarn
npx taze -r -I         # npm
```

Flags:

- `-r` — recurse into all workspaces (monorepo)
- `-I` — interactive picker
- `major` — include major bumps (default is minor + patch)
- `-w` — write to `package.json` without prompting (only when the user wants a non-interactive run)

For a non-interactive "everything to latest, including majors" pass:

```bash
bunx taze major -r -w
```

## 5. Reinstall and regenerate the lockfile

```bash
bun install        # bun
pnpm install       # pnpm
yarn install       # yarn
npm install        # npm
```

If install fails on peer-dep conflicts, surface the conflict to the user — do not silently add `--legacy-peer-deps` or overrides.

### Duplicate transitive copies

An incremental install can leave two copies of a shared transitive package: the bumped one nested under its parent, and a stale hoisted one still satisfying some other package's peer range. Symptom is a type error claiming two identically-named types are incompatible, usually ending in `Property '#private' in type 'X' refers to a different member`, with two paths differing only by a `node_modules/<parent>/node_modules/` segment. The versions can even be identical. TypeScript nominally distinguishes classes with private fields, so two physical copies are two types.

`bun update <pkg>` does not fix this: it bumps the hoisted copy but leaves both on disk. A clean reinstall does:

```bash
rm -rf node_modules && bun install
```

Then confirm one copy remains:

```bash
find node_modules -path "*<pkg>/package.json" -exec grep -H '"version"' {} \;
```

Real case: `@tanstack/react-query` 5.101.2 → 5.101.4 left `@tanstack/query-core` 5.101.4 nested under react-query and 5.101.2 hoisted for `@orpc/tanstack-query`'s `>=5.80.2` peer, breaking every `mutationOptions()` call site.

## 6. Exact pins

Treat an exact version (no `^`) as a question, not a rule. Find out why before honoring it:

```bash
git log -S'"<pkg>": "<version>"' --oneline -- package.json
```

- **Dependabot bump:** the pin is an artifact of its default range style, not a decision. Unpin.
- **A commit that deliberately changed `^x.y.z` to `x.y.z`:** a workaround. Check whether the underlying cause still applies (often it's the duplicate-copy problem above, which a clean reinstall now solves). If it does not, unpin.
- **A comment or note explaining the pin:** leave it, and say why in the report.

After unpinning, verify from `rm -rf node_modules && bun install`, not an incremental one. A fresh clone and CI install that way.

## 7. Verify nothing broke

Run whatever the project provides, in this rough order — stop on the first failure and report it:

```bash
# Type check
bun run typecheck   # or: tsc --noEmit

# Lint
bun run lint        # whatever's configured (oxlint, biome, eslint, …)

# Format
bun run format      # if the project provides it (oxfmt, biome, prettier, …)

# Tests
bun run test

# Build
bun run build
```

Inspect `package.json` `scripts` first — don't invent script names. In a monorepo with turbo/nx, prefer the root-level orchestrated script (`bun run build`, `turbo run build`) over per-package runs.

## 8. Handle breaking changes

For each major bump, check the package's CHANGELOG or migration guide before assuming the upgrade is clean. Common ones to watch for:

- **TypeScript** — new strictness/type errors; fix in source, don't downgrade.
- **React / Next.js / Tailwind** — codemods often available (`npx @next/codemod`, `npx @tailwindcss/upgrade`).
- **Drizzle / Prisma** — may require regenerating the client or migrations.
- **Vitest / Jest** — config shape can change between majors.

If a breaking change requires more than a trivial fix, stop and surface it to the user before proceeding.

## 9. Security audit

After upgrading, verify no known vulnerabilities remain:

```bash
bun audit         # bun (>= 1.2)
pnpm audit
yarn npm audit
npm audit
```

If the audit flags something the upgrade didn't fix, escalate to the user — don't silently pin transitive deps.

## Catalogs (pnpm / bun)

If the repo uses a catalog (`pnpm-workspace.yaml` `catalog:` block, or bun's `workspaces.catalog` in `package.json`), upgrade the catalog entries, not the individual `package.json` references. `taze` handles this automatically with `-r`.

## Rollback

If something goes wrong and the user wants to bail:

```bash
git checkout -- package.json '**/package.json' bun.lock   # adjust lockfile name
bun install
```

Confirm with the user before any `git checkout --` since it discards local changes.

## Reporting back

When done, summarize:

- Package manager used
- Number of workspaces touched
- Major version bumps (list them)
- Exact pins unpinned, and any left pinned with the reason
- Any verification step that failed
- Any breaking changes the user needs to review

Leave commits to the user.
