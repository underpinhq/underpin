---
name: commits
description: Conventional commit message guidelines. Use when writing commit messages, reviewing commits, or when asked to commit changes. Covers commit types, subject rules (lowercase, imperative), atomic commits, and examples of good vs bad messages.
---

# Commit Convention

Guidelines for writing consistent and clear commit messages.

## Format

```
<type>: <description>
```

- No scope required.
- Subject line only: no body, no footer. Commit with a single `git commit -m "<subject>"`.
- Max 72 characters for the subject line.

## Types

- `feat` — new feature or capability
- `fix` — bug fix
- `docs` — documentation only changes
- `style` — code style/formatting (no logic changes)
- `refactor` — code restructuring (no feature, no fix)
- `perf` — performance improvements
- `test` — adding or updating tests
- `build` — build system or dependency changes
- `ci` — CI/CD configuration changes
- `chore` — maintenance tasks, configs
- `revert` — reverting a previous commit

## Subject Rules

- **lowercase start**: description starts with a lowercase letter.
- **acronyms allowed**: uppercase acronyms like SEO, FAQ, API are fine (e.g., "fix SEO meta tags").
- **dashes allowed**: hyphens in descriptions are fine (e.g., "add user-friendly layout").
- **imperative mood**: use "add", not "added" or "adds".
- **no period**: do not end the subject with a period.
- **max 72 chars**: keep it concise.

## Atomic Commits

One logical change per commit. If the description requires "and", consider splitting the changes into separate commits.

## Folding Into the Previous Commit

If a change is small and belongs to the logical change you *just* committed — a
follow-up tweak, a cleanup you missed, removing something the last commit made
unused — fold it into that previous commit with `git commit --amend` instead of
creating a new one. Don't leave a trail of tiny `fix: typo` / `refactor: drop
unused x` commits behind a change that was really one unit of work.

- Only fold into a commit that is genuinely part of the *same* logical change.
- If the previous commit is already pushed, amend + `git push --force-with-lease`.
- When it's a distinct logical change, keep it a separate commit (see Atomic Commits).

## Breaking Changes

Use the `!` suffix after the type for breaking changes:

```
feat!: remove deprecated API endpoint
```

## Good vs Bad Examples

### Good
- `feat: add user authentication flow`
- `fix: resolve login redirect loop`
- `fix: improve SEO meta tag rendering`
- `feat: add user-friendly FAQ page`
- `refactor: extract validation logic into separate module`
- `docs: update API documentation for v2 endpoints`
- `chore: update dependencies to latest versions`

### Bad
- `feat: Added user authentication` (past tense)
- `fix: Bug fix` (vague)
- `feat: add user auth and update profile page` (multiple logical changes)
- `FEAT: Add user auth` (uppercase type)
- `feat: Add user auth` (uppercase description start)
