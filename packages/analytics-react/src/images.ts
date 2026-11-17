import { useEffect, useState } from "react"
import { LOGO_LOADERS } from "./generated/browsers.js"
import { FLAG_LOADERS } from "./generated/flags.js"
import { findBrowserLogo } from "./names.js"

type Loader = () => Promise<{ default: string }>

// Each image loads once per page, so a list of rows asks for every flag a single time.
const cache = new Map<Loader, string>()
const pending = new Map<Loader, Promise<string>>()

function load(loader: Loader): Promise<string> {
  const cached = cache.get(loader)
  if (cached) return Promise.resolve(cached)

  let promise = pending.get(loader)

  if (!promise) {
    promise = loader().then(module => {
      cache.set(loader, module.default)
      pending.delete(loader)
      return module.default
    })
    pending.set(loader, promise)
  }

  return promise
}

function findFlagLoader(code: string | null | undefined): Loader | undefined {
  const key = code?.trim().toLowerCase()
  return key ? FLAG_LOADERS[key] : undefined
}

function findLogoLoader(name: string | null | undefined): Loader | undefined {
  const logo = name ? findBrowserLogo(name) : undefined
  return logo ? LOGO_LOADERS[logo] : undefined
}

/**
 * Loads a country's flag.
 * @param code - An ISO 3166-1 alpha-2 code, any case.
 * @returns The flag as a data URI, or undefined for a code without a flag.
 */
export async function loadFlag(code: string): Promise<string | undefined> {
  const loader = findFlagLoader(code)
  return loader ? load(loader) : undefined
}

/**
 * Loads a browser's logo.
 * @param name - A browser name, as `parseUserAgent` returns it.
 * @returns The logo as a data URI, or undefined for a browser without one.
 */
export async function loadBrowserLogo(name: string): Promise<string | undefined> {
  const loader = findLogoLoader(name)
  return loader ? load(loader) : undefined
}

/**
 * Loads every flag and logo given, so components render them at once. Call it before a server
 * render, or before a list of rows appears.
 * @param images - The country codes and browser names to load.
 */
export async function preloadImages(images: {
  flags?: readonly string[]
  browsers?: readonly string[]
}): Promise<void> {
  await Promise.all([
    ...(images.flags ?? []).map(loadFlag),
    ...(images.browsers ?? []).map(loadBrowserLogo),
  ])
}

/**
 * The image a loader gives: `undefined` while it loads, `null` when there is no loader.
 * A loaded image comes back on the first render, so a preloaded one never flickers.
 */
function useImage(loader: Loader | undefined): string | null | undefined {
  // The last load to finish, kept with its loader, so a changed name never shows a stale image.
  const [loaded, setLoaded] = useState<{ loader: Loader; image: string | null }>()

  useEffect(() => {
    if (!loader || cache.has(loader)) return

    let active = true
    load(loader).then(
      image => {
        if (active) setLoaded({ loader, image })
      },
      () => {
        if (active) setLoaded({ loader, image: null })
      },
    )

    return () => {
      active = false
    }
  }, [loader])

  if (!loader) return null
  if (loaded?.loader === loader) return loaded.image

  return cache.get(loader)
}

export function useFlag(code: string | null | undefined): string | null | undefined {
  return useImage(findFlagLoader(code))
}

export function useBrowserLogo(name: string | null | undefined): string | null | undefined {
  return useImage(findLogoLoader(name))
}
