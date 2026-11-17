/*
 * The stylesheet's colour tokens read as data, for the places that cannot run CSS: an email, an
 * Open Graph image, a JSON config. `styles.css` stays the only place a colour is written.
 */

export type Rgb = [number, number, number]
export type Theme = "light" | "dark"

export interface Oklch {
  lightness: number
  chroma: number
  hue: number
  alpha: number
}

/** What a custom property holds in the stylesheet, by name. */
type Lookup = (name: string) => string | undefined

export const THEMES: Theme[] = ["light", "dark"]

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim()
}

/** The stylesheet without its comments, which quote declarations (`--gray-chroma: 0`) as prose. */
function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

function createLookup(css: string): Lookup {
  const code = stripComments(css)

  return name => {
    const value = code.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]
    if (value === undefined) return
    return collapseWhitespace(value)
  }
}

/** Splits `value` on each top-level `separator` (a comma by default), not those in nested calls. */
export function splitTopLevel(value: string, separator = ",") {
  const parts: string[] = []
  let depth = 0
  let current = ""

  for (const character of value) {
    if (character === "(") depth++
    if (character === ")") depth--
    if (character === separator && depth === 0) {
      parts.push(current.trim())
      current = ""
    } else {
      current += character
    }
  }

  parts.push(current.trim())
  return parts
}

/** `value` with every `var(--name)` replaced by what that variable holds, all the way down. */
function substitute(value: string, lookup: Lookup, depth = 0): string {
  if (depth > 8) throw new Error(`var() nests too deep in ${value}`)

  return value.replace(/var\(--([a-z0-9-]+)\)/g, (_match, name: string) => {
    const resolved = lookup(name)
    if (resolved === undefined) throw new Error(`--${name} is not declared`)
    return substitute(resolved, lookup, depth + 1)
  })
}

/** A number, or a `calc()` that multiplies numbers, which is all the stylesheet's colours use. */
function evaluate(expression: string) {
  const body = expression.match(/^calc\((.+)\)$/)?.[1]
  const factors = body ? body.split("*") : [expression]
  const value = factors.reduce((result, factor) => result * Number.parseFloat(factor.trim()), 1)
  if (Number.isNaN(value)) throw new Error(`Cannot evaluate ${expression}`)
  return value
}

function readAlpha(value: string | undefined) {
  if (value === undefined) return 1
  return value.endsWith("%") ? Number.parseFloat(value) / 100 : Number.parseFloat(value)
}

/** One side of a colour expression with no `var()` left in it. */
function parseColor(expression: string, theme: Theme): Oklch {
  const [, name, body = ""] = expression.match(/^([a-z-]+)\((.*)\)$/s) ?? []

  if (name === "light-dark") {
    const [light = "", dark = ""] = splitTopLevel(body)
    return parseColor(theme === "light" ? light : dark, theme)
  }

  // `color-mix(in oklab, <colour> N%, transparent)`: the colour at N% of its strength.
  if (name === "color-mix") {
    const [space, mixed = "", other] = splitTopLevel(body)
    const [, color = "", strength = ""] = mixed.match(/^(.+)\s+([\d.]+)%$/s) ?? []
    if (space !== "in oklab" || other !== "transparent" || !color) {
      throw new Error(`Only a colour mixed with transparent in oklab is read: ${expression}`)
    }
    const base = parseColor(color, theme)
    return { ...base, alpha: base.alpha * (Number.parseFloat(strength) / 100) }
  }

  if (name === "oklch") {
    const [channels = "", alpha] = splitTopLevel(body, "/")
    const [lightness = "", chroma = "", hue = ""] = splitTopLevel(channels, " ")
    return {
      lightness: evaluate(lightness),
      chroma: evaluate(chroma),
      hue: evaluate(hue),
      alpha: readAlpha(alpha),
    }
  }

  throw new Error(`Not an oklch colour, pair or mix: ${expression}`)
}

/** A token's two sides, following `var()` to a gray setting, a gray step or another token. */
export function readToken(css: string, name: string): Record<Theme, Oklch> {
  const lookup = createLookup(css)
  const value = lookup(name)
  if (!value) throw new Error(`--${name} is not declared`)

  const expression = substitute(value, lookup)
  return { light: parseColor(expression, "light"), dark: parseColor(expression, "dark") }
}

/** OKLCH to gamma-encoded sRGB in 0 to 1, clipped to the gamut. */
export function toSrgb({ lightness, chroma, hue }: Oklch): Rgb {
  const radians = (hue * Math.PI) / 180
  const greenRed = chroma * Math.cos(radians)
  const blueYellow = chroma * Math.sin(radians)
  const long = (lightness + 0.3963377774 * greenRed + 0.2158037573 * blueYellow) ** 3
  const medium = (lightness - 0.1055613458 * greenRed - 0.0638541728 * blueYellow) ** 3
  const short = (lightness - 0.0894841775 * greenRed - 1.291485548 * blueYellow) ** 3
  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ]

  return linear.map(channel => {
    const clipped = Math.min(1, Math.max(0, channel))
    return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055
  }) as Rgb
}

export function formatHex(rgb: Rgb) {
  return `#${rgb
    .map(channel =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}

/** `color` at `alpha` over `ground`, mixed in gamma-encoded sRGB as a browser blends a paint. */
function blend(color: Rgb, alpha: number, ground: Rgb): Rgb {
  return color.map((channel, index) => channel * alpha + (ground[index] ?? 0) * (1 - alpha)) as Rgb
}

/** The colour tokens and gray steps the stylesheet declares, in its order. */
export function readColorNames(css: string) {
  const names = [...stripComments(css).matchAll(/--((?:color-[a-z0-9-]+)|(?:gray-\d+)):/g)].map(
    match => match[1] ?? "",
  )
  return [...new Set(names)]
}

/**
 * Every opaque colour token and gray step as hex, per theme. A translucent edge is the hex it
 * makes over a card's surface, which is where code that cannot blend (an email) draws its lines.
 * Any other translucent token (a `-subtle` tint, a coloured `-edge`, the scrim) has no single hex
 * and is left out.
 */
export function readOpaqueTokens(css: string): Record<Theme, Record<string, string>> {
  const tokens: Record<Theme, Record<string, string>> = { light: {}, dark: {} }
  const surface = readToken(css, "color-surface")

  for (const name of readColorNames(css)) {
    const value = readToken(css, name)
    const key = name.replace(/^color-/, "")
    const translucent = value.light.alpha < 1 || value.dark.alpha < 1
    if (translucent && !key.startsWith("edge")) continue

    for (const theme of THEMES) {
      const color = toSrgb(value[theme])
      tokens[theme][key] = formatHex(
        translucent ? blend(color, value[theme].alpha, toSrgb(surface[theme])) : color,
      )
    }
  }

  return tokens
}
