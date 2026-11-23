import { describe, expect, test } from "bun:test"
import { DESKTOP_WIDTH, PHONE_WIDTH, registerDom, resize } from "../test-dom"

registerDom()

/** A path's area: its first segment when that is `settings` or `admin`. */
function findArea(path: string) {
  const [first] = path.split("/").filter(Boolean)
  if (first === "settings" || first === "admin") return first
}

describe("getAreaRailTypes", () => {
  test("enters an area from a page outside every area, or from another area", async () => {
    const { getAreaRailTypes } = await import("./view-transition")
    await resize(DESKTOP_WIDTH)

    expect(getAreaRailTypes("/", "/settings", findArea)).toEqual(["area-enter"])
    expect(getAreaRailTypes("/settings/profile", "/admin", findArea)).toEqual(["area-enter"])
  })

  test("leaves an area for a page outside every area", async () => {
    const { getAreaRailTypes } = await import("./view-transition")
    await resize(DESKTOP_WIDTH)

    expect(getAreaRailTypes("/admin/users", "/", findArea)).toEqual(["area-leave"])
  })

  test("is false inside one area and outside every area, so the rail holds still", async () => {
    const { getAreaRailTypes } = await import("./view-transition")
    await resize(DESKTOP_WIDTH)

    expect(getAreaRailTypes("/settings/profile", "/settings/security", findArea)).toBe(false)
    expect(getAreaRailTypes("/", "/reports", findArea)).toBe(false)
  })

  test("is false on the first page, even one inside an area", async () => {
    const { getAreaRailTypes } = await import("./view-transition")
    await resize(DESKTOP_WIDTH)

    expect(getAreaRailTypes(undefined, "/settings", findArea)).toBe(false)
  })

  test("is false under lg, where the rail is hidden", async () => {
    const { getAreaRailTypes } = await import("./view-transition")
    await resize(PHONE_WIDTH)

    expect(getAreaRailTypes("/", "/settings", findArea)).toBe(false)
    expect(getAreaRailTypes("/settings", "/", findArea)).toBe(false)
  })

  test("is false without matchMedia, as on the server", async () => {
    const { getAreaRailTypes } = await import("./view-transition")
    await resize(DESKTOP_WIDTH)
    expect(getAreaRailTypes("/", "/settings", findArea)).toEqual(["area-enter"])

    // The server has no `matchMedia`; the descriptor puts the test DOM's back afterwards.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "matchMedia")
    Reflect.deleteProperty(globalThis, "matchMedia")

    try {
      expect(getAreaRailTypes("/", "/settings", findArea)).toBe(false)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "matchMedia", descriptor)
    }
  })
})
