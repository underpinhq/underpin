import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createSesTransport, type EmailMessage } from "~/index"

const ENDPOINT_ENV = "AWS_ENDPOINT_URL_SESV2"

const message: EmailMessage = {
  from: "Reports <reports@example.com>",
  to: "reader@example.net",
  subject: "Your report is ready",
  text: "Your report is ready.",
}

describe("createSesTransport", () => {
  let server: Bun.Server<undefined>
  let previousEndpoint: string | undefined
  let requests: { path: string; body: unknown; authorization: string | null }[]
  let respond: () => Response

  function createTransport(configurationSet?: string) {
    return createSesTransport({
      region: "eu-central-1",
      configurationSet,
      credentials: { accessKeyId: "test-access-key", secretAccessKey: "test-secret-key" },
    })
  }

  beforeEach(() => {
    requests = []
    respond = () => Response.json({ MessageId: "ses-message-id" })
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        requests.push({
          path: new URL(request.url).pathname,
          body: await request.json(),
          authorization: request.headers.get("authorization"),
        })
        return respond()
      },
    })
    previousEndpoint = process.env[ENDPOINT_ENV]
    process.env[ENDPOINT_ENV] = server.url.href
  })

  afterEach(async () => {
    if (previousEndpoint === undefined) {
      delete process.env[ENDPOINT_ENV]
    } else {
      process.env[ENDPOINT_ENV] = previousEndpoint
    }
    await server.stop(true)
  })

  describe("accepted sends", () => {
    it("maps the full message and returns the SES message ID", async () => {
      const result = await createTransport("transactional").send({
        ...message,
        subject: "Raport jest gotowy ✓",
        html: "<p>Twój raport jest gotowy.</p>",
        text: "Twój raport jest gotowy.",
        to: ["reader@example.net", "owner@example.net"],
        cc: "reviewer@example.net",
        bcc: ["archive@example.com"],
        replyTo: "support@example.com",
        tags: { category: "reports" },
        headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      })

      expect(result).toEqual({ status: "accepted", messageId: "ses-message-id" })
      expect(requests).toEqual([
        {
          path: "/v2/email/outbound-emails",
          authorization: expect.stringContaining("/eu-central-1/ses/aws4_request"),
          body: {
            ConfigurationSetName: "transactional",
            FromEmailAddress: "Reports <reports@example.com>",
            Destination: {
              ToAddresses: ["reader@example.net", "owner@example.net"],
              CcAddresses: ["reviewer@example.net"],
              BccAddresses: ["archive@example.com"],
            },
            ReplyToAddresses: ["support@example.com"],
            EmailTags: [{ Name: "category", Value: "reports" }],
            Content: {
              Simple: {
                Subject: { Charset: "UTF-8", Data: "Raport jest gotowy ✓" },
                Body: {
                  Html: { Charset: "UTF-8", Data: "<p>Twój raport jest gotowy.</p>" },
                  Text: { Charset: "UTF-8", Data: "Twój raport jest gotowy." },
                },
                Headers: [{ Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" }],
              },
            },
          },
        },
      ])
    })

    it.each([
      [
        { text: "Your report is ready." },
        { Text: { Charset: "UTF-8", Data: "Your report is ready." } },
      ],
      [
        { html: "<p>Your report is ready.</p>" },
        { Html: { Charset: "UTF-8", Data: "<p>Your report is ready.</p>" } },
      ],
    ] as const)("omits the unused body part for %j", async (body, expected) => {
      const { from, to, subject } = message

      expect(await createTransport().send({ from, to, subject, ...body })).toEqual({
        status: "accepted",
        messageId: "ses-message-id",
      })
      expect(requests[0]?.body).toEqual({
        FromEmailAddress: "Reports <reports@example.com>",
        Destination: { ToAddresses: ["reader@example.net"] },
        Content: {
          Simple: {
            Subject: { Charset: "UTF-8", Data: "Your report is ready" },
            Body: expected,
          },
        },
      })
    })
  })

  describe("rejected sends", () => {
    it("reports an invalid message before making a request", async () => {
      const result = await createTransport().send({ ...message, to: [] })

      expect(result).toMatchObject({ status: "rejected", error: { code: "invalid-message" } })
      expect(requests).toHaveLength(0)
    })

    it("reports missing credentials without including the provider error", async () => {
      const transport = createSesTransport({
        region: "eu-central-1",
        async credentials() {
          throw Object.assign(new Error("Private credentials file path"), {
            name: "CredentialsProviderError",
          })
        },
      })

      expect(await transport.send(message)).toEqual({
        status: "rejected",
        error: {
          code: "credentials-unavailable",
          message: "AWS credentials could not be resolved.",
        },
      })
      expect(requests).toHaveLength(0)
    })

    it("returns a safe error for a service rejection", async () => {
      respond = () =>
        Response.json(
          { message: "Unverified identity reader@example.net" },
          { status: 400, headers: { "x-amzn-errortype": "MessageRejected" } },
        )

      const result = await createTransport().send(message)

      expect(result).toEqual({
        status: "rejected",
        error: {
          code: "ses-rejected",
          message: "Amazon SES refused the email.",
          httpStatusCode: 400,
          providerCode: "MessageRejected",
        },
      })
    })

    it("strips unrecognized provider codes", async () => {
      respond = () =>
        Response.json(
          { message: "Unverified identity" },
          { status: 403, headers: { "x-amzn-errortype": "reader@example.net" } },
        )

      const result = await createTransport().send(message)

      expect(result).toEqual({
        status: "rejected",
        error: {
          code: "ses-rejected",
          message: "Amazon SES refused the email.",
          httpStatusCode: 403,
        },
      })
    })

    it("classifies throttling as a rejection without retrying", async () => {
      respond = () =>
        Response.json(
          { message: "Maximum sending rate exceeded" },
          { status: 429, headers: { "x-amzn-errortype": "TooManyRequestsException" } },
        )

      const result = await createTransport().send(message)

      expect(result).toMatchObject({
        status: "rejected",
        error: { code: "throttled", httpStatusCode: 429 },
      })
      expect(requests).toHaveLength(1)
    })
  })

  describe("ambiguous sends", () => {
    it.each([408, 500, 503])("does not retry after HTTP %i", async status => {
      respond = () => Response.json({ message: "Provider response details" }, { status })

      const result = await createTransport().send(message)

      expect(result).toEqual({
        status: "ambiguous",
        error: {
          code: "send-unconfirmed",
          message: "Amazon SES acceptance could not be confirmed.",
          httpStatusCode: status,
        },
      })
      expect(requests).toHaveLength(1)
    })

    it("treats a service timeout reported as HTTP 400 as ambiguous", async () => {
      respond = () =>
        Response.json(
          { message: "Request timed out" },
          { status: 400, headers: { "x-amzn-errortype": "RequestTimeout" } },
        )

      const result = await createTransport().send(message)

      expect(result).toMatchObject({ status: "ambiguous", error: { code: "send-unconfirmed" } })
      expect(requests).toHaveLength(1)
    })

    it("treats a dropped connection as ambiguous", async () => {
      respond = () => {
        void server.stop(true)
        return Response.json({ MessageId: "ses-message-id" })
      }

      const result = await createTransport().send(message)

      expect(result).toMatchObject({ status: "ambiguous", error: { code: "send-unconfirmed" } })
      expect(requests).toHaveLength(1)
    })

    it("treats a success response missing a message ID as ambiguous", async () => {
      respond = () => Response.json({})

      const result = await createTransport().send(message)

      expect(result).toMatchObject({ status: "ambiguous", error: { code: "missing-message-id" } })
      expect(requests).toHaveLength(1)
    })
  })
})
