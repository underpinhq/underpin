// The one place the package builds an `Intl` formatter, for the few readings it makes itself
// (a `Trend`'s figure, the dates of `@underpin/ui/day`). Everything else takes its text or its
// formatter from the app. A formatter costs far more to build than to use, so each one is
// built once per language and options and kept.

const NUMBER_FORMATS = new Map<string, Intl.NumberFormat>()
const DATE_FORMATS = new Map<string, Intl.DateTimeFormat>()
const RELATIVE_FORMATS = new Map<string, Intl.RelativeTimeFormat>()

function memoise<T>(cache: Map<string, T>, key: string, build: () => T) {
  let value = cache.get(key)
  if (value === undefined) {
    value = build()
    cache.set(key, value)
  }
  return value
}

function formatKey(locale: string | undefined, options: object) {
  return `${locale ?? ""}:${JSON.stringify(options)}`
}

/** A number formatter for `locale`, the reader's own when it is left out. */
export function numberFormat(locale: string | undefined, options: Intl.NumberFormatOptions = {}) {
  return memoise(NUMBER_FORMATS, formatKey(locale, options), () => {
    return new Intl.NumberFormat(locale, options)
  })
}

/** A date formatter for `locale`, the reader's own when it is left out. */
export function dateFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions = {}) {
  return memoise(DATE_FORMATS, formatKey(locale, options), () => {
    return new Intl.DateTimeFormat(locale, options)
  })
}

/** A relative time formatter for `locale`, the reader's own when it is left out. */
export function relativeFormat(
  locale: string | undefined,
  options: Intl.RelativeTimeFormatOptions = {},
) {
  return memoise(RELATIVE_FORMATS, formatKey(locale, options), () => {
    return new Intl.RelativeTimeFormat(locale, options)
  })
}
