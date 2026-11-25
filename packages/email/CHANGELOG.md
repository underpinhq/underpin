# @underpin/email

## 0.2.0

### Minor Changes

- Add `createMailer`, which applies a default sender and reply-to address, logs instead of sending in a dry run, and logs only safe error fields when a send fails. Add `isSent` to check whether a send was accepted or skipped in a dry run. ([46ef291](https://github.com/underpinhq/underpin/commit/46ef291907f856017db02fc8ec43b40b1f2d7817))
- Add a server-side Amazon SES transport for rendered email. Send HTML, plain text, or both, and check whether Amazon SES accepted the message, rejected it, or left the outcome uncertain. ([d0dacaf](https://github.com/underpinhq/underpin/commit/d0dacaf292c1bcef2f56f62f852070b7eb33198b))
