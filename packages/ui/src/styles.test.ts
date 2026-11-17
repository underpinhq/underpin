import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { readColorNames, readToken, THEMES, toSrgb, type Rgb } from "./lib/color"

/**
 * WCAG 1.4.3 asks 4.5:1 of body text, which a badge's 11px label is. axe cannot check it in
 * happy-dom, which paints nothing, so this reads the tokens straight from the stylesheet and
 * does the colour maths.
 */
const STYLES = readFileSync(join(import.meta.dir, "styles.css"), "utf8")
// Every opaque surface body text sits on: the page, a card, a popup, a fill, a well, a field.
const SURFACES = ["canvas", "surface", "overlay", "fill", "well", "field"]

function getToken(name: string) {
  return readToken(STYLES, name)
}

/**
 * The stylesheet with these declarations replaced, as a product's own rule replaces them. Only a
 * declaration that starts its line matches, never one quoted in a comment.
 */
function withDeclarations(values: Record<string, string>) {
  return Object.entries(values).reduce(
    (css, [name, value]) => css.replace(new RegExp(`^(\\s*--${name}:)[^;]+;`, "m"), `$1 ${value};`),
    STYLES,
  )
}

function luminance(rgb: Rgb) {
  const [red, green, blue] = rgb.map(channel =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as Rgb

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(first: Rgb, second: Rgb) {
  const lighter = Math.max(luminance(first), luminance(second))
  const darker = Math.min(luminance(first), luminance(second))

  return (lighter + 0.05) / (darker + 0.05)
}

/** Every pairing of a text token with the surfaces it is read on that falls under `minimum`. */
function findFailures(texts: string[], surfaces: string[], minimum: number) {
  const failures: string[] = []

  for (const theme of THEMES) {
    for (const text of texts) {
      for (const surface of surfaces) {
        const ratio = contrast(
          toSrgb(getToken(`color-${text}`)[theme]),
          toSrgb(getToken(`color-${surface}`)[theme]),
        )
        if (ratio < minimum) failures.push(`${theme} ${text} on ${surface}: ${ratio.toFixed(2)}`)
      }
    }
  }

  return failures
}

describe("styles.css", () => {
  test("the colour maths matches known WCAG ratios", () => {
    const white = toSrgb({ lightness: 1, chroma: 0, hue: 0, alpha: 1 })
    const black = toSrgb({ lightness: 0, chroma: 0, hue: 0, alpha: 1 })

    expect(contrast(white, black)).toBeCloseTo(21, 1)
    expect(contrast(white, white)).toBe(1)
  })

  test("every ink reaches 4.5:1 on every surface, in both themes", () => {
    expect(findFailures(["ink", "ink-secondary", "ink-muted"], SURFACES, 4.5)).toEqual([])
  })

  test("every coloured -ink reaches 4.5:1 on the canvas and a card, in both themes", () => {
    const inks = ["brand-ink", "success-ink", "warning-ink", "danger-ink"]
    expect(findFailures(inks, ["canvas", "surface"], 4.5)).toEqual([])
  })

  test("the ink on each solid reaches 4.5:1 against it, in both themes", () => {
    const failures = [
      ["ink-inverse", "ink"],
      ["brand-on", "brand"],
      ["success-on", "success"],
      ["warning-on", "warning"],
      ["danger-on", "danger"],
    ].flatMap(([text = "", solid = ""]) => findFailures([text], [solid], 4.5))

    expect(failures).toEqual([])
  })

  test("each -ink reaches 4.5:1 on its own -subtle tint over a card, in both themes", () => {
    const failures: string[] = []

    for (const theme of THEMES) {
      const card = toSrgb(getToken("color-surface")[theme])

      for (const tone of ["brand", "success", "warning", "danger"]) {
        const tint = getToken(`color-${tone}-subtle`)[theme]
        const ink = toSrgb(getToken(`color-${tone}-ink`)[theme])
        // A translucent fill paints over the card: browsers blend in gamma-encoded sRGB.
        const fill = toSrgb(tint).map(
          (channel, index) => channel * tint.alpha + (card[index] ?? 0) * (1 - tint.alpha),
        ) as Rgb
        const ratio = contrast(ink, fill)
        if (ratio < 4.5) {
          failures.push(`${theme} ${tone}-ink on ${tone}-subtle: ${ratio.toFixed(2)}`)
        }
      }
    }

    expect(failures).toEqual([])
  })

  /**
   * A product sets its gray with two numbers, so they have to reach every neutral token: at
   * `--gray-chroma: 0` each one is a true gray, and another `--gray-hue` moves each tinted one to
   * it. A token that wrote a hue of its own would keep it and fail here.
   */
  test("every neutral token takes its tone from --gray-hue and --gray-chroma", () => {
    const untinted = withDeclarations({ "gray-chroma": "0" })
    // Two hues, so a token that writes a hue of its own cannot match both.
    const tinted = [137, 311].map(hue => ({ hue, css: withDeclarations({ "gray-hue": `${hue}` }) }))
    // Everything but the accent, the status colours, the focus ring and the chart's hues; the
    // text on a solid is the ramp's ink, so it counts.
    const neutrals = readColorNames(STYLES).filter(
      name =>
        !/^color-(brand|focus|success|warning|danger|chart)/.test(name) || name.endsWith("-on"),
    )
    const failures: string[] = []

    for (const name of neutrals) {
      for (const theme of THEMES) {
        const plain = readToken(untinted, name)[theme]
        if (plain.chroma !== 0) {
          failures.push(`${name} ${theme} keeps chroma ${plain.chroma} at --gray-chroma: 0`)
        }
        for (const { hue, css } of tinted) {
          const color = readToken(css, name)[theme]
          if (color.chroma > 0 && color.hue !== hue) {
            failures.push(`${name} ${theme} keeps hue ${color.hue} at --gray-hue: ${hue}`)
          }
        }
      }
    }

    expect(neutrals.length).toBeGreaterThan(30)
    expect(failures).toEqual([])
  })

  /**
   * A product sets its accent by declaring the brand tokens, so the ones drawn from them (the
   * edge around a brand tint and the first chart series) have to follow rather than keep the
   * default's blue.
   */
  test("the brand edge and the first chart series follow the brand tokens", () => {
    const accent = "light-dark(oklch(0.5 0.2 350), oklch(0.7 0.15 350))"
    const ink = "light-dark(oklch(0.45 0.2 350), oklch(0.8 0.1 350))"
    const product = withDeclarations({ "color-brand": accent, "color-brand-ink": ink })

    for (const theme of THEMES) {
      expect(readToken(product, "color-chart-1")[theme]).toEqual(
        readToken(product, "color-brand")[theme],
      )
      expect(readToken(product, "color-brand-edge")[theme]).toEqual({
        ...readToken(product, "color-brand-ink")[theme],
        alpha: 0.2,
      })
    }
  })

  /**
   * The float edge repeats two other edges' values rather than nesting `light-dark()` inside
   * `light-dark()`, so a change to either of them has to reach it too.
   */
  test("the float edge is the plain edge in light and the strong edge in dark", () => {
    expect(getToken("color-edge-float").light).toEqual(getToken("color-edge").light)
    expect(getToken("color-edge-float").dark).toEqual(getToken("color-edge-strong").dark)
  })

  /**
   * An edge is a `border`. A shadow with a spread and no offset or blur is a ring: it sits outside
   * the box, a parent's clip cuts it off, and every state has to restate the shadow beside it.
   * `scripts/shadow-edges.test.ts` holds the classes to the same rule.
   */
  test("no shadow token draws a ring", () => {
    const declarations = STYLES.match(/--shadow-[a-z-]+:[^;]+;/g) ?? []

    expect(declarations.length).toBeGreaterThan(0)
    expect(declarations.filter(value => /\b0 0 0 [1-9]/.test(value))).toEqual([])
  })
})
