# @underpin/email

## 0.3.0

### Minor Changes

- Breaking: `mailer.send` now throws an `EmailSendError` when SES rejects the email or its acceptance is uncertain, and resolves only for an accepted send or a dry run. Drop the `isSent` check after `send`, and catch the error where the request should fail with your own message. The error carries `status`, `code`, `message`, `httpStatusCode`, `providerCode` and the failed `result` (typed `MailerFailedResult`), and never includes recipients or bodies. The new `mailer.trySend` keeps the old behaviour and resolves every result, for callers that must not throw, such as notification batches. `isSent` stays and now narrows the result type. The error details type is renamed from `EmailSendError` to `EmailErrorDetails`. ([bd2b217](https://github.com/underpinhq/underpin/commit/bd2b217dd3f21e6adfb5f08d7c2a7a83a2a4f67a))

  `createSesTransport` options are now optional, so `createSesTransport()` works. Without `region`, the AWS SDK reads it from `AWS_REGION` or the shared AWS config, and a send with no region is rejected with the new `region-unavailable` code before any request. Without `configurationSet`, SES applies the sending identity's default configuration set.

## 0.2.0

### Minor Changes

- Add `createMailer`, which applies a default sender and reply-to address, logs instead of sending in a dry run, and logs only safe error fields when a send fails. Add `isSent` to check whether a send was accepted or skipped in a dry run. ([46ef291](https://github.com/underpinhq/underpin/commit/46ef291907f856017db02fc8ec43b40b1f2d7817))
- Add a server-side Amazon SES transport for rendered email. Send HTML, plain text, or both, and check whether Amazon SES accepted the message, rejected it, or left the outcome uncertain. ([d0dacaf](https://github.com/underpinhq/underpin/commit/d0dacaf292c1bcef2f56f62f852070b7eb33198b))
