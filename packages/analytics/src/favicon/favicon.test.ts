import { describe, expect, test } from "bun:test"
import { DownloadTooLargeError, HttpStatusError, PrivateAddressError } from "@underpin/fetch"
import {
  directProvider,
  type FaviconProvider,
  findFavicon,
  findImageType,
  googleProvider,
  logoDevProvider,
  parseFaviconHost,
  resolveLandingHost,
} from "./favicon.js"

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const ICO = new Uint8Array([0x00, 0x00, 0x01, 0x00, 1, 0])
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')

/** A fake `downloadPublicUrl` that records each URL and answers with a body or an error. */
function fakeDownload(respond: (url: string) => Uint8Array | Error) {
  const urls: string[] = []

  async function download(url: string | URL) {
    urls.push(String(url))
    const answer = respond(String(url))
    if (answer instanceof Error) throw answer
    return { body: answer, contentType: "image/png", url: new URL(String(url)) }
  }

  return { urls, download }
}

describe("findImageType", () => {
  test.each([
    ["PNG", PNG, "image/png"],
    ["ICO", ICO, "image/x-icon"],
    ["GIF", new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), "image/gif"],
    ["JPEG", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"],
    [
      "WebP",
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      "image/webp",
    ],
  ])("reads %s", (_, body, type) => {
    expect(findImageType(body)).toBe(type)
  })

  test("refuses an SVG and anything else", () => {
    expect(findImageType(SVG)).toBeUndefined()
    expect(findImageType(new TextEncoder().encode("<html>"))).toBeUndefined()
  })
})

describe("parseFaviconHost", () => {
  test.each([
    ["Example.com", "example.com"],
    ["https://www.example.com/page?q=1", "www.example.com"],
    ["example.com.", "example.com"],
    ["example.com:8080", "example.com"],
    ["пример.рф", "xn--e1afmkfd.xn--p1ai"],
  ])("reads %s", (value, host) => {
    expect(parseFaviconHost(value)).toBe(host)
  })

  test.each(["", "localhost", "127.0.0.1", "http://[::1]/", "not a host", "Reddit"])(
    "refuses %p",
    value => {
      expect(parseFaviconHost(value)).toBeUndefined()
    },
  )
})

describe("directProvider", () => {
  test("fetches the site's own /favicon.ico", async () => {
    const urls: string[] = []
    const provider = directProvider({
      download: async url => {
        urls.push(String(url))
        return { body: ICO, contentType: "text/html", url: new URL(String(url)) }
      },
    })

    expect(await provider.find("example.com")).toEqual({ body: ICO, contentType: "image/x-icon" })
    expect(urls).toEqual(["https://example.com/favicon.ico"])
  })

  test("refuses a host on a private address", async () => {
    // The real download: localhost resolves to loopback, which the address check refuses.
    expect(await directProvider().find("localhost")).toBeNull()
  })

  test("counts a refused redirect as a miss", async () => {
    const provider = directProvider({
      download: async () => {
        throw new PrivateAddressError()
      },
    })

    expect(await provider.find("example.com")).toBeNull()
  })

  test("refuses a body that is no raster image", async () => {
    const provider = directProvider({
      download: async url => ({
        body: SVG,
        contentType: "image/svg+xml",
        url: new URL(String(url)),
      }),
    })

    expect(await provider.find("example.com")).toBeNull()
  })

  test("counts a host that does not exist as a miss", async () => {
    const provider = directProvider({
      download: async () => {
        throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" })
      },
    })

    expect(await provider.find("gone.example")).toBeNull()
  })

  test("counts a rate limit as a failure, so the miss is not cached", async () => {
    const provider = directProvider({
      download: async () => {
        throw new HttpStatusError(429)
      },
    })

    await expect(provider.find("example.com")).rejects.toThrow(HttpStatusError)
  })

  test("counts a 404 as a miss and a 503 as a failure", async () => {
    function answering(status: number) {
      return directProvider({
        download: async () => {
          throw new HttpStatusError(status)
        },
      })
    }

    expect(await answering(404).find("example.com")).toBeNull()
    await expect(answering(503).find("example.com")).rejects.toThrow(HttpStatusError)
  })
})

describe("googleProvider", () => {
  test("asks Google's s2 service for the host", async () => {
    const fake = fakeDownload(() => PNG)
    const favicon = await googleProvider({ download: fake.download, size: 32 }).find("example.com")

    expect(favicon).toEqual({ body: PNG, contentType: "image/png" })
    expect(fake.urls).toEqual(["https://www.google.com/s2/favicons?domain=example.com&sz=32"])
  })

  test("counts Google's 404 globe as a miss", async () => {
    const fake = fakeDownload(() => new HttpStatusError(404))

    expect(await googleProvider({ download: fake.download }).find("unknown.example")).toBeNull()
  })

  test("rejects on a rate limit, so the miss is not cached", async () => {
    const fake = fakeDownload(() => new HttpStatusError(429))

    await expect(googleProvider({ download: fake.download }).find("example.com")).rejects.toThrow(
      HttpStatusError,
    )
  })

  test("refuses a body over the size limit", async () => {
    const fake = fakeDownload(() => new DownloadTooLargeError(1024))

    expect(await googleProvider({ download: fake.download }).find("example.com")).toBeNull()
  })

  test("refuses an SVG whatever its content type says", async () => {
    const fake = fakeDownload(() => SVG)

    expect(await googleProvider({ download: fake.download }).find("example.com")).toBeNull()
  })
})

describe("logoDevProvider", () => {
  test("asks logo.dev with the key and a 404 fallback", async () => {
    const fake = fakeDownload(() => PNG)
    const favicon = await logoDevProvider({ token: "pk_test", download: fake.download }).find(
      "example.com",
    )
    const url = new URL(fake.urls[0] ?? "")

    expect(favicon?.contentType).toBe("image/png")
    expect(`${url.origin}${url.pathname}`).toBe("https://img.logo.dev/example.com")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      token: "pk_test",
      format: "png",
      fallback: "404",
    })
  })

  test("counts a 404 as a miss and a 500 as a failure", async () => {
    const missing = fakeDownload(() => new HttpStatusError(404))
    const broken = fakeDownload(() => new HttpStatusError(500))

    expect(
      await logoDevProvider({ token: "pk", download: missing.download }).find("example.com"),
    ).toBeNull()
    await expect(
      logoDevProvider({ token: "pk", download: broken.download }).find("example.com"),
    ).rejects.toThrow(HttpStatusError)
  })

  test("counts a service host that does not resolve as a failure", async () => {
    const offline = fakeDownload(() =>
      Object.assign(new Error("getaddrinfo ENOTFOUND img.logo.dev"), { code: "ENOTFOUND" }),
    )

    await expect(
      logoDevProvider({ token: "pk", download: offline.download }).find("example.com"),
    ).rejects.toThrow("ENOTFOUND")
  })
})

describe("findFavicon", () => {
  const found: FaviconProvider = {
    name: "found",
    find: async () => ({ body: PNG, contentType: "image/png" }),
  }
  const missing: FaviconProvider = { name: "missing", find: async () => null }
  const failing: FaviconProvider = {
    name: "failing",
    find: async () => {
      throw new Error("down")
    },
  }

  test("returns the first icon found", async () => {
    expect(await findFavicon("example.com", [missing, failing, found])).toEqual({
      body: PNG,
      contentType: "image/png",
    })
  })

  test("returns null when every provider has no icon", async () => {
    expect(await findFavicon("example.com", [missing, missing])).toBeNull()
  })

  test("rethrows when the caller cancels, rather than reporting an outage", async () => {
    const controller = new AbortController()
    const cancelled: FaviconProvider = {
      name: "cancelled",
      find: async () => {
        controller.abort()
        throw new DOMException("Aborted", "AbortError")
      },
    }

    const error = await findFavicon("example.com", [cancelled, found], controller.signal).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(DOMException)
  })

  test("rejects when no icon was found and a provider failed", async () => {
    await expect(findFavicon("example.com", [missing, failing])).rejects.toThrow(AggregateError)
  })

  test("asks no provider for a value that names no public host", async () => {
    let asked = false
    const spy: FaviconProvider = {
      name: "spy",
      find: async () => {
        asked = true
        return null
      },
    }

    expect(await findFavicon("127.0.0.1", [spy])).toBeNull()
    expect(asked).toBe(false)
  })

  test("passes the normalized host", async () => {
    const hosts: string[] = []
    const spy: FaviconProvider = {
      name: "spy",
      find: async hostname => {
        hosts.push(hostname)
        return null
      },
    }

    await findFavicon("https://Example.com/path", [spy])
    expect(hosts).toEqual(["example.com"])
  })
})

describe("resolveLandingHost", () => {
  function landing(finalUrl: string | Error) {
    return async (url: string | URL) => {
      if (finalUrl instanceof Error) throw finalUrl
      return { body: new Uint8Array(), contentType: "", url: new URL(finalUrl || String(url)) }
    }
  }

  test("returns the host the redirects land on", async () => {
    const host = await resolveLandingHost("https://go.example.com/bunny", {
      download: landing("https://bunny.net/"),
    })

    expect(host).toBe("bunny.net")
  })

  test("keeps the landing host when it refuses HEAD", async () => {
    const refused = new HttpStatusError(405, new URL("https://bunny.net/"))

    expect(
      await resolveLandingHost("https://go.example.com/bunny", { download: landing(refused) }),
    ).toBe("bunny.net")
  })

  test("keeps the link's own host when a redirect points to a private address", async () => {
    const host = await resolveLandingHost("https://go.example.com/internal", {
      download: landing(new PrivateAddressError()),
    })

    expect(host).toBe("go.example.com")
  })

  test("refuses a private link without a request through the real download", async () => {
    expect(await resolveLandingHost("http://localhost/x")).toBeUndefined()
  })
})
