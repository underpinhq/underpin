# Referrer fixtures

These files are test data. The `files` field in `package.json` keeps them out of the published package.

## `referers-subset.json`: GPL-3.0

593 entries of Snowplow's [referer-parser](https://github.com/snowplow-referer-parser/referer-parser) list, flattened as `parseReferrerDataset` writes it, from the copy Highseat ships in `apps/api/src/data/referers.json`. The list is based on Matomo's `SearchEngines.php` and `Socials.php`, copyright 2012 Matthieu Aubry, under the GNU General Public License v3. This file stays under that licence, whose full text is in [`LICENSE-GPL-3.0.txt`](./LICENSE-GPL-3.0.txt). It is the part of the list the cases in this folder reach, so the tests run without the network.

## `highseat-referrers.json`

506 combinations of referrer domain, `utm_source` and `utm_medium` from Highseat's local `events` table, each with the source and channel Highseat's current `classifyReferrer` returns. Only well-known platforms are kept: every domain is in the list or in the package's overrides, and every `utm_source` names one. They cover 95.1% of the table's rows. The rest are private sites and campaign names, which stay out of this public repository.
