import { describe, expect, test } from "bun:test"
import { FormattedNumber } from "./formatted-number"

// Memoised, so the function it wraps is what renders the text.
const render = FormattedNumber.type

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

describe("FormattedNumber", () => {
  test("formats with the given format, prefix and suffix", () => {
    expect(render({ value: 0.87, format: percent })).toBe("87%")
    expect(render({ value: 38, suffix: "s" })).toBe("38s")
    expect(render({ value: 5, prefix: "~" })).toBe("~5")
  })

  test("prints the plain digits without a format", () => {
    expect(render({ value: 1234 })).toBe("1234")
  })

  test("passes strings through", () => {
    expect(render({ value: "—" })).toBe("—")
  })
})
