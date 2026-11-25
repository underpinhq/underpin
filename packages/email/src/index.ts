import {
  SESv2Client,
  SESv2ServiceException,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SESv2ClientConfig,
} from "@aws-sdk/client-sesv2"

export interface SesTransportOptions {
  region: string
  configurationSet?: string
  credentials?: SESv2ClientConfig["credentials"]
}

type Addresses = string | readonly string[]

interface EmailEnvelope {
  from: string
  to: Addresses
  subject: string
  replyTo?: Addresses
  cc?: Addresses
  bcc?: Addresses
  tags?: Readonly<Record<string, string>>
  headers?: Readonly<Record<string, string>>
}

interface HtmlEmail extends EmailEnvelope {
  html: string
  text?: string
}

interface TextEmail extends EmailEnvelope {
  html?: string
  text: string
}

export type EmailMessage = HtmlEmail | TextEmail

export interface EmailSendError {
  code:
    | "invalid-message"
    | "credentials-unavailable"
    | "throttled"
    | "ses-rejected"
    | "send-unconfirmed"
    | "missing-message-id"
  message: string
  httpStatusCode?: number
  providerCode?: string
}

export type EmailSendResult =
  | { status: "accepted"; messageId: string }
  | { status: "rejected" | "ambiguous"; error: EmailSendError }

export interface SesTransport {
  send(message: EmailMessage): Promise<EmailSendResult>
}

// Keep raw provider messages and unrecognized error names out of the result.
const SES_ERROR_CODES = new Set([
  "AccessDenied",
  "AccessDeniedException",
  "AccountSuspendedException",
  "BadRequestException",
  "InvalidClientTokenId",
  "LimitExceededException",
  "MailFromDomainNotVerifiedException",
  "MessageRejected",
  "NotFoundException",
  "SendingPausedException",
  "ThrottlingException",
  "TooManyRequestsException",
])

function toAddressList(addresses: Addresses | undefined): string[] | undefined {
  if (typeof addresses === "string") {
    return [addresses]
  }

  return addresses && [...addresses]
}

function toNameValueList(
  entries: Readonly<Record<string, string>> | undefined,
): { Name: string; Value: string }[] | undefined {
  return entries && Object.entries(entries).map(([Name, Value]) => ({ Name, Value }))
}

function toContent(data: string | undefined): { Charset: string; Data: string } | undefined {
  return data === undefined ? undefined : { Charset: "UTF-8", Data: data }
}

function getSendFailure(error: unknown): EmailSendResult {
  if (error instanceof Error && error.name === "CredentialsProviderError") {
    return {
      status: "rejected",
      error: { code: "credentials-unavailable", message: "AWS credentials could not be resolved." },
    }
  }

  const serviceError = error instanceof SESv2ServiceException ? error : undefined
  const httpStatusCode = serviceError?.$metadata.httpStatusCode

  if (
    serviceError &&
    httpStatusCode !== undefined &&
    httpStatusCode >= 400 &&
    httpStatusCode < 500 &&
    httpStatusCode !== 408 &&
    serviceError.name !== "RequestTimeout" &&
    serviceError.name !== "RequestTimeoutException"
  ) {
    const throttled = httpStatusCode === 429 || serviceError.name === "ThrottlingException"

    return {
      status: "rejected",
      error: {
        code: throttled ? "throttled" : "ses-rejected",
        message: throttled ? "Amazon SES throttled the send." : "Amazon SES refused the email.",
        httpStatusCode,
        ...(SES_ERROR_CODES.has(serviceError.name) && { providerCode: serviceError.name }),
      },
    }
  }

  return {
    status: "ambiguous",
    error: {
      code: "send-unconfirmed",
      message: "Amazon SES acceptance could not be confirmed.",
      ...(httpStatusCode !== undefined && { httpStatusCode }),
    },
  }
}

export function createSesTransport({
  region,
  configurationSet,
  credentials,
}: SesTransportOptions): SesTransport {
  const client = new SESv2Client({ region, credentials, maxAttempts: 1 })

  async function send(message: EmailMessage): Promise<EmailSendResult> {
    const recipients = toAddressList(message.to)

    if (
      !message.from?.trim() ||
      !recipients?.length ||
      (message.html === undefined && message.text === undefined)
    ) {
      return {
        status: "rejected",
        error: {
          code: "invalid-message",
          message: "Provide a sender, a To recipient, and an HTML or text body.",
        },
      }
    }

    const input: SendEmailCommandInput = {
      ConfigurationSetName: configurationSet,
      FromEmailAddress: message.from,
      Destination: {
        ToAddresses: recipients,
        CcAddresses: toAddressList(message.cc),
        BccAddresses: toAddressList(message.bcc),
      },
      ReplyToAddresses: toAddressList(message.replyTo),
      EmailTags: toNameValueList(message.tags),
      Content: {
        Simple: {
          Subject: { Charset: "UTF-8", Data: message.subject },
          Body: {
            Html: toContent(message.html),
            Text: toContent(message.text),
          },
          Headers: toNameValueList(message.headers),
        },
      },
    }

    try {
      const { MessageId } = await client.send(new SendEmailCommand(input))

      if (typeof MessageId === "string" && MessageId.trim()) {
        return { status: "accepted", messageId: MessageId }
      }

      return {
        status: "ambiguous",
        error: {
          code: "missing-message-id",
          message: "Amazon SES returned a success response without a message ID.",
        },
      }
    } catch (error) {
      return getSendFailure(error)
    }
  }

  return { send }
}
