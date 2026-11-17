import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import {
  assertPublicUrl,
  download,
  downloadPublicUrl,
  DownloadTooLargeError,
  type Guard,
  HttpStatusError,
  PrivateAddressError,
  type Resolver,
} from "./download.js"

// The test server listens on loopback. The test guard treats 127.0.0.1 as the one public
// address and every other address as private, so no test reaches a real network.
const SERVER = "127.0.0.1"
const PRIVATE = "10.0.0.1"

let server: Server
let port: number

function names(table: Record<string, string[]>): Resolver {
  return async hostname => (table[hostname] ?? []).map(address => ({ address, family: 4 }))
}

function guard(resolve: Resolver): Guard {
  return { resolve, isAllowed: address => address === SERVER }
}

const publicNames = guard(names({ "site.test": [SERVER], "private.test": [PRIVATE] }))

function url(path: string, host = "site.test") {
  return `http://${host}:${port}${path}`
}

beforeAll(async () => {
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://x").pathname
    function next(location: string) {
      response.writeHead(302, { location })
      response.end()
    }

    if (path === "/ok") {
      response.writeHead(200, { "content-type": "text/plain" })
      response.end("hello")
    } else if (path.startsWith("/hops/")) {
      const left = Number(path.slice(6))
      if (left > 0) next(`/hops/${left - 1}`)
      else response.end("done")
    } else if (path === "/to-private") {
      next(url("/ok", "private.test"))
    } else if (path === "/to-metadata") {
      next("http://169.254.169.254/latest/meta-data")
    } else if (path === "/to-self") {
      next("/ok")
    } else if (path === "/large") {
      response.writeHead(200, { "content-length": "2048" })
      response.end(Buffer.alloc(2048))
    } else if (path === "/large-chunked") {
      response.write(Buffer.alloc(600))
      response.end(Buffer.alloc(600))
    } else if (path === "/headers") {
      response.end(JSON.stringify(request.headers))
    } else {
      response.writeHead(404)
      response.end()
    }
  })

  await new Promise<void>(resolve => server.listen(0, SERVER, resolve))
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  server.close()
})

describe("assertPublicUrl", () => {
  test("refuses a private or loopback IP address", () => {
    for (const value of [
      "http://127.0.0.1/admin",
      "http://[::1]:5432/",
      "http://169.254.169.254/",
    ]) {
      expect(() => assertPublicUrl(new URL(value))).toThrow(PrivateAddressError)
    }
  })

  test("refuses a protocol other than http and https", () => {
    expect(() => assertPublicUrl(new URL("file:///etc/passwd"))).toThrow("Only http and https")
  })

  test("refuses credentials in the URL", () => {
    expect(() => assertPublicUrl(new URL("https://user:pass@example.com/"))).toThrow("credentials")
  })

  test("accepts a public address and a host name", () => {
    expect(() => assertPublicUrl(new URL("https://93.184.216.34/"))).not.toThrow()
    expect(() => assertPublicUrl(new URL("https://example.com/"))).not.toThrow()
  })
})

describe("downloadPublicUrl", () => {
  test("refuses a host name that resolves to loopback", async () => {
    await expect(downloadPublicUrl("http://localhost:5432/", { maxBytes: 1024 })).rejects.toThrow(
      PrivateAddressError,
    )
  })

  test("refuses a loopback IP address", async () => {
    await expect(
      downloadPublicUrl(`http://127.0.0.1:${port}/ok`, { maxBytes: 1024 }),
    ).rejects.toThrow(PrivateAddressError)
  })
})

describe("download", () => {
  test("returns the body, its content type and the final URL", async () => {
    const result = await download(url("/to-self"), { maxBytes: 1024 }, publicNames)

    expect(new TextDecoder().decode(result.body)).toBe("hello")
    expect(result.contentType).toBe("text/plain")
    expect(result.url.pathname).toBe("/ok")
  })

  test("refuses a host name that resolves to a private address", async () => {
    await expect(
      download(url("/ok", "private.test"), { maxBytes: 1024 }, publicNames),
    ).rejects.toThrow(PrivateAddressError)
  })

  test("refuses a host name with one private address among public ones", async () => {
    const mixed = guard(names({ "site.test": [SERVER, PRIVATE] }))

    await expect(download(url("/ok"), { maxBytes: 1024 }, mixed)).rejects.toThrow(
      PrivateAddressError,
    )
  })

  test("refuses DNS rebinding: a name that turns private after its first answer", async () => {
    let calls = 0
    const rebinding = guard(async () => {
      calls++
      return [{ address: calls === 1 ? SERVER : PRIVATE, family: 4 }]
    })

    // The redirect to the same host makes the connection resolve the name again.
    await expect(download(url("/to-self"), { maxBytes: 1024 }, rebinding)).rejects.toThrow(
      PrivateAddressError,
    )
    expect(calls).toBe(2)
  })

  test("refuses a redirect to a private host name", async () => {
    await expect(download(url("/to-private"), { maxBytes: 1024 }, publicNames)).rejects.toThrow(
      PrivateAddressError,
    )
  })

  test("refuses a redirect to a private IP address", async () => {
    await expect(download(url("/to-metadata"), { maxBytes: 1024 }, publicNames)).rejects.toThrow(
      PrivateAddressError,
    )
  })

  test("follows three redirects", async () => {
    const result = await download(url("/hops/3"), { maxBytes: 1024 }, publicNames)

    expect(new TextDecoder().decode(result.body)).toBe("done")
  })

  test("refuses a fourth redirect", async () => {
    await expect(download(url("/hops/4"), { maxBytes: 1024 }, publicNames)).rejects.toThrow(
      "Too many redirects",
    )
  })

  test("refuses a body whose declared length is over the cap", async () => {
    await expect(download(url("/large"), { maxBytes: 1024 }, publicNames)).rejects.toThrow(
      DownloadTooLargeError,
    )
  })

  test("stops a streamed body as soon as it passes the cap", async () => {
    await expect(download(url("/large-chunked"), { maxBytes: 1024 }, publicNames)).rejects.toThrow(
      DownloadTooLargeError,
    )
  })

  test("throws the status of a failed response", async () => {
    const error = await download(url("/missing"), { maxBytes: 1024 }, publicNames).catch(
      error => error,
    )

    expect(error).toBeInstanceOf(HttpStatusError)
    expect(error.status).toBe(404)
  })

  test("asks for an uncompressed body whatever the caller sends", async () => {
    const result = await download(
      url("/headers"),
      { maxBytes: 4096, headers: { "accept-encoding": "gzip", accept: "image/*" } },
      publicNames,
    )
    const headers = JSON.parse(new TextDecoder().decode(result.body))

    expect(headers["accept-encoding"]).toBe("identity")
    expect(headers.accept).toBe("image/*")
  })

  test("stops at the timeout", async () => {
    const slow = guard(() => new Promise(() => {}))

    await expect(download(url("/ok"), { maxBytes: 1024, timeout: 50 }, slow)).rejects.toThrow()
  })
})
