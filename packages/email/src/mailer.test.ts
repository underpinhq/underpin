import { beforeEach, describe, expect, it } from "bun:test"
import {
  createMailer,
  type EmailMessage,
  type EmailSendResult,
  type EmailTransport,
  isSent,
  type MailerLogger,
  type MailerOptions,
} from "~/index"

interface LogEntry {
  level: "info" | "warn"
  message: string
  details: object
}

const rejected: EmailSendResult = {
  status: "rejected",
  error: {
    code: "ses-rejected",
    message: "Amazon SES refused the email.",
    httpStatusCode: 400,
    providerCode: "MessageRejected",
  },
}

const ambiguous: EmailSendResult = {
  status: "ambiguous",
  error: { code: "send-unconfirmed", message: "Amazon SES acceptance could not be confirmed." },
}

const message = {
  to: "reader@example.net",
  subject: "Your sign-in link",
  html: "<p>Sign in to Reports.</p>",
  text: "Sign in to Reports.",
}

describe("createMailer", () => {
  let sent: EmailMessage[]
  let logs: LogEntry[]
  let result: EmailSendResult

  const transport: EmailTransport = {
    async send(email) {
      sent.push(email)
      return result
    },
  }

  const logger: MailerLogger = {
    info: (message, details) => logs.push({ level: "info", message, details }),
    warn: (message, details) => logs.push({ level: "warn", message, details }),
  }

  function createTestMailer(options: Partial<MailerOptions> = {}) {
    return createMailer({
      transport,
      from: "Reports <reports@example.com>",
      replyTo: "support@example.com",
      logger,
      ...options,
    })
  }

  beforeEach(() => {
    sent = []
    logs = []
    result = { status: "accepted", messageId: "ses-message-id" }
  })

  describe("sends", () => {
    it("applies the default sender and reply-to address", async () => {
      expect(await createTestMailer().send(message)).toEqual({
        status: "accepted",
        messageId: "ses-message-id",
      })
      expect(sent).toEqual([
        { ...message, from: "Reports <reports@example.com>", replyTo: "support@example.com" },
      ])
      expect(logs).toEqual([])
    })

    it("lets a message override the reply-to address", async () => {
      await createTestMailer().send({ ...message, replyTo: ["owner@example.net"] })

      expect(sent[0]?.replyTo).toEqual(["owner@example.net"])
    })

    it("sends without a reply-to address when neither sets one", async () => {
      await createTestMailer({ replyTo: undefined }).send(message)

      expect(sent[0]?.replyTo).toBeUndefined()
    })
  })

  describe("failed sends", () => {
    it.each([rejected, ambiguous])("returns a $status result unchanged", async failure => {
      result = failure

      expect(await createTestMailer().send(message)).toBe(failure)
      expect(sent).toHaveLength(1)
    })

    it("logs only the safe error fields", async () => {
      result = rejected
      await createTestMailer().send(message)

      expect(logs).toEqual([
        {
          level: "warn",
          message: "Email send failed",
          details: {
            status: "rejected",
            code: "ses-rejected",
            httpStatusCode: 400,
            providerCode: "MessageRejected",
          },
        },
      ])
    })
  })

  describe("dry runs", () => {
    it("logs the payload and skips the transport", async () => {
      expect(await createTestMailer({ dryRun: true }).send(message)).toEqual({ status: "skipped" })
      expect(sent).toEqual([])
      expect(logs).toEqual([
        {
          level: "info",
          message: "Email not sent (dry run)",
          details: {
            ...message,
            from: "Reports <reports@example.com>",
            replyTo: "support@example.com",
          },
        },
      ])
    })
  })
})

describe("isSent", () => {
  it.each([
    [{ status: "accepted", messageId: "ses-message-id" }, true],
    [{ status: "skipped" }, true],
    [rejected, false],
    [ambiguous, false],
  ] as const)("treats %j as sent: %p", (sendResult, expected) => {
    expect(isSent(sendResult)).toBe(expected)
  })
})
