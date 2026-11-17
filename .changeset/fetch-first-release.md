---
"@underpin/fetch": minor
---

First release of `@underpin/fetch`: `downloadPublicUrl(url, { maxBytes })` downloads a URL on the server only when every address it reaches is public. The check runs in the connection's DNS lookup, so DNS rebinding cannot get past it. It follows at most 3 redirects, checks each one and drops credentials on a redirect to another origin, and stops a body as soon as it passes `maxBytes`. `method: "HEAD"` finds where a link lands. `assertPublicUrl`, `PrivateAddressError`, `DownloadTooLargeError` and `HttpStatusError` are exported too.
