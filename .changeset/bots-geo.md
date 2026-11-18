---
"@underpin/analytics": minor
---

`detectBot` now passes the whole user agent to `isbot`, so a crawler token after the first 512 characters gives "crawler" again. The version checks still read only the first 512 characters.

`openGeoDatabase` now keeps the last 10,000 decoded records in memory, as `maxmind.open` does, so repeated lookups no longer decode the same record again. The new `loadGeoDatabase(path)` reads the file without blocking the event loop and returns a promise, for a job that refreshes the database while the server runs.
