---
"@underpin/email": minor
---

Breaking: `mailer.send` now throws an `EmailSendError` when SES rejects the email or its acceptance is uncertain, and resolves only for an accepted send or a dry run. Drop the `isSent` check after `send`, and catch the error where the request should fail with your own message. The error carries `status`, `code`, `message`, `httpStatusCode`, `providerCode` and the failed `result` (typed `MailerFailedResult`), and never includes recipients or bodies. The new `mailer.trySend` keeps the old behaviour and resolves every result, for callers that must not throw, such as notification batches. `isSent` stays and now narrows the result type. The error details type is renamed from `EmailSendError` to `EmailErrorDetails`.

`createSesTransport` options are now optional, so `createSesTransport()` works. Without `region`, the AWS SDK reads it from `AWS_REGION` or the shared AWS config, and a send with no region is rejected with the new `region-unavailable` code before any request. Without `configurationSet`, SES applies the sending identity's default configuration set.
