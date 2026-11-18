import { readFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
import type { ClientIpSource } from "@underpin/utils/http"
import { type CityResponse, Reader } from "maxmind"
import { lru } from "tiny-lru"

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

/** An address with no country of its own is placed where its block is registered. */
function readCountry(record: CityResponse | null): string {
  return sanitizeCountry(record?.country?.iso_code ?? record?.registered_country?.iso_code)
}

function toGeoLocation(record: CityResponse): GeoLocation {
  return {
    country: readCountry(record),
    region: record.subdivisions?.[0]?.iso_code ?? "",
    city: record.city?.names?.en ?? "",
    latitude: record.location?.latitude ?? null,
    longitude: record.location?.longitude ?? null,
  }
}

// The size of `maxmind.open`'s default cache of decoded records.
const CACHE_SIZE = 10_000

function createGeoDatabase(file: Buffer): GeoDatabase {
  const reader = new Reader<CityResponse>(file, { cache: lru(CACHE_SIZE) })

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
      return readCountry(find(ip))
    },
  }
}

/**
 * Opens an MMDB file: MaxMind's GeoLite2 or GeoIP2, or DB-IP's Lite or paid databases, Country or
 * City. The whole file is read into memory, so open it once at startup and reuse the result. The
 * package bundles no database: download one and pass its path. Lookups keep the last 10,000
 * decoded records in memory.
 * @param path - The path of the `.mmdb` file.
 * @returns The database.
 * @throws When the file is missing or is not an MMDB database. A caller that runs without geo
 * data catches the error.
 * @example
 * const geo = openGeoDatabase("data/GeoLite2-City.mmdb")
 * geo.lookup("81.2.69.142") // { country: "GB", region: "ENG", city: "London", ... }
 */
export function openGeoDatabase(path: string): GeoDatabase {
  return createGeoDatabase(readFileSync(path))
}

/**
 * Opens an MMDB file like {@link openGeoDatabase}, but reads it without blocking the event loop.
 * Use it to load a fresh copy while the server runs, then swap it in.
 * @param path - The path of the `.mmdb` file.
 * @returns The database.
 * @throws When the file is missing or is not an MMDB database, as a rejected promise.
 * @example
 * geo = await loadGeoDatabase("data/GeoLite2-City.mmdb")
 */
export async function loadGeoDatabase(path: string): Promise<GeoDatabase> {
  return createGeoDatabase(await readFile(path))
}

/**
 * Reads the country Cloudflare stamps on a request (`cf-ipcountry`). Anyone can send that header,
 * so pass the source `resolveClientIp` from `@underpin/utils` gave: the country counts
 * only when the IP itself came from Cloudflare's `cf-connecting-ip`.
 * @param headers - The request headers.
 * @param ipSource - Where the client IP came from.
 * @returns The country, or an empty string when unknown or not from Cloudflare.
 */
export function getEdgeCountry(headers: Headers, ipSource: ClientIpSource | undefined): string {
  if (ipSource !== "cf-connecting-ip") return ""

  return sanitizeCountry(headers.get("cf-ipcountry"))
}

/**
 * Merges the edge's country with a database lookup into the place to store. The edge's country
 * wins, since it saw the visitor. Cloudflare sends no region, city or coordinates, so those come
 * from the database, and only when it places the IP in the same country: a database place in
 * another country would store one that does not exist, such as "United States / Kraków".
 * @param edgeCountry - The country from {@link getEdgeCountry}, or "" when the edge gave none.
 * @param ipGeo - The database's answer for the client IP.
 * @returns The location, with empty fields where neither source knows.
 * @example
 * const location = resolveGeo(getEdgeCountry(request.headers, client.source), geo.lookup(client.ip))
 */
export function resolveGeo(edgeCountry: string, ipGeo: GeoLocation | null): GeoLocation {
  const matchingIpGeo = !edgeCountry || ipGeo?.country === edgeCountry ? ipGeo : null

  return {
    country: edgeCountry || (ipGeo?.country ?? ""),
    region: matchingIpGeo?.region ?? "",
    city: matchingIpGeo?.city ?? "",
    latitude: matchingIpGeo?.latitude ?? null,
    longitude: matchingIpGeo?.longitude ?? null,
  }
}
