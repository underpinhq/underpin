import {
  downloadPublicUrl,
  DownloadTooLargeError,
  HttpStatusError,
  PrivateAddressError,
} from "@underpin/fetch"
import { isHostname, normalizeHostname } from "@underpin/utils/http"
import { SECOND_MS } from "@underpin/utils/time"

export interface Favicon {
  body: Uint8Array
  /** The type read from the image's own bytes, never the server's header. */
  contentType: string
}

/** A source of favicons, such as a site itself or a third-party icon service. */
export interface FaviconProvider {
  name: string
  /**
   * Finds the favicon of one host.
   *
   * Resolves to null when the host has no icon, which a caller may cache as a miss. Rejects when
   * the provider failed (an outage, a rate limit, a timeout), which says nothing about the icon.
   */
  find(hostname: string, signal?: AbortSignal): Promise<Favicon | null>
}

/** The size of the largest icon a provider accepts by default. A real favicon is a few kilobytes. */
const MAX_ICON_BYTES = 128 * 1024

const DEFAULT_TIMEOUT_MS = 4 * SECOND_MS

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
  return isHostname(host) ? host : undefined
}

/** Turns a downloaded body into a favicon, or null when it is not an image of an accepted size. */
function toFavicon(body: Uint8Array, maxBytes: number): Favicon | null {
  const contentType = findImageType(body)
  return contentType && body.byteLength <= maxBytes ? { body, contentType } : null
}

/** The options every provider takes. */
export interface ProviderOptions {
  /** The largest icon to accept, in bytes. Defaults to 128 KB. */
  maxBytes?: number
  /** The time limit in milliseconds. Defaults to 4 seconds. */
  timeout?: number
  /** Replaces `downloadPublicUrl`, such as in tests. Keep its address checks in any replacement. */
  download?: typeof downloadPublicUrl
}

/**
 * Downloads one icon through `downloadPublicUrl`, as {@link FaviconProvider.find} reports it: a
 * private address, a body that is too large and a status that says the host has no icon are
 * misses, and anything else rejects.
 */
async function downloadIcon(
  url: string,
  options: ProviderOptions,
  signal: AbortSignal | undefined,
): Promise<Favicon | null> {
  const {
    maxBytes = MAX_ICON_BYTES,
    timeout = DEFAULT_TIMEOUT_MS,
    download = downloadPublicUrl,
  } = options

  try {
    const { body } = await download(url, {
      maxBytes,
      timeout,
      signal,
      headers: { accept: "image/*" },
    })
    return toFavicon(body, maxBytes)
  } catch (error) {
    const isMiss =
      error instanceof PrivateAddressError ||
      error instanceof DownloadTooLargeError ||
      (error instanceof HttpStatusError && isMissingStatus(error.status))

    if (isMiss) return null
    throw error
  }
}

/** True for a DNS answer that the host does not exist, which is as final as a 404. */
function isUnknownHost(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOTFOUND"
}

/**
 * Fetches the site's own `/favicon.ico` through `downloadPublicUrl` from `@underpin/fetch`, so
 * every address it reaches, redirects included, must be public. The host never leaves the server
 * for a third party.
 * @param options - The size and time limits.
 * @returns The provider.
 */
export function directProvider(options: ProviderOptions = {}): FaviconProvider {
  return {
    name: "direct",
    async find(hostname, signal) {
      try {
        return await downloadIcon(`https://${hostname}/favicon.ico`, options, signal)
      } catch (error) {
        // A site's own host that does not exist has no icon. A service's host is another matter.
        if (isUnknownHost(error)) return null
        throw error
      }
    },
  }
}

export interface GoogleProviderOptions extends ProviderOptions {
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
      return downloadIcon(url, options, signal)
    },
  }
}

export interface LogoDevProviderOptions extends ProviderOptions {
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

      return downloadIcon(
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
  /** The time limit in milliseconds. Defaults to 4 seconds. */
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
