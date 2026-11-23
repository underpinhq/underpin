import { describe, expect, test } from "bun:test"
import {
  createComboboxCreateOption,
  findComboboxCreateOption,
  isComboboxCreateOption,
  splitComboboxCreateValue,
  splitComboboxTerms,
  withComboboxCreateLabel,
} from "./combobox-create"

describe("findComboboxCreateOption", () => {
  test("offers the trimmed term nothing reads", () => {
    const option = findComboboxCreateOption("  Svelte ", ["React", "Vue"])

    expect(isComboboxCreateOption(option)).toBe(true)
    expect(option?.create).toBe("Svelte")
  })

  test("offers nothing for a blank term", () => {
    expect(findComboboxCreateOption("   ", ["React"])).toBeUndefined()
  })

  test("offers nothing when a label reads the term in another case", () => {
    expect(findComboboxCreateOption("react", ["React", "Vue"])).toBeUndefined()
  })

  test("still offers a term that is only part of a label", () => {
    expect(findComboboxCreateOption("Rea", ["React"])?.create).toBe("Rea")
  })
})

describe("splitComboboxCreateValue", () => {
  test("parts the picked items from the terms to create", () => {
    const react = { id: "1", name: "React" }
    const value = [react, createComboboxCreateOption("Svelte"), createComboboxCreateOption("Qwik")]

    expect(splitComboboxCreateValue(value)).toEqual({ items: [react], create: ["Svelte", "Qwik"] })
  })

  test("has no terms when the value holds only items", () => {
    expect(splitComboboxCreateValue(["a", "b"])).toEqual({ items: ["a", "b"], create: [] })
  })
})

describe("splitComboboxTerms", () => {
  test("splits at commas and line breaks, trimmed, blanks dropped", () => {
    expect(splitComboboxTerms("Solid, Qwik,\nVue\r\n, ,")).toEqual(["Solid", "Qwik", "Vue"])
  })

  test("keeps a single term whole", () => {
    expect(splitComboboxTerms(" Solid Start ")).toEqual(["Solid Start"])
  })
})

describe("withComboboxCreateLabel", () => {
  test("reads an item through the getter and the create option as its term", () => {
    const label = withComboboxCreateLabel((tag: { name: string }) => tag.name)

    expect(label({ name: "React" })).toBe("React")
    expect(label(createComboboxCreateOption("Svelte"))).toBe("Svelte")
  })
})

test("isComboboxCreateOption tells the create option from an item, even one with a create field", () => {
  expect(isComboboxCreateOption(createComboboxCreateOption("Svelte"))).toBe(true)
  expect(isComboboxCreateOption({ create: "Svelte" })).toBe(false)
  expect(isComboboxCreateOption({ name: "React" })).toBe(false)
  expect(isComboboxCreateOption(null)).toBe(false)
  expect(isComboboxCreateOption("Svelte")).toBe(false)
})
