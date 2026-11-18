---
"@underpin/analytics": minor
---

`utm_medium=mcp` now gives the channel "AI". It used to give "Paid Search", because the paid rule matches any medium that contains "cp". A new `findSource` option of `createReferrerClassifier` resolves a `utm_source` the referrer list does not know, such as an MCP client name like `claude-code`, to a source and medium of your own. It runs after the built-in lookups.
