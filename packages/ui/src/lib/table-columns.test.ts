import { describe, expect, test } from "bun:test"
import {
  figureColumn,
  labelColumn,
  labelShareColumn,
  nameColumn,
  shareColumn,
} from "./table-columns"

describe("figureColumn", () => {
  test("grows past its floor to fit the widest cell", () => {
    expect(figureColumn("5rem")).toBe("minmax(5rem,max-content)")
  })
})

describe("labelColumn", () => {
  test("fits its content up to the cap", () => {
    expect(labelColumn("9rem")).toBe("fit-content(9rem)")
  })

  test("caps at 12rem by default", () => {
    expect(labelColumn()).toBe("fit-content(12rem)")
  })
})

describe("shareColumn", () => {
  test("fits its widest cell and takes a share of the spare width", () => {
    expect(shareColumn()).toBe("minmax(max-content,1fr)")
    expect(shareColumn(2)).toBe("minmax(max-content,2fr)")
  })
})

describe("labelShareColumn", () => {
  test("holds its floor and takes a share of the spare width", () => {
    expect(labelShareColumn("8rem")).toBe("minmax(8rem,1fr)")
    expect(labelShareColumn("6rem", 2)).toBe("minmax(6rem,2fr)")
  })
})

describe("nameColumn", () => {
  test("takes three shares of the spare width by default", () => {
    expect(nameColumn()).toBe("minmax(0,3fr)")
    expect(nameColumn(4)).toBe("minmax(0,4fr)")
  })
})
