# User-agent corpus

`highseat-corpus.json` holds 248 real user agents with the browser, OS and device type Highseat stores for each. The test in `../user-agent.test.ts` expects `parseUserAgent` to return exactly those names.

## How it was built

1. Highseat's local ClickHouse gave every distinct `(browser, os, device_type)` combination in its `events` table: 381 combinations.
2. The `events` table stores no raw user agent, so the strings come from public test corpora: 71,462 distinct user agents.
3. `ua-parser-js` 2.0.10, the version Highseat and Wend run today, parsed each one. A user agent became a case when its names match a stored combination. Each combination got at most two cases, picked by a hash of the string. A stored name that no combination case covered got one more case on its own.
4. The expected names are the stored ones. `ua-parser-js` 2.x is AGPL-licensed, so it ran only outside this repository, to pick the cases, and is no dependency here.

## Sources

| `source` | Corpus | License |
| --- | --- | --- |
| `uap-core` | [ua-parser/uap-core](https://github.com/ua-parser/uap-core) test files | Apache-2.0 |
| `ua-parser-js-1` | [faisalman/ua-parser-js](https://github.com/faisalman/ua-parser-js) 1.0.41 test files | MIT |
| `matomo` | [matomo-org/device-detector](https://github.com/matomo-org/device-detector) fixtures | LGPL-3.0 |

The cases are test data only. The `files` field in `package.json` keeps this folder out of the published package.

## What the corpus does not cover

78 browser names and 12 OS names in Highseat's table never come out of `ua-parser-js` 2.0.10 for any of the 71,462 user agents, such as "Mobile App", "Yandex Browser" and "iPadOS". They are the names Plausible's exports use, stored by Highseat's import, not by its parser. `parseUserAgent` does not need to produce them.

"PlayStation" is the one more OS name without a case: 2.0.10 gives it only with the device type "console", and Highseat stores no "console" rows.
