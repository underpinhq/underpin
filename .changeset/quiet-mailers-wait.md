---
"@underpin/email": minor
---

Add `createMailer`, which applies a default sender and reply-to address, logs instead of sending in a dry run, and logs only safe error fields when a send fails. Add `isSent` to check whether a send was accepted or skipped in a dry run.
