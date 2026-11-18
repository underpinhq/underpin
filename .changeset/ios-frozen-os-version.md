---
"@underpin/analytics": patch
---

`parseUserAgent` now reads the real iOS version from Safari on iOS 26 and later. Safari freezes the OS token at `iPhone OS 18_6` or `18_7` and writes the real version after `Version/`, so an iOS 26.2 visit used to come back as `osVersion` "18.7". It now comes back as "26.2".
