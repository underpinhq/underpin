import { describe, expect, test } from "bun:test"
import { HttpStatusError, PrivateAddressError } from "@underpin/fetch"
import {
  directProvider,
  type FaviconProvider,
  type FetchFunction,
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

/** A fake `fetch` that records each URL and answers with the given response. */
function fakeFetch(respond: (url: string) => Response) {
  const urls: string[] = []
  async function fetchFunction(url: string): Promise<Response> {
    urls.push(url)
    return respond(url)
  }

  return { urls, fetch: fetchFunction satisfies FetchFunction }
}

function image(body: Uint8Array, contentType = "image/png") {
  return new Response(body, { headers: { "content-type": contentType } })
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
    const fake = fakeFetch(() => image(PNG))
    const favicon = await googleProvider({ fetch: fake.fetch, size: 32 }).find("example.com")

    expect(favicon).toEqual({ body: PNG, contentType: "image/png" })
    expect(fake.urls).toEqual(["https://www.google.com/s2/favicons?domain=example.com&sz=32"])
  })

  test("counts Google's 404 globe as a miss", async () => {
    const fake = fakeFetch(() => new Response(PNG, { status: 404 }))

    expect(await googleProvider({ fetch: fake.fetch }).find("unknown.example")).toBeNull()
  })

  test("rejects on a rate limit, so the miss is not cached", async () => {
    const fake = fakeFetch(() => new Response(null, { status: 429 }))

    await expect(googleProvider({ fetch: fake.fetch }).find("example.com")).rejects.toThrow(
      HttpStatusError,
    )
  })

  test("stops a body without a declared length as soon as it passes the limit", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(PNG)
        controller.enqueue(new Uint8Array(2048))
        controller.close()
      },
    })
    const fake = fakeFetch(() => new Response(stream))

    expect(
      await googleProvider({ fetch: fake.fetch, maxBytes: 1024 }).find("example.com"),
    ).toBeNull()
  })

  test("refuses a body over the size limit", async () => {
    const big = new Uint8Array(2048)
    big.set(PNG)
    const fake = fakeFetch(() => image(big))

    expect(
      await googleProvider({ fetch: fake.fetch, maxBytes: 1024 }).find("example.com"),
    ).toBeNull()
  })

  test("refuses an SVG whatever its content type says", async () => {
    const fake = fakeFetch(() => image(SVG, "image/png"))

    expect(await googleProvider({ fetch: fake.fetch }).find("example.com")).toBeNull()
  })
})

describe("logoDevProvider", () => {
  test("asks logo.dev with the key and a 404 fallback", async () => {
    const fake = fakeFetch(() => image(PNG))
    const favicon = await logoDevProvider({ token: "pk_test", fetch: fake.fetch }).find(
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
    const missing = fakeFetch(() => new Response(null, { status: 404 }))
    const broken = fakeFetch(() => new Response(null, { status: 500 }))

    expect(
      await logoDevProvider({ token: "pk", fetch: missing.fetch }).find("example.com"),
    ).toBeNull()
    await expect(
      logoDevProvider({ token: "pk", fetch: broken.fetch }).find("example.com"),
    ).rejects.toThrow()
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
