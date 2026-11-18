import { lookup as dnsLookup } from "node:dns"
import { type IncomingMessage, request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import type { LookupFunction } from "node:net"
import { formatBytes } from "@underpin/utils/files"
import { isIp, isPublicIp } from "@underpin/utils/http"

/** The most redirects a download follows by default, each checked like the first URL. */
export const MAX_REDIRECTS = 3

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

// Headers that carry credentials or name the origin. A redirect to another origin drops them, as
// a browser does, so a caller's token never reaches a server the first one points at.
const ORIGIN_HEADERS = new Set(["authorization", "cookie", "proxy-authorization", "host"])

function withoutOriginHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !ORIGIN_HEADERS.has(name.toLowerCase())),
  )
}

/** Thrown when a URL, a redirect or a resolved address points to a private network. */
export class PrivateAddressError extends Error {
  constructor() {
    super("The URL points to a private network")
    this.name = "PrivateAddressError"
  }
}

/** Thrown when a body is larger than the download's `maxBytes`. */
export class DownloadTooLargeError extends Error {
  readonly maxBytes: number

  constructor(maxBytes: number) {
    super(`The file exceeds the ${formatBytes(maxBytes)} limit`)
    this.name = "DownloadTooLargeError"
    this.maxBytes = maxBytes
  }
}

/** Thrown when a response is neither a success nor a redirect. */
export class HttpStatusError extends Error {
  readonly status: number
  /** The URL that answered, after the redirects followed so far. */
  readonly url: URL | undefined

  constructor(status: number, url?: URL) {
    super(`HTTP ${status}`)
    this.name = "HttpStatusError"
    this.status = status
    this.url = url
  }
}

/** One address a host name resolves to. */
export interface ResolvedAddress {
  address: string
  family: number
}

/** Resolves a host name to every address it has. */
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>

export interface DownloadOptions {
  /** The largest body to accept. The download stops as soon as it passes this size. */
  maxBytes: number
  /**
   * `HEAD` follows the redirects and returns the final URL with an empty body, such as to find
   * where a short link lands. Defaults to `GET`.
   */
  method?: "GET" | "HEAD"
  /** The time limit for the whole download, redirects included, in milliseconds. Defaults to 30 s. */
  timeout?: number
  /** The most redirects to follow. Defaults to {@link MAX_REDIRECTS}. */
  maxRedirects?: number
  /**
   * Request headers. `accept-encoding` is always `identity`, so the byte limit counts real bytes.
   * A redirect to another origin drops `authorization`, `cookie`, `proxy-authorization` and `host`.
   */
  headers?: Record<string, string>
  /** Aborts the download, on top of the timeout. */
  signal?: AbortSignal
}

export interface Download {
  /** The response body. */
  body: Uint8Array
  /** The response's own `content-type`, which the server may have got wrong. Empty when missing. */
  contentType: string
  /** The URL that answered, after every redirect. */
  url: URL
}

/** The checks a download runs. Tests replace them, so they never reach the network. */
export interface Guard {
  resolve: Resolver
  isAllowed: (address: string) => boolean
}

function systemResolver(hostname: string): Promise<ResolvedAddress[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true }, (error, addresses) => {
      if (error) reject(error)
      else resolve(addresses)
    })
  })
}

export const defaultGuard: Guard = { resolve: systemResolver, isAllowed: isPublicIp }

/** The URL parser keeps an IPv6 host in brackets. */
function toHost(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "")
}

/**
 * Throws unless a URL is http or https, carries no credentials and, when its host is an IP
 * address, that address is public. A host name is checked when the connection resolves it, so
 * this check alone cannot stop DNS rebinding: use {@link downloadPublicUrl} to fetch.
 * @param url - The URL to check.
 * @throws When the protocol, the credentials or the address is not allowed.
 */
export function assertPublicUrl(url: URL, isAllowed: Guard["isAllowed"] = isPublicIp): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed")
  }

  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed")
  }

  const host = toHost(url)
  if (isIp(host) && !isAllowed(host)) throw new PrivateAddressError()
}

/**
 * A DNS lookup for the connection that fails unless every address is allowed. The connection uses
 * the addresses checked here, so a DNS answer that changes after an earlier check cannot send it
 * to a private network.
 */
function createLookup(guard: Guard): LookupFunction {
  return (hostname, options, callback) => {
    guard.resolve(hostname).then(
      addresses => {
        if (!addresses.length || !addresses.every(({ address }) => guard.isAllowed(address))) {
          callback(new PrivateAddressError(), "", 4)
          return
        }

        // IPv4 first, as a server may have no route to IPv6.
        const family = options.family
        const usable = (
          family ? addresses.filter(address => address.family === family) : addresses
        ).toSorted((a, b) => a.family - b.family)

        if (options.all) {
          callback(null, usable)
          return
        }

        const [first] = usable
        if (first) {
          callback(null, first.address, first.family)
          return
        }

        // Every address is public, but none is of the family the connection asked for.
        const error = Object.assign(new Error(`${hostname} has no IPv${family} address`), {
          code: "ENOTFOUND",
        })
        callback(error, "", 4)
      },
      error => callback(error, "", 4),
    )
  }
}

/** Sends one request through the guarded lookup, without following redirects. */
function requestOnce(
  url: URL,
  method: "GET" | "HEAD",
  headers: Record<string, string>,
  guard: Guard,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const request = url.protocol === "https:" ? httpsRequest : httpRequest

  return new Promise((resolve, reject) => {
    const clientRequest = request(
      url,
      {
        method,
        lookup: createLookup(guard),
        signal,
        // No connection pool, so a socket opened for one host never serves another.
        agent: false,
        // An uncompressed body keeps the byte limit honest: nothing inflates after the count.
        headers: {
          "user-agent": "Mozilla/5.0 (compatible)",
          ...headers,
          "accept-encoding": "identity",
        },
      },
      resolve,
    )

    clientRequest.on("error", reject)
    clientRequest.end()
  })
}

async function readBody(response: IncomingMessage, maxBytes: number): Promise<Uint8Array> {
  if (Number(response.headers["content-length"]) > maxBytes) {
    response.destroy()
    throw new DownloadTooLargeError(maxBytes)
  }

  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of response as AsyncIterable<Buffer>) {
    size += chunk.length

    if (size > maxBytes) {
      response.destroy()
      throw new DownloadTooLargeError(maxBytes)
    }

    chunks.push(chunk)
  }

  return new Uint8Array(Buffer.concat(chunks))
}

/** {@link downloadPublicUrl} with its checks passed in, for tests. */
export async function download(
  url: string | URL,
  options: DownloadOptions,
  guard: Guard,
): Promise<Download> {
  const { maxBytes, method = "GET", timeout = 30_000, maxRedirects = MAX_REDIRECTS } = options
  let headers = options.headers ?? {}
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(timeout)])
    : AbortSignal.timeout(timeout)

  let current = new URL(url)

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertPublicUrl(current, guard.isAllowed)

    const response = await requestOnce(current, method, headers, guard, signal)
    const status = response.statusCode ?? 0
    const location = response.headers.location

    if (REDIRECT_STATUSES.has(status) && location) {
      response.resume()
      const next = new URL(location, current)
      if (next.origin !== current.origin) headers = withoutOriginHeaders(headers)
      current = next
      continue
    }

    if (status < 200 || status >= 300) {
      response.resume()
      throw new HttpStatusError(status, current)
    }

    const contentType = response.headers["content-type"] ?? ""

    // A HEAD response has no body, whatever its `content-length` says.
    if (method === "HEAD") {
      response.resume()
      return { body: new Uint8Array(), contentType, url: current }
    }

    return { body: await readBody(response, maxBytes), contentType, url: current }
  }

  throw new Error("Too many redirects")
}

/**
 * Downloads a URL from the server without reaching its own network: server-side request forgery
 * protection for URLs a user supplies.
 *
 * - Every address the host resolves to must be public, checked when the connection resolves it,
 *   so DNS rebinding cannot slip a private address in after the check.
 * - Redirects are followed by hand, at most {@link MAX_REDIRECTS}, and each one is checked again.
 * - The body streams against `maxBytes` and stops as soon as it passes it.
 * @param url - The URL to download.
 * @param options - The size and time limits.
 * @returns The body, its content type and the final URL.
 * @throws {PrivateAddressError} When the URL or a redirect points to a private network.
 * @throws {DownloadTooLargeError} When the body passes `maxBytes`.
 * @throws {HttpStatusError} When the response is not a success.
 * @example
 * const { body, contentType } = await downloadPublicUrl(imageUrl, { maxBytes: 5 * 1024 * 1024 })
 */
export function downloadPublicUrl(url: string | URL, options: DownloadOptions): Promise<Download> {
  return download(url, options, defaultGuard)
}
