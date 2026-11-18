---
"@underpin/analytics": minor
---

Remove `@underpin/analytics/favicon`. The favicon lookup moved to `@underpin/favicon`, with the same exports. Change the import from `@underpin/analytics/favicon` to `@underpin/favicon`. `@underpin/analytics` no longer depends on `@underpin/fetch`.
