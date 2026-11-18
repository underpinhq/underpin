import { describe, expect, test } from "bun:test"
import { getClientIp } from "./client-ip.js"

// 173.245.48.1 is inside Cloudflare's published 173.245.48.0/20.
const CLOUDFLARE = "173.245.48.1"
const VISITOR = "203.0.113.7"
const SPOOFED = "198.51.100.66"

function headers(values: Record<string, string>) {
  return new Headers(values)
}

describe("getClientIp", () => {
  test("uses the socket and ignores x-forwarded-for by default", () => {
    const result = getClientIp(headers({ "x-forwarded-for": SPOOFED }), { socketAddress: VISITOR })

    expect(result).toEqual({ ip: VISITOR, source: "socket" })
  })

  test("returns undefined when no address is known", () => {
    expect(getClientIp(headers({}))).toBeUndefined()
  })

  test("unwraps an IPv4-mapped socket address", () => {
    expect(getClientIp(headers({}), { socketAddress: "::ffff:203.0.113.7" })?.ip).toBe(VISITOR)
  })

  describe("with a proxy count", () => {
    test("reads the entry the last proxy appended", () => {
      const result = getClientIp(headers({ "x-forwarded-for": `${SPOOFED}, ${VISITOR}` }), {
        trustedProxies: 1,
      })

      expect(result).toEqual({ ip: VISITOR, source: "x-forwarded-for" })
    })

    test("skips the hops of each trusted proxy", () => {
      const result = getClientIp(
        headers({ "x-forwarded-for": `${SPOOFED}, ${VISITOR}, 10.0.0.2` }),
        { trustedProxies: 2 },
      )

      expect(result?.ip).toBe(VISITOR)
    })

    test("takes the first entry when the chain is shorter than the count", () => {
      const result = getClientIp(headers({ "x-forwarded-for": VISITOR }), { trustedProxies: 3 })

      expect(result?.ip).toBe(VISITOR)
    })

    test("falls back to the socket when the entry is not an address", () => {
      const result = getClientIp(headers({ "x-forwarded-for": "unknown" }), {
        trustedProxies: 1,
        socketAddress: "10.0.0.2",
      })

      expect(result).toEqual({ ip: "10.0.0.2", source: "socket" })
    })
  })

  describe("with trusted ranges", () => {
    test("returns the rightmost entry outside the ranges", () => {
      const result = getClientIp(
        headers({ "x-forwarded-for": `${SPOOFED}, ${VISITOR}, 10.0.0.3, 10.0.0.2` }),
        { trustedProxies: ["10.0.0.0/8"], socketAddress: "10.0.0.1" },
      )

      expect(result).toEqual({ ip: VISITOR, source: "x-forwarded-for" })
    })

    test("accepts a bare address as a range", () => {
      const result = getClientIp(headers({ "x-forwarded-for": VISITOR }), {
        trustedProxies: ["192.0.2.10"],
        socketAddress: "192.0.2.10",
      })

      expect(result?.ip).toBe(VISITOR)
    })

    test("ignores the header when the socket is unknown", () => {
      const result = getClientIp(headers({ "x-forwarded-for": SPOOFED }), {
        trustedProxies: ["10.0.0.0/8"],
      })

      expect(result).toBeUndefined()
    })

    test("ignores the header when the socket is outside the ranges", () => {
      const result = getClientIp(headers({ "x-forwarded-for": SPOOFED }), {
        trustedProxies: ["10.0.0.0/8"],
        socketAddress: VISITOR,
      })

      expect(result).toEqual({ ip: VISITOR, source: "socket" })
    })
  })

  describe("with Cloudflare", () => {
    test("believes cf-connecting-ip from a Cloudflare peer", () => {
      const result = getClientIp(headers({ "cf-connecting-ip": VISITOR }), {
        cloudflare: true,
        socketAddress: CLOUDFLARE,
      })

      expect(result).toEqual({ ip: VISITOR, source: "cf-connecting-ip" })
    })

    test("believes it when a trusted proxy forwarded Cloudflare's address", () => {
      const result = getClientIp(
        headers({ "cf-connecting-ip": VISITOR, "x-forwarded-for": CLOUDFLARE }),
        { cloudflare: true, trustedProxies: 1, socketAddress: "10.0.0.2" },
      )

      expect(result?.source).toBe("cf-connecting-ip")
    })

    test("ignores cf-connecting-ip from any other peer", () => {
      const result = getClientIp(headers({ "cf-connecting-ip": SPOOFED }), {
        cloudflare: true,
        socketAddress: VISITOR,
      })

      expect(result).toEqual({ ip: VISITOR, source: "socket" })
    })

    test("keeps the peer when cf-connecting-ip is not an address", () => {
      const result = getClientIp(headers({ "cf-connecting-ip": "nope" }), {
        cloudflare: true,
        socketAddress: CLOUDFLARE,
      })

      expect(result).toEqual({ ip: CLOUDFLARE, source: "socket" })
    })
  })

  test("reads headers through a function", () => {
    const values: Record<string, string> = { "x-forwarded-for": VISITOR }
    const result = getClientIp(name => values[name], { trustedProxies: 1 })

    expect(result?.ip).toBe(VISITOR)
  })

  test("never reads x-real-ip", () => {
    const result = getClientIp(headers({ "x-real-ip": SPOOFED }), {
      trustedProxies: 1,
      socketAddress: VISITOR,
    })

    expect(result?.ip).toBe(VISITOR)
  })
})
