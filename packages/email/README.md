# @underpin/email

Send rendered email through Amazon Simple Email Service (SES) v2 from a server.

```ts
import { createSesTransport } from "@underpin/email"

const email = createSesTransport({
  region: "eu-central-1",
  configurationSet: "transactional",
})

const result = await email.send({
  from: "Example <mail@example.com>",
  to: "reader@example.net",
  replyTo: "support@example.com",
  subject: "Your report is ready",
  html: "<p>Your report is ready.</p>",
  text: "Your report is ready.",
  tags: { category: "reports" },
})
```

Reuse the transport across sends. The transport uses the Amazon Web Services (AWS) SDK's default credential chain unless you pass `credentials`.

Each recipient field (`to`, `cc`, `bcc`, and `replyTo`) accepts one address or an array. Supply `html`, `text`, or both. Use `headers` for custom headers with string values.

| Result | Meaning |
| --- | --- |
| `accepted` | SES accepted the request and supplied a `messageId`. Check SES events for delivery. |
| `rejected` | The request failed locally or SES explicitly refused it. Check the error code before deciding whether to retry. |
| `ambiguous` | SES may have accepted the message. A timeout, server error, or missing message ID can leave the outcome unknown. |

The transport makes one send attempt. A resend after an ambiguous result can deliver a duplicate. Use a message tag to match the send with SES events if the response is lost.

Errors expose a transport error code and, when available, an HTTP status and a recognized provider code. These fields are safe to log.

## Mailer

`createMailer` wraps a transport with the sender defaults an app sends with, so each send only names the recipient and content.

```ts
import { createMailer, createSesTransport, isSent } from "@underpin/email"

const mailer = createMailer({
  transport: createSesTransport({ region: "eu-central-1" }),
  from: "Example <mail@example.com>",
  replyTo: "support@example.com",
  dryRun: process.env.NODE_ENV !== "production",
})

const result = await mailer.send({
  to: "reader@example.net",
  subject: "Your sign-in link",
  html: "<p>Sign in to Example.</p>",
})

if (!isSent(result)) {
  throw new Error("We couldn't send your sign-in link.")
}
```

A message can set its own `replyTo` to override the default. The mailer makes one send attempt through the transport.

With `dryRun` set, the mailer logs the full message with `logger.info` and resolves `{ status: "skipped" }` without calling the transport. Use it outside production.

When a send is not accepted, the mailer logs the status, error code, HTTP status and provider code with `logger.warn`. Recipients and bodies stay out of that log. The logger defaults to `console`, and any object with `info` and `warn` methods works.

`isSent` returns `true` for an accepted send or a dry run. Use it in flows that must fail when the email does not go out, such as sign-in links.

[SES SendEmail API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html)
