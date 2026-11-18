# @underpin/favicon

A server-side favicon lookup. Repo-wide rules (checks, changesets, releasing) are in the root `AGENTS.md`.

- **Every download goes through `downloadPublicUrl`** from `@underpin/fetch`, for the site's own icon and for the services alike. Tests pass a fake `download`, so they never reach a network.
- **The image type comes from the bytes.** A server's `content-type` can say anything. SVG stays refused, because it can carry script.
- **Every export carries an explicit type.** `isolatedDeclarations` is on.
