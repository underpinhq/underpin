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

Reuse the transport across sends. It uses the Amazon Web Services (AWS) SDK's default credential chain unless you pass `credentials`. Pass an address string or a list of addresses to `to`, `cc`, `bcc`, and `replyTo`. Supply `html`, `text`, or both. Pass custom message headers as a string record in `headers`.

| Result | Meaning |
| --- | --- |
| `accepted` | SES accepted the request and supplied a `messageId`. Check SES events for delivery. |
| `rejected` | The request failed locally or SES explicitly refused it. Check the error code before deciding whether to retry. |
| `ambiguous` | SES may have accepted the message. A timeout, server error, or missing message ID can leave the outcome unknown. |

The transport makes one send attempt. Handle retries, fallback, and duplicate-send prevention in your application. An automatic resend after an ambiguous result can deliver a duplicate. Use a message tag to match a send to its SES events when the response is lost. Use the returned error code, HTTP status, and recognized provider code for logging. The error omits the original AWS error and message content.

[SES SendEmail API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html)
