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

[SES SendEmail API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html)
