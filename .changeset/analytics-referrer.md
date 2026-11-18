---
"@underpin/analytics": minor
---

Add `@underpin/analytics/referrer`: `createReferrerClassifier(dataset)` names the source of a visit and its GA4-style channel from the referrer, the campaign parameters and the ad click ids. The referrer list is yours to supply: Snowplow's referer-parser list is GPL-3.0, so the `underpin-referers <output.json>` command downloads and flattens it, and writes its licence notice beside it, for you to commit. `@underpin/analytics/referrer-dataset` exports the same steps (`downloadReferrerDataset`, `parseReferrerDataset`, `REFERER_PARSER_NOTICE`) for a script of your own. The package's own overrides for AI assistants and social platforms are included.
