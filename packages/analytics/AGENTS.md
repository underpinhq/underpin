# @underpin/analytics

Server-side analytics helpers, one subpath export per feature. Repo-wide rules (checks, changesets, releasing) are in the root `AGENTS.md`.

- **A feature is a folder.** `src/<name>/<name>.ts` is the entry, and the `./*` export maps `@underpin/analytics/<name>` to it. A new subpath adds its folder and its entry in `tsdown.config.ts`. `package.json` stays as it is.
- **`ua-parser-js` stays on 1.x.** 2.x is AGPL-licensed. A test fails when the installed version is not MIT.
- **Dependencies carry a permissive licence.** MIT, BSD, ISC or Apache-2.0, never a copyleft one such as GPL or AGPL.
- **User-agent names match `ua-parser-js` 2.x.** Highseat and Wend store the names 2.x gives. `src/user-agent/names.ts` renames 1.x output and `extensions.ts` adds patterns 1.x lacks. Write each pattern from observed user agents, never by copying the 2.x source.
- **The corpus guards the names.** `src/user-agent/fixtures/highseat-corpus.json` holds real user agents with the names Highseat stores. A change that breaks a case changes stored data. Its README says how it was built.
- **Shared helpers go to `@underpin/utils`** when they need no Node built-ins, such as the client IP, `timeoutSignal` and the hostname helpers. Products then need no analytics import for them.
- **`/referrer` never bundles referer-parser's list.** The list is GPL-3.0. Consumers download it with the `underpin-referers` bin or `/referrer-dataset`, a separate subpath so `/referrer` never loads `yaml`. The only copy here is the GPL test slice in `src/referrer/fixtures`, which stays out of the package.
- **No private analytics data in fixtures.** This repository is public. A fixture from a product's database keeps only values that name public platforms.
- **Every export carries an explicit type.** `isolatedDeclarations` is on.
- **Imports stay relative**, and `@underpin/utils` is imported by subpath. Its built `dist` must exist, which `bun run check-types` takes care of through turbo.
