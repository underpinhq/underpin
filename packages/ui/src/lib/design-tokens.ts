import {
  formatHex,
  readColorNames,
  readToken,
  splitTopLevel,
  toSrgb,
  type Oklch,
  type Rgb,
  type Theme,
} from "./color"

/*
 * The stylesheet's tokens as one JSON document for the Figma library: every colour per theme,
 * every shadow layer, the type scale, radii and spacing. Figma names follow the CSS names by one
 * rule, the prefix becomes the group (`--color-ink-muted` is `color/ink-muted`), so a script can
 * apply the document to the library and nobody names a variable by hand. Radii, spacing and
 * Tailwind's own type steps come from Tailwind's `theme.css`, which the stylesheet builds on.
 */

interface Paint {
  hex: string
  alpha: number
}

interface ColorToken {
  name: string
  css: string
  description?: string
  /** The Figma variable this one points at, when the CSS value is a bare `var()` of another. */
  alias?: string
  light: Paint
  dark: Paint
}

interface ShadowLayer {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  /** Drawn inside the box rather than under it. */
  inset?: boolean
  /** The colour variable the layer is bound to; `light` and `dark` are its resolved values. */
  variable?: string
  light: Paint
  dark: Paint
}

interface ShadowToken {
  name: string
  css: string
  description?: string
  layers: ShadowLayer[]
}

interface TextToken {
  name: string
  css: string
  size: number
  lineHeight: number
}

interface NumberToken {
  name: string
  css: string
  value: number
}

interface Declaration {
  value: string
  description?: string
}

export interface DesignTokens {
  fonts: { sans: string; mono: string }
  colors: ColorToken[]
  shadows: ShadowToken[]
  text: TextToken[]
  tracking: NumberToken[]
  radius: NumberToken[]
  spacing: NumberToken[]
}

const REM = 16
// Tailwind's steps the library draws with. Tailwind holds their values.
const TAILWIND_TEXT = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"]
const RADIUS_STEPS = ["xs", "sm", "md", "lg", "xl"]
const SPACING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12]

/**
 * Every custom property in a stylesheet, in source order, with the comment above its group.
 * A comment applies to the declarations under it until a blank line.
 */
function readDeclarations(css: string) {
  const declarations = new Map<string, Declaration>()
  let comment: string | undefined

  for (const match of css.matchAll(/(\/\*[\s\S]*?\*\/)|(\n\s*\n)|--([a-z0-9-]+):\s*([^;]+);/g)) {
    const [, block, blank, name, value] = match
    if (block) {
      comment = block
        .replace(/^\/\*+|\*+\/$/g, "")
        .split("\n")
        .map(line => line.replace(/^\s*\*\s?/, "").trim())
        .filter(Boolean)
        .join(" ")
    } else if (blank) {
      comment = undefined
    } else if (name && value && !declarations.has(name)) {
      declarations.set(name, { value: value.replace(/\s+/g, " ").trim(), description: comment })
    }
  }

  return declarations
}

function toPaint(oklch: Oklch): Paint {
  return { hex: formatHex(toSrgb(oklch)), alpha: Math.round(oklch.alpha * 1000) / 1000 }
}

function toPaints(color: Record<Theme, Oklch>): Record<Theme, Paint> {
  return { light: toPaint(color.light), dark: toPaint(color.dark) }
}

function toFigmaName(name: string) {
  return name.replace(/^(color|gray|shadow|text|tracking|radius|spacing)-/, "$1/")
}

function readPixels(value: string) {
  return Number.parseFloat(value) * (value.endsWith("rem") ? REM : 1)
}

function readShadowLayers(
  css: string,
  name: string,
  declarations: Map<string, Declaration>,
): ShadowLayer[] {
  const value = declarations.get(name)?.value ?? ""

  return splitTopLevel(value).flatMap(layer => {
    const nested = layer.match(/^var\(--(shadow-[a-z0-9-]+)\)$/)?.[1]
    if (nested) return readShadowLayers(css, nested, declarations)

    const inset = layer.startsWith("inset ")
    const [, lengths = "", color = ""] =
      layer.replace(/^inset /, "").match(/^([-\d.px ]+?)\s+((?:var|rgb)\(.+\))$/) ?? []
    const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = lengths
      .trim()
      .split(/\s+/)
      .map(readPixels)
    const variable = color.match(/^var\(--([a-z0-9-]+)\)$/)?.[1]
    if (variable) {
      return [
        {
          offsetX,
          offsetY,
          blur,
          spread,
          ...(inset && { inset }),
          variable: toFigmaName(variable),
          ...toPaints(readToken(css, variable)),
        },
      ]
    }

    const [red = 0, green = 0, blue = 0, alpha = "100%"] =
      color.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+%)\)$/)?.slice(1) ?? []
    const rgb = [red, green, blue].map(channel => Number(channel) / 255) as Rgb
    const paint = { hex: formatHex(rgb), alpha: Number.parseFloat(alpha) / 100 }
    return [{ offsetX, offsetY, blur, spread, ...(inset && { inset }), light: paint, dark: paint }]
  })
}

/** A line height in pixels: a length, a multiplier, a `calc(a / b)` multiplier or a `var()`. */
function readLineHeight(value: string, size: number, declarations: Map<string, Declaration>) {
  const alias = value.match(/^var\(--([a-z0-9-]+)\)$/)?.[1]
  if (alias) return readLineHeight(declarations.get(alias)?.value ?? "", size, declarations)

  const ratio = value.match(/^calc\(([\d.]+) \/ ([\d.]+)\)$/)
  if (ratio?.[1] && ratio[2]) return Math.round(size * (Number(ratio[1]) / Number(ratio[2])))
  if (/(px|rem)$/.test(value)) return readPixels(value)
  return Math.round(size * Number(value) * 100) / 100
}

function readText(name: string, declarations: Map<string, Declaration>): TextToken {
  const size = readPixels(declarations.get(`text-${name}`)?.value ?? "")
  const lineHeight = declarations.get(`text-${name}--line-height`)?.value ?? ""
  return {
    name: `text/${name}`,
    css: `var(--text-${name})`,
    size,
    lineHeight: readLineHeight(lineHeight, size, declarations),
  }
}

function readFamily(value = "") {
  return (
    value
      .split(",")[0]
      ?.replaceAll('"', "")
      .replace(/ Variable$/, "") ?? ""
  )
}

export function readDesignTokens(css: string, tailwindTheme: string): DesignTokens {
  const declarations = readDeclarations(css)
  const tailwind = readDeclarations(tailwindTheme)
  const names = [...declarations.keys()]

  const colorNames = readColorNames(css)
  const colors = colorNames.map(name => {
    const { value, description } = declarations.get(name) ?? { value: "" }
    const target = value.match(/^var\(--([a-z0-9-]+)\)$/)?.[1]
    return {
      name: toFigmaName(name),
      css: `var(--${name})`,
      ...(description && { description }),
      ...(target && colorNames.includes(target) && { alias: toFigmaName(target) }),
      ...toPaints(readToken(css, name)),
    }
  })

  const shadows = names
    .filter(name => name.startsWith("shadow-"))
    .map(name => {
      const description = declarations.get(name)?.description
      return {
        name: toFigmaName(name),
        css: `var(--${name})`,
        ...(description && { description }),
        layers: readShadowLayers(css, name, declarations),
      }
    })

  const customText = names
    .filter(name => /^text-[a-z0-9]+$/.test(name))
    .map(name => name.replace(/^text-/, ""))
  const allText = new Map([...tailwind, ...declarations])

  const spacingBase = readPixels(tailwind.get("spacing")?.value ?? "")

  return {
    fonts: {
      sans: readFamily(declarations.get("font-sans")?.value),
      mono: readFamily(declarations.get("font-mono")?.value),
    },
    colors,
    shadows,
    text: [...TAILWIND_TEXT, ...customText].map(name => readText(name, allText)),
    tracking: names
      .filter(name => name.startsWith("tracking-"))
      .map(name => ({
        name: toFigmaName(name),
        css: `var(--${name})`,
        value: Number.parseFloat(declarations.get(name)?.value ?? ""),
      })),
    radius: [
      ...RADIUS_STEPS.map(step => ({
        name: `radius/${step}`,
        css: `var(--radius-${step})`,
        value: readPixels(
          (declarations.get(`radius-${step}`) ?? tailwind.get(`radius-${step}`))?.value ?? "",
        ),
      })),
      { name: "radius/full", css: "calc(infinity * 1px)", value: 9999 },
    ],
    spacing: [
      ...SPACING_STEPS.map(step => ({
        name: `spacing/${String(step).replace(".", "-")}`,
        css: `--spacing(${step})`,
        value: step * spacingBase,
      })),
      ...names
        .filter(name => name.startsWith("spacing-"))
        .map(name => ({
          name: toFigmaName(name),
          css: `var(--${name})`,
          value: readPixels(declarations.get(name)?.value ?? ""),
        })),
    ],
  }
}
