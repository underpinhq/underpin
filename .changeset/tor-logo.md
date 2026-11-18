---
"@underpin/analytics-react": patch
---

`BrowserIcon` now draws the Tor logo, from alrra/browser-logos, for a browser stored as "Tor". Tor Browser sends a plain Firefox user agent, so `parseUserAgent` never returns that name. The name comes from rows another tool stored.
