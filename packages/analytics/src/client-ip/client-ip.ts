import { isCloudflareIp, isIp, isIpInRange } from "@underpin/utils/http"

/** Which header, or the socket, the client IP came from. */
export type ClientIpSource = "cf-connecting-ip" | "x-forwarded-for" | "socket"

export interface ClientIp {
  ip: string
  source: ClientIpSource
}

/** Reads one request header by its lowercase name. */
export type HeaderReader = (name: string) => string | null | undefined

export interface ClientIpOptions {
  /**
   * The proxies between the visitor and this server, which each append the address they saw to
   * `x-forwarded-for`. Anyone can send that header, so only the entries these proxies wrote are
   * read, from the right:
   * - A number: how many proxies sit in front. The client is that many entries from the right.
   * - A list of addresses or CIDR ranges: every entry from the right inside one of them is a
   *   proxy, and the first entry outside them is the client. The header is read only when
   *   `socketAddress` is inside the ranges too.
   *
   * Defaults to 0: `x-forwarded-for` is ignored and the socket address is the client.
   */
  trustedProxies?: number | readonly string[]
  /**
   * Believe Cloudflare's `cf-connecting-ip` when the request came from one of Cloudflare's
   * published addresses. A request that skips Cloudflare could otherwise pick its own IP.
   */
  cloudflare?: boolean
  /** The address of the TCP peer, when the server can read it. */
  socketAddress?: string | null
}

/**
 * Trims an address and unwraps an IPv4-mapped IPv6 one: Node reports an IPv4 peer as
 * `::ffff:1.2.3.4`.
 */
function normalizeIp(value: string): string {
  const trimmed = value.trim()
  return trimmed.toLowerCase().startsWith("::ffff:") && trimmed.includes(".")
    ? trimmed.slice(7)
    : trimmed
}

/** The normalized address, or undefined when the value is not an IP address. */
function parseIp(value: string | null | undefined): string | undefined {
  const ip = value ? normalizeIp(value) : ""
  return isIp(ip) ? ip : undefined
}

function toHeaderReader(headers: Headers | HeaderReader): HeaderReader {
  return typeof headers === "function" ? headers : name => headers.get(name)
}

/** Checks if an address is inside one of the ranges. A bare address is a range of one. */
function isInRanges(ip: string, ranges: readonly string[]): boolean {
  return ranges.some(range =>
    range.includes("/") ? isIpInRange(ip, range) : parseIp(range) === ip,
  )
}

/** The entry `count` hops from the right, or the first entry when the chain is shorter. */
function findByCount(hops: string[], count: number): string | undefined {
  return hops[Math.max(hops.length - count, 0)]
}

/** The rightmost entry outside every trusted range, or the first entry when all are trusted. */
function findByRanges(hops: string[], ranges: readonly string[]): string | undefined {
  return hops.findLast(hop => !isInRanges(hop, ranges)) ?? hops[0]
}

/** The `x-forwarded-for` entry the trusted proxies point at, when the header holds one. */
function findForwardedIp(
  header: HeaderReader,
  trustedProxies: number | readonly string[],
  socket: string | undefined,
): string | undefined {
  const hops = (header("x-forwarded-for") ?? "").split(",").map(normalizeIp).filter(Boolean)

  if (typeof trustedProxies === "number") {
    return trustedProxies > 0 ? parseIp(findByCount(hops, trustedProxies)) : undefined
  }

  // Only a peer inside the trusted ranges may speak for the client. A socket outside them is a
  // client that reached this server directly, and an unknown socket proves nothing, so in both
  // cases the header it sent says nothing.
  if (!trustedProxies.length || !socket || !isInRanges(socket, trustedProxies)) return

  return parseIp(findByRanges(hops, trustedProxies))
}

/**
 * Finds the visitor's IP address without trusting a header the visitor could have set.
 *
 * 1. The peer: with `trustedProxies`, the `x-forwarded-for` entry the last untrusted hop wrote.
 *    Otherwise, or when the header holds no valid entry, the socket address.
 * 2. With `cloudflare`, `cf-connecting-ip` replaces the peer when the peer is a Cloudflare
 *    address.
 *
 * `x-real-ip` is never read, since a client can send that too.
 * @param headers - The request headers, or a function that reads one by its lowercase name.
 * @param options - The proxies to trust, and the socket address.
 * @returns The address and where it came from, or undefined when none is known.
 * @example
 * getClientIp(request.headers, { trustedProxies: 1, cloudflare: true })
 * getClientIp(request.headers, { trustedProxies: ["10.0.0.0/8"], socketAddress: peer })
 */
export function getClientIp(
  headers: Headers | HeaderReader,
  options: ClientIpOptions = {},
): ClientIp | undefined {
  const header = toHeaderReader(headers)
  const { trustedProxies = 0, cloudflare = false } = options
  const socket = parseIp(options.socketAddress)

  const forwarded = findForwardedIp(header, trustedProxies, socket)
  const peer = forwarded ?? socket

  if (cloudflare && peer && isCloudflareIp(peer)) {
    const visitor = parseIp(header("cf-connecting-ip"))
    if (visitor) return { ip: visitor, source: "cf-connecting-ip" }
  }

  if (forwarded) return { ip: forwarded, source: "x-forwarded-for" }
  if (socket) return { ip: socket, source: "socket" }
}
