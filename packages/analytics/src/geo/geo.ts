import { readFileSync } from "node:fs"
import { type CityResponse, Reader } from "maxmind"
import type { ClientIpSource } from "../client-ip/client-ip.js"

/** Where an IP address is, as far as the database knows. Unknown fields are empty or null. */
export interface GeoLocation {
  /** ISO 3166-1 alpha-2 code, such as "PL". */
  country: string
  /** The ISO 3166-2 subdivision code without its country, such as "14" or "ENG". */
  region: string
  /** The English city name. */
  city: string
  latitude: number | null
  longitude: number | null
}

export interface GeoDatabase {
  /**
   * Looks up an IP address. A country database (GeoLite2 Country, DB-IP Country Lite) gives the
   * country alone, and a city database gives the rest too.
   * @param ip - An IPv4 or IPv6 address.
   * @returns The location, or null when the database holds nothing for the address.
   */
  lookup(ip: string): GeoLocation | null
  /**
   * Looks up only the country of an IP address.
   * @param ip - An IPv4 or IPv6 address.
   * @returns The ISO 3166-1 alpha-2 code, or an empty string when unknown.
   */
  lookupCountry(ip: string): string
}

// Codes that name no country: "XX" and "ZZ" mean unknown (DB-IP writes "ZZ"), and Cloudflare
// writes "T1" for a Tor exit node.
const PSEUDO_COUNTRIES = new Set(["XX", "ZZ", "T1"])

/**
 * Normalizes a country code to uppercase ISO 3166-1 alpha-2.
 * @param code - A code from a database or a header such as `cf-ipcountry`.
 * @returns The code, or an empty string for a missing, malformed or pseudo-country code.
 * @example
 * sanitizeCountry("pl") // "PL"
 * sanitizeCountry("ZZ") // ""
 */
export function sanitizeCountry(code: string | null | undefined): string {
  const upper = code?.trim().toUpperCase() ?? ""
  if (PSEUDO_COUNTRIES.has(upper) || !/^[A-Z]{2}$/.test(upper)) return ""

  return upper
}

function toGeoLocation(record: CityResponse): GeoLocation {
  return {
    // An address with no country of its own is placed where its block is registered.
    country: sanitizeCountry(record.country?.iso_code ?? record.registered_country?.iso_code),
    region: record.subdivisions?.[0]?.iso_code ?? "",
    city: record.city?.names?.en ?? "",
    latitude: record.location?.latitude ?? null,
    longitude: record.location?.longitude ?? null,
  }
}

/**
 * Opens an MMDB file: MaxMind's GeoLite2 or GeoIP2, or DB-IP's Lite or paid databases, Country or
 * City. The whole file is read into memory, so open it once at startup and reuse the result. The
 * package bundles no database: download one and pass its path.
 * @param path - The path of the `.mmdb` file.
 * @returns The database.
 * @throws When the file is missing or is not an MMDB database. A caller that runs without geo
 * data catches the error.
 * @example
 * const geo = openGeoDatabase("data/GeoLite2-City.mmdb")
 * geo.lookup("81.2.69.142") // { country: "GB", region: "ENG", city: "London", ... }
 */
export function openGeoDatabase(path: string): GeoDatabase {
  const reader = new Reader<CityResponse>(readFileSync(path))

  function find(ip: string): CityResponse | null {
    try {
      return ip ? reader.get(ip) : null
    } catch {
      // The reader throws on a malformed address, which a lookup treats as unknown.
      return null
    }
  }

  return {
    lookup(ip) {
      const record = find(ip)
      return record ? toGeoLocation(record) : null
    },
    lookupCountry(ip) {
      const record = find(ip)
      return sanitizeCountry(record?.country?.iso_code ?? record?.registered_country?.iso_code)
    },
  }
}

/**
 * Reads the country Cloudflare stamps on a request (`cf-ipcountry`). Anyone can send that header,
 * so pass the source `getClientIp` from `@underpin/analytics/client-ip` gave: the country counts
 * only when the IP itself came from Cloudflare's `cf-connecting-ip`.
 * @param headers - The request headers.
 * @param ipSource - Where the client IP came from.
 * @returns The country, or an empty string when unknown or not from Cloudflare.
 */
export function getEdgeCountry(headers: Headers, ipSource: ClientIpSource | undefined): string {
  if (ipSource !== "cf-connecting-ip") return ""

  return sanitizeCountry(headers.get("cf-ipcountry"))
}
