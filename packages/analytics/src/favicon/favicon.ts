import {
  downloadPublicUrl,
  DownloadTooLargeError,
  HttpStatusError,
  PrivateAddressError,
} from "@underpin/fetch"
import { normalizeHostname } from "@underpin/utils/http"

export interface Favicon {
  body: Uint8Array
  /** The type read from the image's own bytes, never the server's header. */
  contentType: string
}

/**
 * Finds the favicon of one host.
 *
 * Resolves to null when the host has no icon, which a caller may cache as a miss. Rejects when
 * the provider failed (an outage, a rate limit, a timeout), which says nothing about the icon.
 */
export interface FaviconProvider {
  name: string
  find(hostname: string, signal?: AbortSignal): Promise<Favicon | null>
}

/** A `fetch` implementation, replaceable in tests. */
export type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>

/** The size of the largest icon a provider accepts by default. A real favicon is a few kilobytes. */
const MAX_ICON_BYTES = 128 * 1024

const DEFAULT_TIMEOUT_MS = 4000

// Dot-separated labels ending in a top-level domain of letters or its punycode form (`xn--p1ai`).
const HOSTNAME = /^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:[a-z]{2,}|xn--[a-z0-9-]+)$/

// A status that says the host has no icon. A rate limit (429) or a timeout (408) says nothing
// about the icon, so it counts as a failure.
function isMissingStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}

function hasBytesAt(body: Uint8Array, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, index) => body[offset + index] === byte)
}

/**
 * Names a raster image from its first bytes, because a server's own content type can say anything.
 * An SVG can carry script, so it counts as no image at all.
 * @param body - The image bytes.
 * @returns The image's media type, or undefined when it is no raster image this accepts.
 */
export function findImageType(body: Uint8Array): string | undefined {
  if (hasBytesAt(body, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  if (hasBytesAt(body, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon"
  if (hasBytesAt(body, [0x47, 0x49, 0x46, 0x38])) return "image/gif"
  if (hasBytesAt(body, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (hasBytesAt(body, [0x52, 0x49, 0x46, 0x46]) && hasBytesAt(body, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp"
  }
}

/**
 * Reads the host name of a domain or a URL, lowercased.
 * @param domainOrUrl - "Example.com", "https://example.com/page" or "example.com:443".
 * @returns The host name, or undefined for an IP address, a single label such as "localhost",
 * or text that names no host.
 */
export function parseFaviconHost(domainOrUrl: string): string | undefined {
  const trimmed = domainOrUrl.trim()
  if (!trimmed) return

  let hostname: string

  try {
    hostname = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
      .hostname
  } catch {
    return
  }

  const host = normalizeHostname(hostname)
  return HOSTNAME.test(host) ? host : undefined
}

/** Turns a downloaded body into a favicon, or null when it is not an image of an accepted size. */
function toFavicon(body: Uint8Array, maxBytes: number): Favicon | null {
  const contentType = findImageType(body)
  return contentType && body.byteLength <= maxBytes ? { body, contentType } : null
}

/** Reads a body up to `maxBytes`, or returns undefined as soon as it passes them. */
async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array | undefined> {
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel()
    return
  }

  const reader = response.body?.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  while (reader) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    size += value.byteLength

    if (size > maxBytes) {
      await reader.cancel()
      return
    }

    chunks.push(value)
  }

  const body = new Uint8Array(size)
  let offset = 0

  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return body
}

/** Reads a third-party response with a size limit, as {@link FaviconProvider.find} reports it. */
async function readResponse(response: Response, maxBytes: number): Promise<Favicon | null> {
  if (!response.ok) {
    await response.body?.cancel()
    if (isMissingStatus(response.status)) return null
    // A rate limit or an outage says nothing about the icon, so it must not be cached as a miss.
    throw new HttpStatusError(response.status)
  }

  const body = await readCapped(response, maxBytes)
  return body ? toFavicon(body, maxBytes) : null
}

function withTimeout(signal: AbortSignal | undefined, timeout: number): AbortSignal {
  const deadline = AbortSignal.timeout(timeout)
  return signal ? AbortSignal.any([signal, deadline]) : deadline
}

/** The limits every provider takes. */
export interface ProviderLimits {
  /** The largest icon to accept. Defaults to 128 KB. */
  maxBytes?: number
  /** Defaults to 4 seconds. */
  timeout?: number
}

/** The limits of a provider that calls a third-party service. */
export interface ServiceProviderOptions extends ProviderLimits {
  /** Replaces `fetch`, such as in tests. */
  fetch?: FetchFunction
}

/** Asks a third-party icon service for one URL. */
async function fetchIcon(
  url: string,
  options: ServiceProviderOptions,
  signal: AbortSignal | undefined,
): Promise<Favicon | null> {
  const {
    maxBytes = MAX_ICON_BYTES,
    timeout = DEFAULT_TIMEOUT_MS,
    fetch: fetchFunction = fetch,
  } = options
  const response = await fetchFunction(url, { signal: withTimeout(signal, timeout) })

  return readResponse(response, maxBytes)
}

/** True for a DNS answer that the host does not exist, which is as final as a 404. */
function isUnknownHost(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOTFOUND"
}

export interface DirectProviderOptions extends ProviderLimits {
  /** Replaces `downloadPublicUrl`, such as in tests. Keep its address checks in any replacement. */
  download?: typeof downloadPublicUrl
}

/**
 * Fetches the site's own `/favicon.ico` through `downloadPublicUrl` from `@underpin/fetch`, so
 * every address it reaches, redirects included, must be public. The host never leaves the server
 * for a third party.
 * @param options - The size and time limits.
 * @returns The provider.
 */
export function directProvider(options: DirectProviderOptions = {}): FaviconProvider {
  const {
    maxBytes = MAX_ICON_BYTES,
    timeout = DEFAULT_TIMEOUT_MS,
    download = downloadPublicUrl,
  } = options

  return {
    name: "direct",
    async find(hostname, signal) {
      try {
        const { body } = await download(`https://${hostname}/favicon.ico`, {
          maxBytes,
          timeout,
          signal,
          headers: { accept: "image/*" },
        })

        return toFavicon(body, maxBytes)
      } catch (error) {
        // A host on a private network has no icon this may fetch, and a host that does not exist
        // or answers without one is a miss too. Anything else is the network's failure.
        const isMiss =
          error instanceof PrivateAddressError ||
          error instanceof DownloadTooLargeError ||
          (error instanceof HttpStatusError && isMissingStatus(error.status)) ||
          isUnknownHost(error)

        if (isMiss) return null
        throw error
      }
    },
  }
}

export interface GoogleProviderOptions extends ServiceProviderOptions {
  /** The icon size in pixels. Defaults to 64. */
  size?: number
}

/**
 * Google's favicon service (`www.google.com/s2/favicons`), which has the widest coverage. It
 * answers a host it holds no icon for with a 404 and a grey globe, which counts as a miss here.
 * Proxy the result through your own server, so a viewer's browser never contacts Google.
 * @param options - The icon size and the limits.
 * @returns The provider.
 */
export function googleProvider(options: GoogleProviderOptions = {}): FaviconProvider {
  const { size = 64 } = options

  return {
    name: "google",
    find(hostname, signal) {
      const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`
      return fetchIcon(url, options, signal)
    },
  }
}

export interface LogoDevProviderOptions extends ServiceProviderOptions {
  /** The logo.dev publishable key (`pk_...`). */
  token: string
  /** The image size in pixels. Defaults to logo.dev's own, 128. */
  size?: number
}

/**
 * logo.dev's logo service. It asks for `fallback=404`, so a host without a logo is a miss rather
 * than a generated monogram. Re-host the result, so clients never load the third-party URL with
 * your key in it.
 * @param options - The key, the size and the limits.
 * @returns The provider.
 */
export function logoDevProvider(options: LogoDevProviderOptions): FaviconProvider {
  const { token, size } = options

  return {
    name: "logo.dev",
    find(hostname, signal) {
      const query = new URLSearchParams({ token, format: "png", fallback: "404" })
      if (size) {
        query.set("size", String(size))
      }

      return fetchIcon(
        `https://img.logo.dev/${encodeURIComponent(hostname)}?${query}`,
        options,
        signal,
      )
    },
  }
}

/**
 * Asks each provider in turn for a host's favicon and returns the first icon found.
 *
 * Resolves to null only when every provider answered that the host has none, so the caller may
 * cache the miss. Rejects when no icon was found and at least one provider failed, so the next
 * request asks again.
 * @param domainOrUrl - A domain or a URL. See {@link parseFaviconHost}.
 * @param providers - The providers, in the order to ask them.
 * @param signal - Aborts every pending provider.
 * @returns The favicon, or null.
 * @example
 * const favicon = await findFavicon("example.com", [directProvider(), googleProvider()])
 */
export async function findFavicon(
  domainOrUrl: string,
  providers: readonly FaviconProvider[],
  signal?: AbortSignal,
): Promise<Favicon | null> {
  const hostname = parseFaviconHost(domainOrUrl)
  if (!hostname) return null

  const failures: unknown[] = []

  for (const provider of providers) {
    try {
      const favicon = await provider.find(hostname, signal)
      if (favicon) return favicon
    } catch (error) {
      // A cancelled call is the caller's own doing, not a provider's failure.
      if (signal?.aborted) throw error
      failures.push(error)
    }
  }

  if (failures.length) {
    throw new AggregateError(failures, `No favicon provider answered for ${hostname}`)
  }

  return null
}

export interface LandingHostOptions {
  /** Defaults to 4 seconds. */
  timeout?: number
  signal?: AbortSignal
  /** Replaces `downloadPublicUrl`, such as in tests. Keep its address checks in any replacement. */
  download?: typeof downloadPublicUrl
}

/**
 * Follows a link's redirects through `downloadPublicUrl` and returns the host it lands on, such as
 * `bunny.net` for a `go.x.com/bunny` short link. Every hop must be public. Ask a provider for the
 * landing host when a link names a shortener.
 * @param url - The link.
 * @param options - The time limit.
 * @returns The landing host, even when it answers `HEAD` with an error status, or the link's own
 * host when the redirects cannot be followed.
 */
export async function resolveLandingHost(
  url: string,
  options: LandingHostOptions = {},
): Promise<string | undefined> {
  const { timeout = DEFAULT_TIMEOUT_MS, signal, download = downloadPublicUrl } = options

  try {
    const result = await download(url, { method: "HEAD", maxBytes: 0, timeout, signal })
    return parseFaviconHost(result.url.href)
  } catch (error) {
    // Many sites refuse HEAD (405) or bots (403), yet the redirects that led there still count.
    const landing = error instanceof HttpStatusError ? error.url : undefined
    return parseFaviconHost(landing?.href ?? url)
  }
}
