# @underpin/utils

A lightweight set of TypeScript utilities. Each module lives in `src/<module>/` with its tests beside it, and `src/index.ts` re-exports every module. Repo-wide rules (checks, changesets, releasing) are in the root `AGENTS.md`.

- **Every export carries an explicit type.** `isolatedDeclarations` is on, so tsdown can emit the declarations without type-checking.
- **Imports stay relative.** The published declarations keep an alias as written, and a consumer cannot resolve it.
- **The suite runs on Bun and on Node.js.** `bun run test` and `bun run test:node` (Vitest) run the same files, so a test uses only the APIs both runners share.
- **A major bump needs a section in the README's migration guide.**
- **The package stays ESM-only** and supports Node.js 22.12 and later, the first versions that can `require()` an ES module.
