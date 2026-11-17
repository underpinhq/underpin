/* global figma, TOKENS, DESCRIPTIONS, CHECKSUM */

// Runs inside Figma through the MCP `use_figma` tool, never in Node: `bun run figma:sync` prints
// this file behind the token payload it reads. It makes the Dirstack UI library's variables,
// effect styles and text styles match `src/tokens.json`. It writes only what differs, and returns
// what it changed.

const COLOR_COLLECTION = "Color"
const SCALE_COLLECTION = "Scale"

// Text styles: the Figma name, the type step, the weight, an optional tracking token, and a line
// height that overrides the step's own (`tight` is Tailwind's 1.25). `optical` is tracking in
// percent for Figma alone: the app sets headings from 20px up in Inter's Display cut through the
// optical-size axis, which Figma's Inter lacks, so those styles tighten by Inter's own tracking
// curve (-0.0223 + 0.185 × e^(-0.1745 × size), in em) to look as set.
const TEXT_STYLES = [
  { name: "heading/h1", step: "4xl", weight: "Semi Bold", optical: -2.2 },
  { name: "heading/h2", step: "3xl", weight: "Semi Bold", optical: -2.1 },
  { name: "heading/h3", step: "2xl", weight: "Medium", optical: -1.9 },
  { name: "heading/h4", step: "xl", weight: "Medium", optical: -1.7 },
  { name: "heading/h5", step: "base", weight: "Medium", tracking: "micro" },
  { name: "heading/h6", step: "sm", weight: "Medium" },
  { name: "text/sm", step: "sm", weight: "Regular" },
  { name: "text/copy", step: "copy", weight: "Regular" },
  { name: "text/control", step: "control", weight: "Regular" },
  { name: "text/control-medium", step: "control", weight: "Medium" },
  { name: "text/xs", step: "xs", weight: "Regular" },
  { name: "text/xs-medium", step: "xs", weight: "Medium" },
  { name: "text/2xs", step: "2xs", weight: "Regular" },
  { name: "text/2xs-medium", step: "2xs", weight: "Medium" },
  { name: "text/figure", step: "figure", weight: "Semi Bold", tracking: "figure" },
  { name: "badge/sm", step: "2xs", weight: "Medium" },
  { name: "badge/md", step: "xs", weight: "Medium" },
  { name: "badge/lg", step: "sm", weight: "Medium" },
  { name: "mono/xs", step: "xs", weight: "Regular", mono: true },
]

const changes = []

/** FNV-1a over the payload: an agent copies the script by hand, and a typo must stop the run. */
function hash(text) {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value.toString(16)
}

const checksum = hash(JSON.stringify([TOKENS, DESCRIPTIONS]))
if (checksum !== CHECKSUM) throw new Error(`Payload checksum ${checksum} is not ${CHECKSUM}`)

function toRgba(paint) {
  const value = Number.parseInt(paint.hex.slice(1), 16)
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
    a: paint.alpha,
  }
}

function getScopes(name) {
  if (name.startsWith("gray/")) return []
  if (name.startsWith("color/chart-")) return ["ALL_FILLS", "STROKE_COLOR"]
  if (name === "color/focus") return ["STROKE_COLOR", "EFFECT_COLOR"]
  if (name.startsWith("color/drop")) return ["EFFECT_COLOR"]
  if (/^color\/(edge|[a-z]+-edge)/.test(name)) return ["SHAPE_FILL", "STROKE_COLOR", "EFFECT_COLOR"]
  if (/^color\/ink|-(ink|on)$/.test(name)) return ["SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"]
  if (/^color\/(canvas|surface|overlay|fill|scrim)|-subtle$/.test(name)) {
    return ["FRAME_FILL", "SHAPE_FILL"]
  }
  return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"]
}

/** JSON with every number at three decimals, so Figma's float noise compares equal. */
function serialize(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "number" ? Math.round(item * 1000) / 1000 : item,
  )
}

function sortNames(list) {
  return [...list].sort((left, right) => left.localeCompare(right))
}

function sameList(first, second) {
  return JSON.stringify(sortNames(first)) === JSON.stringify(sortNames(second))
}

const collections = await figma.variables.getLocalVariableCollectionsAsync()
let colorCollection = collections.find(collection => collection.name === COLOR_COLLECTION)
if (!colorCollection) {
  colorCollection = figma.variables.createVariableCollection(COLOR_COLLECTION)
  changes.push(`collection ${COLOR_COLLECTION} created`)
}
const [lightMode, darkMode] = ["Light", "Dark"].map((name, index) => {
  const mode = colorCollection.modes[index]
  if (mode) {
    if (mode.name !== name) colorCollection.renameMode(mode.modeId, name)
    return mode.modeId
  }
  return colorCollection.addMode(name)
})

let scaleCollection = collections.find(collection => collection.name === SCALE_COLLECTION)
if (!scaleCollection) {
  scaleCollection = figma.variables.createVariableCollection(SCALE_COLLECTION)
  changes.push(`collection ${SCALE_COLLECTION} created`)
}
const scaleMode = scaleCollection.modes[0].modeId
if (scaleCollection.modes[0].name !== "Value") scaleCollection.renameMode(scaleMode, "Value")

const variables = await figma.variables.getLocalVariablesAsync()
const kept = new Set()

function findVariable(name, collection) {
  return variables.find(
    variable => variable.variableCollectionId === collection.id && variable.name === name,
  )
}

function upsertVariable(name, type, collection) {
  let variable = findVariable(name, collection)
  if (!variable) {
    variable = figma.variables.createVariable(name, collection, type)
    variables.push(variable)
    changes.push(`variable ${name} created`)
  }
  kept.add(variable.id)
  return variable
}

function setValue(variable, modeId, value) {
  const current = variable.valuesByMode[modeId]
  if (serialize(current) === serialize(value)) return
  variable.setValueForMode(modeId, value)
  changes.push(`value ${variable.name}`)
}

function setMeta(variable, { css, description, scopes, hidden = false }) {
  if (variable.codeSyntax.WEB !== css) variable.setVariableCodeSyntax("WEB", css)
  if ((variable.description ?? "") !== (description ?? "")) variable.description = description ?? ""
  if (!sameList(variable.scopes, scopes)) variable.scopes = scopes
  if (variable.hiddenFromPublishing !== hidden) variable.hiddenFromPublishing = hidden
}

// Gray steps first: the colour tokens point at them.
const colors = [
  ...TOKENS.colors.filter(token => token.name.startsWith("gray/")),
  ...TOKENS.colors.filter(token => !token.name.startsWith("gray/")),
]
const colorVariables = new Map()
for (const token of colors) {
  const variable = upsertVariable(token.name, "COLOR", colorCollection)
  colorVariables.set(token.name, variable)
  for (const [modeId, theme] of [
    [lightMode, "light"],
    [darkMode, "dark"],
  ]) {
    const target = token.alias && colorVariables.get(token.alias)
    setValue(
      variable,
      modeId,
      target ? figma.variables.createVariableAlias(target) : toRgba(token[theme]),
    )
  }
  setMeta(variable, {
    css: token.css,
    description: DESCRIPTIONS[token.description],
    scopes: getScopes(token.name),
    hidden: token.name.startsWith("gray/"),
  })
}

for (const [group, scopes] of [
  ["radius", ["CORNER_RADIUS"]],
  ["spacing", ["GAP", "WIDTH_HEIGHT"]],
]) {
  for (const token of TOKENS[group]) {
    const variable = upsertVariable(token.name, "FLOAT", scaleCollection)
    setValue(variable, scaleMode, token.value)
    setMeta(variable, { css: token.css, scopes })
  }
}

// Anything left in the two collections has no token in code.
for (const variable of variables) {
  const owned = [colorCollection.id, scaleCollection.id].includes(variable.variableCollectionId)
  if (!owned || kept.has(variable.id)) continue
  changes.push(`variable ${variable.name} deleted`)
  variable.remove()
}

const effectStyles = await figma.getLocalEffectStylesAsync()
for (const token of TOKENS.shadows) {
  let style = effectStyles.find(effectStyle => effectStyle.name === token.name)
  if (!style) {
    style = figma.createEffectStyle()
    style.name = token.name
    changes.push(`effect style ${token.name} created`)
  }
  const effects = token.layers.map(layer => {
    const effect = {
      type: layer.inset ? "INNER_SHADOW" : "DROP_SHADOW",
      color: toRgba(layer.light),
      offset: { x: layer.offsetX, y: layer.offsetY },
      radius: layer.blur,
      spread: layer.spread,
      visible: true,
      blendMode: "NORMAL",
      ...(!layer.inset && { showShadowBehindNode: false }),
    }
    const variable = layer.variable && colorVariables.get(layer.variable)
    return variable ? figma.variables.setBoundVariableForEffect(effect, "color", variable) : effect
  })
  const current = style.effects.map(effect => ({
    ...effect,
    boundVariables: effect.boundVariables?.color?.id,
  }))
  const next = effects.map(effect => ({
    ...effect,
    boundVariables: effect.boundVariables?.color?.id,
  }))
  if (serialize(current) !== serialize(next)) {
    style.effects = effects
    changes.push(`effect style ${token.name} layers`)
  }
  const description = DESCRIPTIONS[token.description] ?? ""
  if (style.description !== description) style.description = description
}

// A shadow style left over has no token in code. Move every node off it first: a deleted style
// leaves its nodes with a copy that no sync can reach.
const shadowNames = new Set(TOKENS.shadows.map(token => token.name))
for (const style of effectStyles) {
  if (!style.name.startsWith("shadow/") || shadowNames.has(style.name)) continue
  changes.push(`effect style ${style.name} deleted`)
  style.remove()
}

const textStyles = await figma.getLocalTextStylesAsync()
const steps = new Map(TOKENS.text.map(step => [step.name.replace("text/", ""), step]))
const tracking = new Map(TOKENS.tracking.map(token => [token.name.replace("tracking/", ""), token]))
for (const spec of TEXT_STYLES) {
  let style = textStyles.find(textStyle => textStyle.name === spec.name)
  if (!style) {
    style = figma.createTextStyle()
    style.name = spec.name
    changes.push(`text style ${spec.name} created`)
  }
  const step = steps.get(spec.step)
  const fontName = { family: spec.mono ? TOKENS.fonts.mono : TOKENS.fonts.sans, style: spec.weight }
  await figma.loadFontAsync(fontName)
  const lineHeight =
    spec.leading === "tight"
      ? { unit: "PIXELS", value: step.size * 1.25 }
      : spec.step === "figure"
        ? { unit: "PERCENT", value: Math.round((step.lineHeight / step.size) * 100) }
        : { unit: "PIXELS", value: step.lineHeight }
  const letterSpacing = {
    unit: "PERCENT",
    value: spec.optical ?? (tracking.get(spec.tracking)?.value ?? 0) * 100,
  }
  const next = { fontName, fontSize: step.size, lineHeight, letterSpacing }
  for (const [key, value] of Object.entries(next)) {
    // Figma adds `variationSettings` to a font it reads back, so only the name is compared.
    const current =
      key === "fontName"
        ? { family: style.fontName.family, style: style.fontName.style }
        : style[key]
    if (serialize(current) === serialize(value)) continue
    style[key] = value
    changes.push(`text style ${spec.name} ${key}`)
  }
  const description = `${step.css.replace(/^var\(--(.+)\)$/, "$1")} ${spec.weight.toLowerCase()}`
  if (style.description === "") style.description = description
}

return { changes }
