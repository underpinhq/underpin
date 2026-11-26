# @underpin/email

Send rendered email through Amazon Simple Email Service (SES) v2 from a server.

## Setup

An app needs one mailer, created once and reused across sends:

```ts
import { createMailer, createSesTransport } from "@underpin/email"

export const mailer = createMailer({
  transport: createSesTransport(),
  from: "Example <mail@example.com>",
  replyTo: "support@example.com",
  dryRun: process.env.NODE_ENV !== "production",
})
```

The transport reads its region and credentials through the Amazon Web Services (AWS) SDK's default chains. In production, set these environment variables:

```bash
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

`createSesTransport` also accepts `region`, `credentials` and `configurationSet` to override the defaults. When no region resolves, each send is rejected with the `region-unavailable` code and makes no request. Without `configurationSet`, SES applies the sending identity's default configuration set, if the identity has one.

## Sending

`mailer.send` resolves when SES accepts the email and throws an `EmailSendError` when it does not:

```ts
import { EmailSendError } from "@underpin/email"

await mailer.send({
  to: "reader@example.net",
  subject: "Your sign-in link",
  html: "<p>Sign in to Example.</p>",
  text: "Sign in to Example.",
})
```

Use `send` wherever a missing email should fail the request, such as sign-in links and verification codes. Use `mailer.trySend` where a send must never throw, such as a notification batch or a scheduled job. It resolves the result instead:

```ts
import { isSent } from "@underpin/email"

const result = await mailer.trySend(notification)

if (!isSent(result)) {
  failed++
}
```

| Result | Meaning |
| --- | --- |
| `accepted` | SES accepted the request and supplied a `messageId`. Check SES events for delivery. |
| `skipped` | The mailer runs with `dryRun` and sent nothing. |
| `rejected` | The request failed locally or SES explicitly refused it. Check the error code before deciding whether to retry. |
| `ambiguous` | SES may have accepted the message. A timeout, server error, or missing message ID can leave the outcome unknown. |

`isSent` returns `true` for `accepted` and `skipped`, so flows that need the email also work locally. `send` throws for `rejected` and `ambiguous`.

Each recipient field (`to`, `cc`, `bcc`, and `replyTo`) accepts one address or an array. Supply `html`, `text`, or both. Use `tags` for SES message tags and `headers` for custom headers with string values. A message can set its own `replyTo` to override the default.

Every send makes one attempt. A resend after an ambiguous result can deliver a duplicate. Use a message tag to match the send with SES events if the response is lost.

## Errors

`EmailSendError` carries the failure's `status` (`rejected` or `ambiguous`), a transport error `code`, a `message` and, when available, the `httpStatusCode` and a recognized SES `providerCode`. Its `result` property holds the full failed result. Recipients and bodies never reach the error, so it is safe to log.

```ts
try {
  await mailer.send(email)
} catch (error) {
  if (error instanceof EmailSendError && error.status === "ambiguous") {
    // SES may have sent the email. Do not resend it automatically.
  }
  throw error
}
```

Both `send` and `trySend` log a failed send with `logger.warn`, using the same safe fields. With `dryRun` set, they log the full message with `logger.info` instead of calling the transport. The logger defaults to `console`, and any object with `info` and `warn` methods works.

## Transport

`createSesTransport().send` is the low-level primitive the mailer builds on. It takes a full message, including `from`, and resolves an `accepted`, `rejected` or `ambiguous` result without throwing. Use it directly only when an app needs no sender defaults or dry runs.

[SES SendEmail API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html)
