import { describe, expect, test } from "bun:test"
import storedJson from "./fixtures/highseat-referrers.json" with { type: "json" }
import dataset from "./fixtures/referers-subset.json" with { type: "json" }
import { createReferrerClassifier, type ReferrerDataset } from "./referrer.js"

interface StoredReferrer {
  domain: string
  utm_source?: string
  utm_medium?: string
  source: string
  channel: string
}

const stored: StoredReferrer[] = storedJson

const classifier = createReferrerClassifier(dataset as unknown as ReferrerDataset)

describe("classifyReferrer", () => {
  test.each(stored)("matches Highseat for $domain $utm_source $utm_medium", entry => {
    const attribution = {
      ...(entry.utm_source ? { utm_source: entry.utm_source } : {}),
      ...(entry.utm_medium ? { utm_medium: entry.utm_medium } : {}),
    }

    const result: { source: string; channel: string } = classifier.classifyReferrer(
      entry.domain,
      attribution,
    )

    expect(result).toEqual({ source: entry.source, channel: entry.channel })
  })

  test("keeps an unknown host as the source", () => {
    expect(createReferrerClassifier({}).classifyReferrer("blog.example.org")).toEqual({
      source: "blog.example.org",
      channel: "Referral",
    })
  })

  test("takes overrides and renames from the options", () => {
    const custom = createReferrerClassifier(
      { "old.example": ["Old Name", "social"] },
      { overrides: { "new.example": ["New", "chatbot"] }, renames: { "Old Name": "Renamed" } },
    )

    expect(custom.classifyReferrer("old.example").source).toBe("Renamed")
    expect(custom.classifyReferrer("new.example").channel).toBe("AI")
    // The built-in overrides are replaced, not merged.
    expect(custom.classifyReferrer("claude.ai").source).toBe("claude.ai")
  })

  test("reads utm_medium=mcp as AI", () => {
    expect(classifier.resolveReferrer({ utm_medium: "mcp" })).toEqual({
      domain: "",
      source: "",
      channel: "AI",
    })
    expect(classifier.resolveReferrer({ utm_source: "newsletter", utm_medium: "mcp" })).toEqual({
      domain: "",
      source: "newsletter",
      channel: "AI",
    })
    expect(
      classifier.resolveReferrer({ referrer: "https://claude.ai/", utm_medium: "mcp" }),
    ).toEqual({ domain: "claude.ai", source: "Claude", channel: "AI" })
  })

  test("takes a utm_source lookup from the options and checks it last", () => {
    const seen: string[] = []
    const custom = createReferrerClassifier(dataset as unknown as ReferrerDataset, {
      findSource: utmSource => {
        seen.push(utmSource)
        return utmSource === "claude-user" ? ["Claude", "chatbot"] : undefined
      },
    })

    expect(custom.resolveReferrer({ utm_source: "Claude-User", utm_medium: "mcp" })).toEqual({
      domain: "",
      source: "Claude",
      channel: "AI",
    })
    expect(custom.resolveReferrer({ utm_source: "Claude-User" })).toMatchObject({
      source: "Claude",
      channel: "AI",
    })
    // An assistant named only in utm_medium goes through the same lookup.
    expect(custom.resolveReferrer({ utm_medium: "claude-user" })).toMatchObject({
      source: "Claude",
      channel: "AI",
    })

    // A tag the dataset already knows never reaches it.
    seen.length = 0
    expect(custom.resolveReferrer({ utm_source: "producthunt" }).source).toBe("Product Hunt")
    expect(seen).toEqual([])
  })

  test("takes pass-through hosts from the options", () => {
    const custom = createReferrerClassifier({}, { passThroughHosts: new Set(["auth.example"]) })

    expect(custom.resolveReferrer({ referrer: "https://login.auth.example/" })).toEqual({
      domain: "",
      source: "",
      channel: "Direct",
    })
    // The built-in pass-through hosts are replaced, not merged.
    expect(custom.resolveReferrer({ referrer: "https://checkout.stripe.com/" }).domain).toBe(
      "checkout.stripe.com",
    )
  })
})
