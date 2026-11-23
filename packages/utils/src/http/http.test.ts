import { describe, expect, it } from "vitest"
import {
  addProtocol,
  CLOUDFLARE_IP_RANGES,
  formatDisplayUrl,
  getClientIp,
  getDomain,
  getParentDomains,
  isCloudflareIp,
  isExternalUrl,
  isHostname,
  isHostnameAllowed,
  isIp,
  isIpInRange,
  isPublicIp,
  isValidImageSrc,
  isValidUrl,
  isWithinDomain,
  joinUrlPaths,
  normalizeHostname,
  removeProtocol,
  removeQueryParams,
  resolveClientIp,
  setQueryParams,
  stripWildcard,
} from "./http"

describe("isValidUrl", () => {
  it("validates correct URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true)
    expect(isValidUrl("http://localhost:3000")).toBe(true)
    expect(isValidUrl("https://www.example.com/path?query=value#hash")).toBe(true)
  })

  it("validates URLs with longer TLDs", () => {
    expect(isValidUrl("https://example.storage")).toBe(true)
    expect(isValidUrl("https://mysite.directory")).toBe(true)
    expect(isValidUrl("http://www.example.storage")).toBe(true)
    expect(isValidUrl("https://api.myapp.directory/path")).toBe(true)
    expect(isValidUrl("https://subdomain.example.storage?param=value")).toBe(true)
  })

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false)
    expect(isValidUrl("example.com")).toBe(false)
    expect(isValidUrl("")).toBe(false)
    expect(isValidUrl()).toBe(false)
    expect(isValidUrl("ftp://example.com")).toBe(false)
  })

  it("handles edge cases", () => {
    expect(isValidUrl(null as never)).toBe(false)
    expect(isValidUrl(123 as never)).toBe(false)
  })
})

describe("addProtocol", () => {
  it("adds https protocol by default", () => {
    expect(addProtocol("example.com")).toBe("https://example.com")
  })

  it("adds http protocol for localhost", () => {
    expect(addProtocol("localhost:3000")).toBe("http://localhost:3000")
    expect(addProtocol("127.0.0.1:8080")).toBe("http://127.0.0.1:8080")
  })

  it("respects explicit secure parameter", () => {
    expect(addProtocol("example.com", true)).toBe("https://example.com")
    expect(addProtocol("example.com", false)).toBe("http://example.com")
    expect(addProtocol("localhost:3000", true)).toBe("https://localhost:3000")
  })

  it("doesn't modify URLs that already have protocol", () => {
    expect(addProtocol("https://example.com")).toBe("https://example.com")
    expect(addProtocol("http://example.com")).toBe("http://example.com")
    expect(addProtocol("HTTPS://example.com")).toBe("HTTPS://example.com")
  })

  it("completes a protocol-relative URL", () => {
    expect(addProtocol("//cdn.example.com/app.js")).toBe("https://cdn.example.com/app.js")
    expect(addProtocol("//localhost:3000/app.js")).toBe("http://localhost:3000/app.js")
  })

  it("handles empty input", () => {
    expect(addProtocol()).toBe("")
    expect(addProtocol("")).toBe("")
  })
})

describe("removeProtocol", () => {
  it("removes https protocol", () => {
    expect(removeProtocol("https://example.com")).toBe("example.com")
  })

  it("removes the protocol in any letter case", () => {
    expect(removeProtocol("HTTPS://example.com")).toBe("example.com")
  })

  it("removes the slashes of a protocol-relative URL", () => {
    expect(removeProtocol("//cdn.example.com/app.js")).toBe("cdn.example.com/app.js")
  })

  it("removes http protocol", () => {
    expect(removeProtocol("http://localhost:3000")).toBe("localhost:3000")
  })

  it("handles URLs without protocol", () => {
    expect(removeProtocol("example.com")).toBe("example.com")
  })

  it("handles empty input", () => {
    expect(removeProtocol()).toBe("")
    expect(removeProtocol("")).toBe("")
  })
})

describe("removeQueryParams", () => {
  it("removes single query parameter", () => {
    expect(removeQueryParams("https://example.com?param=value")).toBe("https://example.com")
  })

  it("removes multiple query parameters", () => {
    expect(removeQueryParams("https://example.com/path?param1=value1&param2=value2")).toBe(
      "https://example.com/path",
    )
  })

  it("preserves hash fragment", () => {
    expect(removeQueryParams("https://example.com/path?param=value#fragment")).toBe(
      "https://example.com/path#fragment",
    )
  })

  it("handles URLs without query params", () => {
    expect(removeQueryParams("https://example.com/path")).toBe("https://example.com/path")
  })

  it("handles invalid URLs with fallback", () => {
    expect(removeQueryParams("invalid-url?param=value")).toBe("invalid-url")
  })

  it("handles empty input", () => {
    expect(removeQueryParams()).toBe("")
  })
})

describe("formatDisplayUrl", () => {
  it("removes the protocol", () => {
    expect(formatDisplayUrl("https://example.com/a")).toBe("example.com/a")
    expect(formatDisplayUrl("http://example.com/a")).toBe("example.com/a")
    expect(formatDisplayUrl("HTTPS://example.com/a")).toBe("example.com/a")
    expect(formatDisplayUrl("//example.com/a")).toBe("example.com/a")
  })

  it("removes a leading www", () => {
    expect(formatDisplayUrl("https://www.example.com/a")).toBe("example.com/a")
    expect(formatDisplayUrl("https://WWW.example.com")).toBe("example.com")
    expect(formatDisplayUrl("https://app.www.example.com")).toBe("app.www.example.com")
  })

  it("removes every utm param", () => {
    expect(
      formatDisplayUrl("https://brightdata.com/ai?utm_source=x&utm_medium=y&utm_campaign=z"),
    ).toBe("brightdata.com/ai")
    expect(formatDisplayUrl("https://example.com?UTM_Source=x&utm_whatever=y")).toBe("example.com")
  })

  it("removes ad click ids", () => {
    const ids = [
      "fbclid",
      "gclid",
      "gbraid",
      "wbraid",
      "msclkid",
      "dclid",
      "twclid",
      "ttclid",
      "li_fat_id",
      "igshid",
      "yclid",
      "mc_cid",
      "mc_eid",
      "_hsenc",
      "_hsmi",
    ]

    for (const id of ids) {
      expect(formatDisplayUrl(`https://example.com/a?${id}=123`)).toBe("example.com/a")
    }
  })

  it("keeps other query params in their order", () => {
    expect(formatDisplayUrl("https://example.com/a?ref=x&utm_source=y&page=2")).toBe(
      "example.com/a?ref=x&page=2",
    )
    expect(formatDisplayUrl("https://example.com/a?q=a%20b&flag")).toBe(
      "example.com/a?q=a%20b&flag",
    )
  })

  it("removes the question mark when no params are left", () => {
    expect(formatDisplayUrl("https://example.com/a?")).toBe("example.com/a")
    expect(formatDisplayUrl("https://example.com/a?gclid=1#top")).toBe("example.com/a#top")
  })

  it("removes a trailing slash", () => {
    expect(formatDisplayUrl("https://example.com/")).toBe("example.com")
    expect(formatDisplayUrl("https://example.com/a/")).toBe("example.com/a")
    expect(formatDisplayUrl("https://example.com/a/?utm_source=x")).toBe("example.com/a")
    expect(formatDisplayUrl("https://example.com/?ref=x")).toBe("example.com?ref=x")
  })

  it("keeps the hash", () => {
    expect(formatDisplayUrl("https://www.example.com/a/?utm_source=x&ref=y#top")).toBe(
      "example.com/a?ref=y#top",
    )
    expect(formatDisplayUrl("https://example.com/#/route?x=1")).toBe("example.com#/route?x=1")
  })

  it("cleans input that is not a full URL", () => {
    expect(formatDisplayUrl("example.com/a/")).toBe("example.com/a")
    expect(formatDisplayUrl("www.example.com/a?utm_source=x&ref=y")).toBe("example.com/a?ref=y")
    expect(formatDisplayUrl("  https://example.com/a  ")).toBe("example.com/a")
    expect(formatDisplayUrl("not a url")).toBe("not a url")
  })

  it("handles empty input", () => {
    expect(formatDisplayUrl()).toBe("")
    expect(formatDisplayUrl("")).toBe("")
  })
})

describe("getDomain", () => {
  it("extracts domain from valid URLs", () => {
    expect(getDomain("https://example.com")).toBe("example.com")
    expect(getDomain("https://www.example.com")).toBe("example.com")
  })

  it("handles subdomains", () => {
    expect(getDomain("https://api.example.com")).toBe("api.example.com")
    expect(getDomain("https://www.api.example.com")).toBe("api.example.com")
  })

  it("returns original for invalid URLs", () => {
    expect(getDomain("not-a-url")).toBe("not-a-url")
  })
})

describe("isExternalUrl", () => {
  it("identifies external URLs", () => {
    expect(isExternalUrl("https://example.com")).toBe(true)
    expect(isExternalUrl("http://example.com")).toBe(true)
    expect(isExternalUrl("HTTPS://example.com")).toBe(true)
    expect(isExternalUrl("//cdn.example.com/app.js")).toBe(true)
  })

  it("identifies non-external URLs", () => {
    expect(isExternalUrl("example.com")).toBe(false)
    expect(isExternalUrl("/path")).toBe(false)
    expect(isExternalUrl("")).toBe(false)
    expect(isExternalUrl()).toBe(false)
  })
})

describe("joinUrlPaths", () => {
  it("joins paths correctly", () => {
    expect(joinUrlPaths("https://example.com", "api", "users")).toBe(
      "https://example.com/api/users",
    )
    expect(joinUrlPaths("https://example.com/", "/api/", "/users/")).toBe(
      "https://example.com/api/users",
    )
  })

  it("removes every trailing slash from the base", () => {
    expect(joinUrlPaths("https://example.com//", "sitemap.xml")).toBe(
      "https://example.com/sitemap.xml",
    )
    expect(joinUrlPaths("https://example.com/v1///", "/users")).toBe("https://example.com/v1/users")
  })

  it("handles empty paths", () => {
    expect(joinUrlPaths("https://example.com", "", "users")).toBe("https://example.com/users")
  })

  it("handles single path", () => {
    expect(joinUrlPaths("https://example.com")).toBe("https://example.com")
  })

  it("handles empty base", () => {
    expect(joinUrlPaths("")).toBe("")
  })
})

describe("setQueryParams", () => {
  it("keeps the slash at the end of a path", () => {
    expect(setQueryParams("https://example.com/docs/?page=1", { page: 2 })).toBe(
      "https://example.com/docs/?page=2",
    )
  })

  it("drops the slash before the query on the root path", () => {
    expect(setQueryParams("https://example.com/", { page: 2 })).toBe("https://example.com?page=2")
  })

  it("adds query parameters", () => {
    const result = setQueryParams("https://example.com", {
      name: "john",
      age: 30,
    })
    expect(result).toBe("https://example.com?name=john&age=30")
  })

  it("updates existing parameters", () => {
    const result = setQueryParams("https://example.com?name=jane", {
      name: "john",
      age: 30,
    })
    expect(result).toBe("https://example.com?name=john&age=30")
  })

  it("handles boolean values", () => {
    const result = setQueryParams("https://example.com", { active: true })
    expect(result).toBe("https://example.com?active=true")
  })

  it("handles invalid URLs", () => {
    expect(setQueryParams("not-a-url", { param: "value" })).toBe("not-a-url")
  })
})

describe("isValidImageSrc", () => {
  it("validates absolute URLs", () => {
    expect(isValidImageSrc("https://example.com/image.png")).toBe(true)
    expect(isValidImageSrc("http://localhost/img.jpg")).toBe(true)
    expect(isValidImageSrc("https://cdn.example.com/photos/pic.webp")).toBe(true)
  })

  it("validates relative paths", () => {
    expect(isValidImageSrc("/images/photo.png")).toBe(true)
    expect(isValidImageSrc("/img.jpg")).toBe(true)
    expect(isValidImageSrc("/assets/icons/logo.svg")).toBe(true)
  })

  it("validates data URIs", () => {
    expect(isValidImageSrc("data:image/png;base64,iVBOR")).toBe(true)
  })

  it("rejects falsy and invalid inputs", () => {
    expect(isValidImageSrc(null)).toBe(false)
    expect(isValidImageSrc(undefined)).toBe(false)
    expect(isValidImageSrc("")).toBe(false)
    expect(isValidImageSrc("not-a-url")).toBe(false)
  })

  it("rejects unsafe protocols", () => {
    expect(isValidImageSrc("javascript:alert(1)")).toBe(false)
    expect(isValidImageSrc("mailto:test@example.com")).toBe(false)
    expect(isValidImageSrc("tel:+123456789")).toBe(false)
  })

  it("handles edge cases", () => {
    expect(isValidImageSrc("/")).toBe(false)
    expect(isValidImageSrc("/ space")).toBe(false)
  })
})

describe("isHostname", () => {
  it("accepts a hostname with a top-level domain", () => {
    expect(isHostname("example.com")).toBe(true)
    expect(isHostname("app.9tools.io")).toBe(true)
  })

  it("accepts a punycode top-level domain", () => {
    expect(isHostname("xn--e1afmkfd.xn--p1ai")).toBe(true)
    expect(isHostname("example.xn--")).toBe(false)
  })

  it("rejects names, URLs and leading hyphens", () => {
    expect(isHostname("Reddit")).toBe(false)
    expect(isHostname("https://example.com")).toBe(false)
    expect(isHostname("-example.com")).toBe(false)
  })
})

describe("normalizeHostname", () => {
  it("trims, lowercases and drops the trailing dot", () => {
    expect(normalizeHostname(" Example.COM. ")).toBe("example.com")
  })
})

describe("stripWildcard", () => {
  it("removes only a leading wildcard label", () => {
    expect(stripWildcard("*.example.com")).toBe("example.com")
    expect(stripWildcard("example.com")).toBe("example.com")
  })
})

describe("isWithinDomain", () => {
  it("matches the domain and its subdomains only", () => {
    for (const host of ["example.com", "www.example.com", "a.b.example.com", "Example.COM."]) {
      expect(isWithinDomain(host, "example.com")).toBe(true)
    }

    for (const host of ["example.de", "notexample.com", "example.com.evil.io", ""]) {
      expect(isWithinDomain(host, "example.com")).toBe(false)
    }
  })

  it("treats a wildcard domain like the bare one", () => {
    expect(isWithinDomain("app.example.com", "*.example.com")).toBe(true)
    expect(isWithinDomain("example.com", "*.example.com")).toBe(true)
  })
})

describe("isIp", () => {
  it("accepts IPv4 addresses", () => {
    expect(isIp("192.0.2.1")).toBe(true)
    expect(isIp("0.0.0.0")).toBe(true)
    expect(isIp("255.255.255.255")).toBe(true)
  })

  it("accepts IPv6 addresses, with or without compression", () => {
    expect(isIp("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(true)
    expect(isIp("2001:db8::1")).toBe(true)
    expect(isIp("2606:4700::")).toBe(true)
    expect(isIp("::1")).toBe(true)
    expect(isIp("::")).toBe(true)
    expect(isIp("FE80::ABCD")).toBe(true)
  })

  it("accepts IPv4-mapped IPv6 addresses", () => {
    expect(isIp("::ffff:192.0.2.1")).toBe(true)
    expect(isIp("::FFFF:192.0.2.1")).toBe(true)
    expect(isIp("::ffff:c000:201")).toBe(true)
  })

  it("rejects malformed IPv4", () => {
    expect(isIp("256.0.0.1")).toBe(false)
    expect(isIp("192.0.2")).toBe(false)
    expect(isIp("192.0.2.1.5")).toBe(false)
    expect(isIp("010.0.0.1")).toBe(false)
    expect(isIp("192.0.2.-1")).toBe(false)
    expect(isIp("192.0.2.1 ")).toBe(false)
  })

  it("rejects malformed IPv6", () => {
    expect(isIp("2001:db8::1::1")).toBe(false)
    expect(isIp(":::")).toBe(false)
    expect(isIp(":1")).toBe(false)
    expect(isIp("1:")).toBe(false)
    expect(isIp("1:2:3:4:5:6:7")).toBe(false)
    expect(isIp("1:2:3:4:5:6:7:8:9")).toBe(false)
    expect(isIp("1:2:3:4::5:6:7:8")).toBe(false)
    expect(isIp("2001:db8::12345")).toBe(false)
    expect(isIp("2001:db8::g")).toBe(false)
    expect(isIp("fe80::1%eth0")).toBe(false)
    expect(isIp("::ffff:256.0.0.1")).toBe(false)
    expect(isIp("::192.0.2.1:1")).toBe(false)
  })

  it("rejects values that are not addresses", () => {
    expect(isIp("")).toBe(false)
    expect(isIp("unknown")).toBe(false)
    expect(isIp("example.com")).toBe(false)
    expect(isIp("192.0.2.1:8080")).toBe(false)
  })
})

describe("isIpInRange", () => {
  it("matches IPv4 addresses inside the range", () => {
    expect(isIpInRange("192.0.2.1", "192.0.2.0/24")).toBe(true)
    expect(isIpInRange("162.159.255.255", "162.158.0.0/15")).toBe(true)
    expect(isIpInRange("10.1.2.3", "0.0.0.0/0")).toBe(true)
    expect(isIpInRange("192.0.2.1", "192.0.2.1/32")).toBe(true)
  })

  it("rejects IPv4 addresses outside the range", () => {
    expect(isIpInRange("192.0.3.1", "192.0.2.0/24")).toBe(false)
    expect(isIpInRange("162.160.0.0", "162.158.0.0/15")).toBe(false)
    expect(isIpInRange("192.0.2.2", "192.0.2.1/32")).toBe(false)
  })

  it("matches IPv6 addresses inside the range", () => {
    expect(isIpInRange("2001:db8::1", "2001:db8::/32")).toBe(true)
    expect(isIpInRange("2a06:98c7:ffff::1", "2a06:98c0::/29")).toBe(true)
    expect(isIpInRange("2001:db8::1", "2001:db8::1/128")).toBe(true)
  })

  it("rejects IPv6 addresses outside the range", () => {
    expect(isIpInRange("2001:db9::1", "2001:db8::/32")).toBe(false)
    expect(isIpInRange("2a06:98c8::1", "2a06:98c0::/29")).toBe(false)
  })

  it("matches IPv4-mapped IPv6 addresses against IPv4 ranges", () => {
    expect(isIpInRange("::ffff:192.0.2.1", "192.0.2.0/24")).toBe(true)
    expect(isIpInRange("::ffff:c000:201", "192.0.2.0/24")).toBe(true)
    expect(isIpInRange("192.0.2.1", "::ffff:192.0.2.0/120")).toBe(true)
    expect(isIpInRange("::ffff:192.0.3.1", "192.0.2.0/24")).toBe(false)
  })

  it("never matches IPv4 against an IPv6 range outside the mapped block", () => {
    expect(isIpInRange("192.0.2.1", "2001:db8::/32")).toBe(false)
    expect(isIpInRange("2001:db8::1", "192.0.2.0/24")).toBe(false)
  })

  it("rejects malformed input", () => {
    expect(isIpInRange("192.0.2.1", "192.0.2.0")).toBe(false)
    expect(isIpInRange("192.0.2.1", "192.0.2.0/33")).toBe(false)
    expect(isIpInRange("2001:db8::1", "2001:db8::/129")).toBe(false)
    expect(isIpInRange("192.0.2.1", "192.0.2.0/-1")).toBe(false)
    expect(isIpInRange("192.0.2.1", "192.0.2.0/24/8")).toBe(false)
    expect(isIpInRange("192.0.2.1", "not-a-range/24")).toBe(false)
    expect(isIpInRange("not-an-ip", "192.0.2.0/24")).toBe(false)
    expect(isIpInRange("", "0.0.0.0/0")).toBe(false)
  })
})

describe("isCloudflareIp", () => {
  it("parses every published range", () => {
    for (const range of CLOUDFLARE_IP_RANGES) {
      expect(isIpInRange(range.split("/")[0]!, range)).toBe(true)
    }
  })

  it("matches Cloudflare IPv4 and IPv6 addresses", () => {
    expect(isCloudflareIp("173.245.48.1")).toBe(true)
    expect(isCloudflareIp("104.23.255.255")).toBe(true)
    expect(isCloudflareIp("2606:4700::6810:84e5")).toBe(true)
    expect(isCloudflareIp("2c0f:f248:ffff::1")).toBe(true)
  })

  it("matches IPv4-mapped Cloudflare addresses", () => {
    expect(isCloudflareIp("::ffff:162.158.1.1")).toBe(true)
  })

  it("rejects other addresses", () => {
    expect(isCloudflareIp("192.0.2.1")).toBe(false)
    expect(isCloudflareIp("104.15.255.255")).toBe(false)
    expect(isCloudflareIp("2606:4701::1")).toBe(false)
    expect(isCloudflareIp("::ffff:192.0.2.1")).toBe(false)
  })

  it("rejects malformed input", () => {
    expect(isCloudflareIp("")).toBe(false)
    expect(isCloudflareIp("cloudflare")).toBe(false)
    expect(isCloudflareIp("173.245.48.256")).toBe(false)
  })
})

describe("isPublicIp", () => {
  it("accepts public IPv4 and IPv6 addresses", () => {
    expect(isPublicIp("93.184.216.34")).toBe(true)
    expect(isPublicIp("1.1.1.1")).toBe(true)
    expect(isPublicIp("8.8.8.8")).toBe(true)
    expect(isPublicIp("2606:4700::1111")).toBe(true)
    expect(isPublicIp("2a00:1450:4001:80b::200e")).toBe(true)
  })

  it("accepts public IPv4-mapped IPv6 addresses", () => {
    expect(isPublicIp("::ffff:1.1.1.1")).toBe(true)
    expect(isPublicIp("::ffff:101:101")).toBe(true)
  })

  // The first and last address of every blocked range.
  const blocked: [range: string, first: string, last: string][] = [
    ["0.0.0.0/8", "0.0.0.0", "0.255.255.255"],
    ["10.0.0.0/8", "10.0.0.0", "10.255.255.255"],
    ["100.64.0.0/10", "100.64.0.0", "100.127.255.255"],
    ["127.0.0.0/8", "127.0.0.0", "127.255.255.255"],
    ["169.254.0.0/16", "169.254.0.0", "169.254.255.255"],
    ["172.16.0.0/12", "172.16.0.0", "172.31.255.255"],
    ["192.0.0.0/24", "192.0.0.0", "192.0.0.255"],
    ["192.0.2.0/24", "192.0.2.0", "192.0.2.255"],
    ["192.168.0.0/16", "192.168.0.0", "192.168.255.255"],
    ["198.18.0.0/15", "198.18.0.0", "198.19.255.255"],
    ["198.51.100.0/24", "198.51.100.0", "198.51.100.255"],
    ["203.0.113.0/24", "203.0.113.0", "203.0.113.255"],
    ["224.0.0.0/4", "224.0.0.0", "239.255.255.255"],
    ["240.0.0.0/4", "240.0.0.0", "255.255.255.255"],
    ["::/96", "::", "::ffff:ffff"],
    ["::ffff:0:0:0/96", "::ffff:0:0:0", "::ffff:0:ffff:ffff"],
    ["64:ff9b::/96", "64:ff9b::", "64:ff9b::ffff:ffff"],
    ["64:ff9b:1::/48", "64:ff9b:1::", "64:ff9b:1:ffff:ffff:ffff:ffff:ffff"],
    ["100::/64", "100::", "100::ffff:ffff:ffff:ffff"],
    ["2001::/23", "2001::", "2001:1ff:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["2001:db8::/32", "2001:db8::", "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["2002::/16", "2002::", "2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["fc00::/7", "fc00::", "fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["fe80::/10", "fe80::", "febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["fec0::/10", "fec0::", "feff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["ff00::/8", "ff00::", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
  ]

  it.each(blocked)("rejects every address in %s", (_range, first, last) => {
    expect(isPublicIp(first)).toBe(false)
    expect(isPublicIp(last)).toBe(false)
  })

  it("accepts addresses just outside the blocked ranges", () => {
    expect(isPublicIp("1.0.0.0")).toBe(true)
    expect(isPublicIp("9.255.255.255")).toBe(true)
    expect(isPublicIp("11.0.0.0")).toBe(true)
    expect(isPublicIp("100.63.255.255")).toBe(true)
    expect(isPublicIp("100.128.0.0")).toBe(true)
    expect(isPublicIp("172.15.255.255")).toBe(true)
    expect(isPublicIp("172.32.0.0")).toBe(true)
    expect(isPublicIp("192.0.1.255")).toBe(true)
    expect(isPublicIp("192.0.3.0")).toBe(true)
    expect(isPublicIp("198.17.255.255")).toBe(true)
    expect(isPublicIp("198.20.0.0")).toBe(true)
    expect(isPublicIp("223.255.255.255")).toBe(true)
    expect(isPublicIp("::1:0:0")).toBe(true)
    expect(isPublicIp("64:ff9b::1:0:0")).toBe(true)
    expect(isPublicIp("64:ff9b:2::")).toBe(true)
    expect(isPublicIp("2001:200::")).toBe(true)
    expect(isPublicIp("2001:db9::")).toBe(true)
    expect(isPublicIp("2003::")).toBe(true)
    expect(isPublicIp("fbff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true)
    expect(isPublicIp("100:0:0:1::")).toBe(true)
  })

  it("rejects common SSRF targets", () => {
    expect(isPublicIp("127.0.0.1")).toBe(false)
    expect(isPublicIp("169.254.169.254")).toBe(false)
    expect(isPublicIp("::1")).toBe(false)
    expect(isPublicIp("fd00:ec2::254")).toBe(false)
  })

  it("rejects blocked IPv4 in IPv4-mapped IPv6, dotted and hex", () => {
    expect(isPublicIp("::ffff:127.0.0.1")).toBe(false)
    expect(isPublicIp("::ffff:7f00:1")).toBe(false)
    expect(isPublicIp("::ffff:10.0.0.1")).toBe(false)
    expect(isPublicIp("::ffff:a00:1")).toBe(false)
    expect(isPublicIp("::ffff:169.254.169.254")).toBe(false)
    expect(isPublicIp("::ffff:a9fe:a9fe")).toBe(false)
    expect(isPublicIp("0:0:0:0:0:ffff:192.168.0.1")).toBe(false)
  })

  it("rejects IPv6 forms that embed a private IPv4 address", () => {
    expect(isPublicIp("::7f00:1")).toBe(false)
    expect(isPublicIp("::127.0.0.1")).toBe(false)
    expect(isPublicIp("::ffff:0:7f00:1")).toBe(false)
    expect(isPublicIp("64:ff9b::7f00:1")).toBe(false)
    expect(isPublicIp("64:ff9b::127.0.0.1")).toBe(false)
    expect(isPublicIp("64:ff9b:1::a00:1")).toBe(false)
    expect(isPublicIp("2001:0:4136:e378:8000:63bf:3fff:fdd2")).toBe(false)
    expect(isPublicIp("2002:7f00:1::")).toBe(false)
    expect(isPublicIp("2002:a9fe:a9fe::1")).toBe(false)
  })

  it("reads uppercase hex the same as lowercase", () => {
    expect(isPublicIp("::FFFF:7F00:1")).toBe(false)
    expect(isPublicIp("::FFFF:A9FE:A9FE")).toBe(false)
    expect(isPublicIp("FE80::1")).toBe(false)
    expect(isPublicIp("FD00::1")).toBe(false)
    expect(isPublicIp("FF02::1")).toBe(false)
    expect(isPublicIp("2606:4700::1111".toUpperCase())).toBe(true)
  })

  it("rejects IPv6 zone IDs", () => {
    expect(isPublicIp("fe80::1%en0")).toBe(false)
    expect(isPublicIp("fe80::1%eth0")).toBe(false)
    expect(isPublicIp("2606:4700::1111%en0")).toBe(false)
  })

  it("rejects short and octal IPv4 forms", () => {
    expect(isPublicIp("127.1")).toBe(false)
    expect(isPublicIp("0127.0.0.1")).toBe(false)
    expect(isPublicIp("010.0.0.1")).toBe(false)
    expect(isPublicIp("0x7f.0.0.1")).toBe(false)
    expect(isPublicIp("2130706433")).toBe(false)
    expect(isPublicIp("1.1.1")).toBe(false)
  })

  it("rejects malformed input", () => {
    expect(isPublicIp("")).toBe(false)
    expect(isPublicIp(" 1.1.1.1")).toBe(false)
    expect(isPublicIp("1.1.1.1 ")).toBe(false)
    expect(isPublicIp("256.1.1.1")).toBe(false)
    expect(isPublicIp("1.1.1.1:80")).toBe(false)
    expect(isPublicIp("[2606:4700::1111]")).toBe(false)
    expect(isPublicIp("2606:4700::1111::1")).toBe(false)
    expect(isPublicIp("2606:4700::g")).toBe(false)
    expect(isPublicIp("1.1.1.1/32")).toBe(false)
    expect(isPublicIp("example.com")).toBe(false)
    expect(isPublicIp("localhost")).toBe(false)
  })
})

describe("getClientIp", () => {
  const cloudflarePeer = "172.68.10.20"

  it("returns the last x-forwarded-for entry, which the proxy appended", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" })
    expect(getClientIp(headers)).toBe("203.0.113.9")
  })

  it("ignores a spoofed first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1,203.0.113.9" })
    expect(getClientIp(headers)).toBe("203.0.113.9")
  })

  it("trims and accepts an IPv6 peer", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.7,  2001:db8::1 " })
    expect(getClientIp(headers)).toBe("2001:db8::1")
  })

  it("returns cf-connecting-ip when the peer is Cloudflare", () => {
    const headers = new Headers({
      "x-forwarded-for": `198.51.100.7, ${cloudflarePeer}`,
      "cf-connecting-ip": " 198.51.100.7 ",
    })
    expect(getClientIp(headers, { trust: "cloudflare" })).toBe("198.51.100.7")
  })

  it("returns cf-connecting-ip when the peer is an IPv4-mapped Cloudflare address", () => {
    const headers = new Headers({
      "x-forwarded-for": `::ffff:${cloudflarePeer}`,
      "cf-connecting-ip": "2001:db8::7",
    })
    expect(getClientIp(headers, { trust: "cloudflare" })).toBe("2001:db8::7")
  })

  it("ignores cf-connecting-ip without the cloudflare option", () => {
    const headers = new Headers({
      "x-forwarded-for": cloudflarePeer,
      "cf-connecting-ip": "198.51.100.7",
    })
    expect(getClientIp(headers)).toBe(cloudflarePeer)
  })

  it("ignores a spoofed cf-connecting-ip from a peer outside Cloudflare", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.9",
      "cf-connecting-ip": "198.51.100.7",
    })
    expect(getClientIp(headers, { trust: "cloudflare" })).toBe("203.0.113.9")
  })

  it("ignores a cf-connecting-ip that is not an IP address", () => {
    const headers = new Headers({
      "x-forwarded-for": cloudflarePeer,
      "cf-connecting-ip": "<script>",
    })
    expect(getClientIp(headers, { trust: "cloudflare" })).toBe(cloudflarePeer)
  })

  it("falls back to x-real-ip without x-forwarded-for", () => {
    const headers = new Headers({ "x-real-ip": " 203.0.113.9 " })
    expect(getClientIp(headers)).toBe("203.0.113.9")
  })

  it("falls back to x-real-ip when the last x-forwarded-for entry is not an IP address", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.7, unknown",
      "x-real-ip": "203.0.113.9",
    })
    expect(getClientIp(headers)).toBe("203.0.113.9")
  })

  it("returns undefined when no header holds a valid IP address", () => {
    expect(getClientIp(new Headers())).toBeUndefined()
    expect(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.7," }))).toBeUndefined()
    expect(getClientIp(new Headers({ "x-real-ip": "localhost" }))).toBeUndefined()
    expect(
      getClientIp(new Headers({ "cf-connecting-ip": "198.51.100.7" }), { trust: "cloudflare" }),
    ).toBeUndefined()
  })
})

// 173.245.48.1 is inside Cloudflare's published 173.245.48.0/20.
const CLOUDFLARE_PEER = "173.245.48.1"
const VISITOR = "203.0.113.7"
const SPOOFED = "198.51.100.66"

function headers(values: Record<string, string>): Headers {
  return new Headers(values)
}

describe("resolveClientIp with trusted proxies or a socket", () => {
  it("uses the socket and ignores x-forwarded-for by default", () => {
    const result = resolveClientIp(headers({ "x-forwarded-for": SPOOFED }), {
      socketAddress: VISITOR,
    })

    expect(result).toEqual({ ip: VISITOR, source: "socket" })
  })

  it("returns undefined when no address is known", () => {
    expect(resolveClientIp(headers({}))).toBeUndefined()
  })

  it("unwraps an IPv4-mapped socket address", () => {
    expect(resolveClientIp(headers({}), { socketAddress: "::ffff:203.0.113.7" })?.ip).toBe(VISITOR)
  })

  describe("with a proxy count", () => {
    it("reads the entry the last proxy appended", () => {
      const result = resolveClientIp(headers({ "x-forwarded-for": `${SPOOFED}, ${VISITOR}` }), {
        trustedProxies: 1,
      })

      expect(result).toEqual({ ip: VISITOR, source: "x-forwarded-for" })
    })

    it("skips the hops of each trusted proxy", () => {
      const result = resolveClientIp(
        headers({ "x-forwarded-for": `${SPOOFED}, ${VISITOR}, 10.0.0.2` }),
        { trustedProxies: 2 },
      )

      expect(result?.ip).toBe(VISITOR)
    })

    it("takes the first entry when the chain is shorter than the count", () => {
      const result = resolveClientIp(headers({ "x-forwarded-for": VISITOR }), { trustedProxies: 3 })

      expect(result?.ip).toBe(VISITOR)
    })

    it("falls back to the socket when the entry is not an address", () => {
      const result = resolveClientIp(headers({ "x-forwarded-for": "unknown" }), {
        trustedProxies: 1,
        socketAddress: "10.0.0.2",
      })

      expect(result).toEqual({ ip: "10.0.0.2", source: "socket" })
    })
  })

  describe("with trusted ranges", () => {
    it("returns the rightmost entry outside the ranges", () => {
      const result = resolveClientIp(
        headers({ "x-forwarded-for": `${SPOOFED}, ${VISITOR}, 10.0.0.3, 10.0.0.2` }),
        { trustedProxies: ["10.0.0.0/8"], socketAddress: "10.0.0.1" },
      )

      expect(result).toEqual({ ip: VISITOR, source: "x-forwarded-for" })
    })

    it("accepts a bare address as a range", () => {
      const result = resolveClientIp(headers({ "x-forwarded-for": VISITOR }), {
        trustedProxies: ["192.0.2.10"],
        socketAddress: "192.0.2.10",
      })

      expect(result?.ip).toBe(VISITOR)
    })

    it("ignores the header when the socket is unknown", () => {
      const result = resolveClientIp(headers({ "x-forwarded-for": SPOOFED }), {
        trustedProxies: ["10.0.0.0/8"],
      })

      expect(result).toBeUndefined()
    })

    it("ignores the header when the socket is outside the ranges", () => {
      const result = resolveClientIp(headers({ "x-forwarded-for": SPOOFED }), {
        trustedProxies: ["10.0.0.0/8"],
        socketAddress: VISITOR,
      })

      expect(result).toEqual({ ip: VISITOR, source: "socket" })
    })
  })

  describe("with Cloudflare", () => {
    it("believes cf-connecting-ip from a Cloudflare peer", () => {
      const result = resolveClientIp(headers({ "cf-connecting-ip": VISITOR }), {
        trust: "cloudflare",
        socketAddress: CLOUDFLARE_PEER,
      })

      expect(result).toEqual({ ip: VISITOR, source: "cf-connecting-ip" })
    })

    it("believes it when a trusted proxy forwarded Cloudflare's address", () => {
      const result = resolveClientIp(
        headers({ "cf-connecting-ip": VISITOR, "x-forwarded-for": CLOUDFLARE_PEER }),
        { trust: "cloudflare", trustedProxies: 1, socketAddress: "10.0.0.2" },
      )

      expect(result?.source).toBe("cf-connecting-ip")
    })

    it("ignores cf-connecting-ip from any other peer", () => {
      const result = resolveClientIp(headers({ "cf-connecting-ip": SPOOFED }), {
        trust: "cloudflare",
        socketAddress: VISITOR,
      })

      expect(result).toEqual({ ip: VISITOR, source: "socket" })
    })

    it("keeps the peer when cf-connecting-ip is not an address", () => {
      const result = resolveClientIp(headers({ "cf-connecting-ip": "nope" }), {
        trust: "cloudflare",
        socketAddress: CLOUDFLARE_PEER,
      })

      expect(result).toEqual({ ip: CLOUDFLARE_PEER, source: "socket" })
    })
  })

  it("reads headers through a function", () => {
    const values: Record<string, string> = { "x-forwarded-for": VISITOR }
    const result = resolveClientIp(name => values[name], { trustedProxies: 1 })

    expect(result?.ip).toBe(VISITOR)
  })

  it("never reads x-real-ip", () => {
    const result = resolveClientIp(headers({ "x-real-ip": SPOOFED }), {
      trustedProxies: 1,
      socketAddress: VISITOR,
    })

    expect(result?.ip).toBe(VISITOR)
  })
})

describe("resolveClientIp without trusted proxies", () => {
  it("names the header the address came from", () => {
    expect(
      resolveClientIp(new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" })),
    ).toEqual({
      ip: "203.0.113.9",
      source: "x-forwarded-for",
    })
    expect(resolveClientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toEqual({
      ip: "203.0.113.9",
      source: "x-real-ip",
    })
  })

  it("matches getClientIp", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9" })
    expect(getClientIp(headers)).toBe(resolveClientIp(headers)?.ip)
  })
})

describe("getParentDomains", () => {
  it("lists the hostname and every parent domain", () => {
    expect(getParentDomains("a.b.example.co.uk")).toEqual([
      "a.b.example.co.uk",
      "b.example.co.uk",
      "example.co.uk",
      "co.uk",
    ])
  })

  it("returns nothing for a single label", () => {
    expect(getParentDomains("localhost")).toEqual([])
  })
})

describe("isHostnameAllowed", () => {
  const site = { domain: "example.com", extraHostnames: ["shop.example.net", "*.example.org"] }

  it("accepts the domain and its subdomains", () => {
    expect(isHostnameAllowed("example.com", site)).toBe(true)
    expect(isHostnameAllowed("App.Example.com", site)).toBe(true)
  })

  it("matches an extra hostname exactly unless it has a wildcard", () => {
    expect(isHostnameAllowed("shop.example.net", site)).toBe(true)
    expect(isHostnameAllowed("www.shop.example.net", site)).toBe(false)
    expect(isHostnameAllowed("example.org", site)).toBe(true)
    expect(isHostnameAllowed("blog.example.org", site)).toBe(true)
  })

  it("refuses any other hostname", () => {
    expect(isHostnameAllowed("example.com.evil.test", site)).toBe(false)
    expect(isHostnameAllowed("notexample.com", site)).toBe(false)
  })
})

describe("resolveClientIp when the socket cannot be read", () => {
  const spoofed = new Headers({ "x-forwarded-for": "198.51.100.66", "x-real-ip": "198.51.100.66" })

  it("keeps the strict rules for an empty socketAddress", () => {
    expect(resolveClientIp(spoofed, { socketAddress: undefined })).toBeUndefined()
    expect(resolveClientIp(spoofed, { socketAddress: null })).toBeUndefined()
  })

  it("trusts no header from proxies in a range list without a socket", () => {
    expect(
      resolveClientIp(spoofed, { trustedProxies: ["10.0.0.0/8"], socketAddress: undefined }),
    ).toBeUndefined()
  })
})
