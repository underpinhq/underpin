import { useEffect, useState, useSyncExternalStore } from "react"
import { LOGO_LOADERS } from "./generated/browsers.js"
import { FLAG_LOADERS } from "./generated/flags.js"
import { findBrowserLogo } from "./names.js"

type Loader = () => Promise<{ default: string }>

// Each image loads once per page, so a list of rows asks for every flag a single time.
const cache = new Map<Loader, string>()
const pending = new Map<Loader, Promise<string>>()

/**
 * Loads an image once and caches it. A failed load is forgotten, so a later render retries it.
 * @param loader - The `import()` of the image's module.
 * @returns The image as a data URI.
 */
export function loadImage(loader: Loader): Promise<string> {
  const cached = cache.get(loader)

  if (cached) {
    return Promise.resolve(cached)
  }

  let promise = pending.get(loader)

  if (!promise) {
    promise = loader().then(
      module => {
        cache.set(loader, module.default)
        pending.delete(loader)
        return module.default
      },
      (error: unknown) => {
        pending.delete(loader)
        throw error
      },
    )
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
  return loader ? loadImage(loader) : undefined
}

/**
 * Loads a browser's logo.
 * @param name - A browser name, as `parseUserAgent` returns it.
 * @returns The logo as a data URI, or undefined for a browser without one.
 */
export async function loadBrowserLogo(name: string): Promise<string | undefined> {
  const loader = findLogoLoader(name)
  return loader ? loadImage(loader) : undefined
}

export interface PreloadedImages {
  flags?: readonly string[] // ISO 3166-1 alpha-2 codes, any case.
  browsers?: readonly string[] // Browser names, as `parseUserAgent` returns them.
}

/**
 * Loads every flag and logo given, so a client render shows them at once instead of a
 * placeholder first. Call it before a list of rows appears.
 * @param images - The country codes and browser names to load.
 */
export async function preloadImages(images: PreloadedImages): Promise<void> {
  await Promise.all([
    ...(images.flags ?? []).map(loadFlag),
    ...(images.browsers ?? []).map(loadBrowserLogo),
  ])
}

/** The last load to finish, kept with its loader, so a changed name never shows a stale image. */
export interface LoadedImage {
  loader: Loader
  image: string | null
}

/**
 * Picks what a component shows for a loader.
 * @param loader - The image's loader, or undefined for a name without an image.
 * @param isHydrated - False during a server render and hydration, which both show the placeholder.
 * @param loaded - The last load the component saw finish.
 * @returns `undefined` for the placeholder, `null` for no image, or the image as a data URI.
 */
export function selectImage(
  loader: Loader | undefined,
  isHydrated: boolean,
  loaded: LoadedImage | undefined,
): string | null | undefined {
  if (!loader) {
    return null
  }

  // The server never has the client's cache, so both render the placeholder until hydration ends.
  if (!isHydrated) {
    return
  }

  if (loaded?.loader === loader) {
    return loaded.image
  }

  return cache.get(loader)
}

function subscribeToNothing(): () => void {
  return () => {}
}

/**
 * Whether hydration has finished: false on the server and while hydrating, true after hydration
 * and from the first render of a tree that renders on the client only.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

/**
 * The image a loader gives: `undefined` while it loads, `null` when there is no loader.
 * A cached image comes back on the first client render, so a preloaded one never flickers.
 */
function useImage(loader: Loader | undefined): string | null | undefined {
  const isHydrated = useIsHydrated()
  const [loaded, setLoaded] = useState<LoadedImage>()

  useEffect(() => {
    if (!loader || cache.has(loader)) {
      return
    }

    let active = true

    loadImage(loader).then(
      image => {
        if (active) {
          setLoaded({ loader, image })
        }
      },
      () => {
        if (active) {
          setLoaded({ loader, image: null })
        }
      },
    )

    return () => {
      active = false
    }
  }, [loader])

  return selectImage(loader, isHydrated, loaded)
}

export function useFlag(code: string | null | undefined): string | null | undefined {
  return useImage(findFlagLoader(code))
}

export function useBrowserLogo(name: string | null | undefined): string | null | undefined {
  return useImage(findLogoLoader(name))
}
