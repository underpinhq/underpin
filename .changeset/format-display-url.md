---
"@underpin/utils": minor
---

Add `formatDisplayUrl`, which turns a URL into the short form a reader expects: `https://www.example.com/ai/?utm_source=x&ref=y` becomes `example.com/ai?ref=y`. It drops the protocol, a leading `www.`, every `utm_*` param, common ad click ids such as `fbclid` and `gclid`, and a trailing slash. Other query params and the hash stay. Input that is not a full URL, such as `example.com/a/`, is cleaned the same way.
