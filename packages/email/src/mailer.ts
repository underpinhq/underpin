import type { EmailMessage, EmailSendResult, EmailTransport } from "./index.js"

// `Omit` does not distribute over a union, so each message shape drops `from` on its own.
type WithoutSender<Message> = Message extends unknown ? Omit<Message, "from"> : never

export type MailerMessage = WithoutSender<EmailMessage>

export type MailerSendResult = EmailSendResult | { status: "skipped" }

export interface MailerLogger {
  info(message: string, details: object): void
  warn(message: string, details: object): void
}

export interface MailerOptions {
  transport: EmailTransport
  from: string
  replyTo?: EmailMessage["replyTo"]
  dryRun?: boolean
  logger?: MailerLogger
}

export interface Mailer {
  send(message: MailerMessage): Promise<MailerSendResult>
}

export function createMailer({
  transport,
  from,
  replyTo,
  dryRun = false,
  logger = console,
}: MailerOptions): Mailer {
  async function send(message: MailerMessage): Promise<MailerSendResult> {
    const email = { ...message, from, replyTo: message.replyTo ?? replyTo }

    if (dryRun) {
      logger.info("Email not sent (dry run)", email)
      return { status: "skipped" }
    }

    const result = await transport.send(email)

    if (result.status !== "accepted") {
      // Recipients and bodies stay out of the log. These fields carry no personal data.
      const { code, httpStatusCode, providerCode } = result.error
      logger.warn("Email send failed", {
        status: result.status,
        code,
        httpStatusCode,
        providerCode,
      })
    }

    return result
  }

  return { send }
}

// A dry run counts as sent, so flows that require the email, such as sign-in links, work locally.
export function isSent(result: MailerSendResult): boolean {
  return result.status === "accepted" || result.status === "skipped"
}
