import { describe, expect, test } from "bun:test"
import { getEdgeCountry, openGeoDatabase, resolveGeo, sanitizeCountry } from "./geo.js"

// MaxMind's published test databases, from github.com/maxmind/MaxMind-DB (Apache-2.0).
const CITY = new URL("./fixtures/GeoLite2-City-Test.mmdb", import.meta.url).pathname
const COUNTRY = new URL("./fixtures/GeoLite2-Country-Test.mmdb", import.meta.url).pathname

describe("openGeoDatabase", () => {
  test("reads a city database", () => {
    expect(openGeoDatabase(CITY).lookup("81.2.69.142")).toEqual({
      country: "GB",
      region: "ENG",
      city: "London",
      latitude: 51.5142,
      longitude: -0.0931,
    })
  })

  test("reads an IPv6 address", () => {
    expect(openGeoDatabase(CITY).lookupCountry("2001:218::1")).toBe("JP")
  })

  test("reads a country database", () => {
    expect(openGeoDatabase(COUNTRY).lookup("89.160.20.112")).toEqual({
      country: "SE",
      region: "",
      city: "",
      latitude: null,
      longitude: null,
    })
  })

  test("returns nothing for an address the database does not hold", () => {
    const geo = openGeoDatabase(COUNTRY)

    expect(geo.lookup("1.1.1.1")).toBeNull()
    expect(geo.lookupCountry("1.1.1.1")).toBe("")
  })

  test("returns nothing for a malformed or empty address", () => {
    const geo = openGeoDatabase(COUNTRY)

    expect(geo.lookup("not-an-ip")).toBeNull()
    expect(geo.lookupCountry("")).toBe("")
  })

  test("throws when the file is missing", () => {
    expect(() => openGeoDatabase("/nonexistent/GeoLite2-City.mmdb")).toThrow()
  })
})

describe("sanitizeCountry", () => {
  test("uppercases a code", () => {
    expect(sanitizeCountry("pl")).toBe("PL")
  })

  test.each(["ZZ", "XX", "T1", "", "POL", "1A", null, undefined])("drops %p", code => {
    expect(sanitizeCountry(code)).toBe("")
  })
})

describe("getEdgeCountry", () => {
  const headers = new Headers({ "cf-ipcountry": "de" })

  test("reads the header when Cloudflare gave the IP", () => {
    expect(getEdgeCountry(headers, "cf-connecting-ip")).toBe("DE")
  })

  test("ignores the header for an IP from anywhere else", () => {
    expect(getEdgeCountry(headers, "x-forwarded-for")).toBe("")
    expect(getEdgeCountry(headers, undefined)).toBe("")
  })
})

describe("resolveGeo", () => {
  const london = { country: "GB", region: "ENG", city: "London", latitude: 51.5, longitude: -0.09 }

  test("keeps the database's place when the edge gave no country", () => {
    expect(resolveGeo("", london)).toEqual(london)
  })

  test("keeps the database's place when both agree on the country", () => {
    expect(resolveGeo("GB", london)).toEqual(london)
  })

  test("takes the edge's country and drops a place in another country", () => {
    expect(resolveGeo("PL", london)).toEqual({
      country: "PL",
      region: "",
      city: "",
      latitude: null,
      longitude: null,
    })
  })

  test("returns empty fields when neither source knows", () => {
    expect(resolveGeo("", null)).toEqual({
      country: "",
      region: "",
      city: "",
      latitude: null,
      longitude: null,
    })
  })
})
