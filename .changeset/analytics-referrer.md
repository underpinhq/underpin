---
"@underpin/analytics": minor
---

Add `@underpin/analytics/referrer`: `createReferrerClassifier(dataset)` names the source of a visit and its GA4-style channel from the referrer, the campaign parameters and the ad click ids. The referrer list is yours to supply: Snowplow's referer-parser list is GPL-3.0, so `downloadReferrerDataset()` fetches and flattens it for you to commit. The package's own overrides for AI assistants and social platforms are included.
