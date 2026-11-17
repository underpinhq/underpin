---
"@underpin/analytics-react": minor
---

First release of `@underpin/analytics-react`: `BrowserIcon`, `OsIcon`, `DeviceIcon`, `Flag` and `Favicon` for the values `@underpin/analytics` returns. Each flag and browser logo is its own ES module loaded with `import()`, so any bundler splits them and nothing loads from a CDN. `preloadImages` renders them at once on the server.
