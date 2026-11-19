---
"@underpin/analytics": minor
---

`parseUserAgent` takes an optional third argument, `{ parser }`, for an app's own `ua-parser-js` 2.x or PRO `UAParser` class. With it, the result keeps that parser's names as they are. The mobile prefix still comes off `browserFamily`, `deviceType` still defaults to "desktop", and the Client Hints still apply. The app needs its own license for the parser: the free 2.x build is AGPL-3.0. Without a parser, nothing changes. The new `UserAgentParser`, `UserAgentParserResult` and `ParseUserAgentOptions` types describe what the parser must provide.
