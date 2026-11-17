import { describe, expect, test } from "bun:test"
import { cn, variants } from "./variants"

describe("cn", () => {
  test("keeps a theme text size beside a text colour", () => {
    for (const size of ["text-2xs", "text-control", "text-copy", "text-figure"]) {
      expect(cn(size, "text-ink-muted")).toBe(`${size} text-ink-muted`)
    }
  })

  test("lets a later theme text size replace an earlier one", () => {
    expect(cn("text-control", "text-copy")).toBe("text-copy")
    expect(cn("text-xs", "text-2xs")).toBe("text-2xs")
  })
})

describe("variants", () => {
  test("keeps a theme text size beside a variant's colour", () => {
    const label = variants({
      base: "text-control",
      variants: { tone: { muted: "text-ink-muted" } },
    })
    expect(label({ tone: "muted" })).toBe("text-control text-ink-muted")
  })

  test("lets a caller's text size replace the base one", () => {
    const field = variants({ base: "text-control text-ink" })
    expect(field({ className: "text-copy" })).toBe("text-ink text-copy")
  })
})
