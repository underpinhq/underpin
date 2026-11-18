import { describe, expect, test } from "bun:test"
import { parseReferrerDataset } from "./referrer-dataset.js"

describe("parseReferrerDataset", () => {
  const yaml = `
unknown:
  Google:
    domains:
      - support.google.com
search:
  Google:
    parameters:
      - q
    domains:
      - Google.com
      - support.google.com
social:
  Hacker News:
    domains:
      - news.ycombinator.com
email:
  Gmail:
    domains: []
`

  test("flattens mediums, sources and domains, lowercased", () => {
    expect(parseReferrerDataset(yaml)).toEqual({
      "google.com": ["Google", "search"],
      "support.google.com": ["Google", "search"],
      "news.ycombinator.com": ["Hacker News", "social"],
    })
  })

  test("lets a later medium win on a duplicate domain", () => {
    expect(parseReferrerDataset(yaml)["support.google.com"]?.[1]).toBe("search")
  })

  test("skips a medium it does not know", () => {
    expect(parseReferrerDataset("video:\n  YouTube:\n    domains: [youtube.com]\n")).toEqual({})
  })

  test("skips a domain that is not a string", () => {
    const yaml = "social:\n  Example:\n    domains: [42, null, example.com]\n"

    expect(parseReferrerDataset(yaml)).toEqual({ "example.com": ["Example", "social"] })
  })

  test("stores __proto__ and constructor as own keys", () => {
    const yaml = "social:\n  Odd:\n    domains: [__proto__, constructor]\n"
    const dataset = parseReferrerDataset(yaml)

    expect(Object.getPrototypeOf(dataset)).toBe(Object.prototype)
    expect(Object.hasOwn(dataset, "__proto__")).toBe(true)
    expect(Object.entries(dataset)).toEqual([
      ["__proto__", ["Odd", "social"]],
      ["constructor", ["Odd", "social"]],
    ])
  })
})
