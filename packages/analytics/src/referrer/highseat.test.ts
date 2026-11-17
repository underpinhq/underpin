import { test } from "bun:test"
// Highseat's own unit tests for its referrer code, run against this package. Highseat's dataset
// is the full referer-parser list, and these run on `fixtures/referers-subset.json`, the part of it
// these cases and the stored ones below reach.
import assert from "node:assert/strict"
import dataset from "./fixtures/referers-subset.json" with { type: "json" }
import {
  type Attribution,
  createReferrerClassifier,
  type ReferrerDataset,
  referrerHost,
} from "./referrer.js"

const { classifyReferrer, resolveReferrer } = createReferrerClassifier(
  dataset as unknown as ReferrerDataset,
)

function classify(url: string, attribution: Attribution = {}) {
  return classifyReferrer(referrerHost(url), attribution)
}

test("direct traffic", () => {
  assert.deepEqual(classify(""), { source: "", channel: "Direct" })
  assert.deepEqual(classify("not a url"), { source: "", channel: "Direct" })
})

test("dataset names + variant folding", () => {
  assert.deepEqual(classify("https://news.ycombinator.com/item?id=1"), {
    source: "Hacker News",
    channel: "Organic Social",
  })
  assert.equal(classify("https://t.co/abc").source, "X")
  assert.equal(classify("https://x.com/abc").source, "X")
  assert.equal(classify("https://bsky.app/profile/a").source, "Bluesky")
  assert.equal(classify("https://www.producthunt.com/posts/a").source, "Product Hunt")
  assert.equal(classify("https://m.facebook.com/").source, "Facebook")
  assert.equal(classify("https://l.facebook.com/l.php").source, "Facebook")
  assert.deepEqual(classify("https://www.google.co.uk/search?q=x"), {
    source: "Google",
    channel: "Organic Search",
  })
  assert.deepEqual(classify("https://mail.google.com/mail/u/0/"), {
    source: "Gmail",
    channel: "Email",
  })
  assert.deepEqual(classify("android-app://com.google.android.gm/"), {
    source: "Gmail",
    channel: "Email",
  })
})

test("unknown referrers keep the raw host", () => {
  assert.deepEqual(classify("https://blog.example.org/post"), {
    source: "blog.example.org",
    channel: "Referral",
  })
})

test("AI assistants", () => {
  assert.deepEqual(classify("https://chatgpt.com/"), { source: "ChatGPT", channel: "AI" })
  assert.deepEqual(classify("https://claude.ai/chat/1"), { source: "Claude", channel: "AI" })
  assert.equal(classify("https://www.perplexity.ai/").source, "Perplexity")
  assert.equal(classify("https://gemini.google.com/app").source, "Gemini")
  assert.equal(classify("https://grok.com/").source, "Grok")
  // No referrer, tagged link (ChatGPT sometimes appends utm_source=chatgpt.com).
  assert.deepEqual(classify("", { utm_source: "chatgpt.com" }), {
    source: "ChatGPT",
    channel: "AI",
  })
})

test("utm_source folds onto the platform's canonical name", () => {
  assert.equal(classify("", { utm_source: "twitter", utm_medium: "social" }).source, "X")
  assert.equal(classify("", { utm_source: "producthunt" }).source, "Product Hunt")
  assert.equal(classify("", { utm_source: "Product Hunt" }).source, "Product Hunt")
  assert.equal(classify("", { utm_source: "news.ycombinator.com" }).source, "Hacker News")
  assert.equal(classify("", { utm_source: "newsletter" }).source, "newsletter")
})

test("utm_medium + click IDs drive paid/email/affiliate channels", () => {
  assert.equal(classify("https://www.google.com/", { utm_medium: "cpc" }).channel, "Paid Search")
  assert.equal(classify("", { gclid: "abc" }).channel, "Paid Search")
  assert.equal(classify("https://www.facebook.com/", { utm_medium: "paid" }).channel, "Paid Social")
  assert.equal(classify("", { li_fat_id: "x" }).channel, "Paid Social")
  assert.equal(classify("", { utm_source: "newsletter", utm_medium: "email" }).channel, "Email")
  assert.equal(classify("", { utm_source: "newsletter", utm_medium: "email" }).source, "newsletter")
  assert.equal(classify("", { utm_medium: "affiliate" }).channel, "Affiliate")
  assert.equal(classify("", { utm_medium: "banner" }).channel, "Display")
  assert.equal(classify("", { utm_medium: "cpm" }).channel, "Display")
  assert.equal(classify("", { utm_medium: "social" }).channel, "Organic Social")
  assert.equal(classify("", { utm_medium: "podcast" }).channel, "Other")
  // A hostname in utm_source is the referring site, header or no header.
  assert.deepEqual(classify("", { utm_source: "openalternative.co", utm_medium: "footer" }), {
    source: "openalternative.co",
    channel: "Referral",
  })
  assert.equal(classify("", { utm_source: "newsletter", utm_medium: "footer" }).channel, "Other")
  // fbclid alone is not a paid signal.
  assert.equal(classify("https://l.facebook.com/", { fbclid: "x" }).channel, "Organic Social")
})

test("a site registered with www. folds its own pages to Direct", () => {
  const site = { domain: "www.example.com" }
  assert.equal(resolveReferrer({ referrer: "https://www.example.com/pricing" }, site).domain, "")
  assert.equal(
    resolveReferrer({ referrer: "https://blog.other.com/" }, site).domain,
    "blog.other.com",
  )
  assert.equal(
    resolveReferrer({ referrer: "https://www.example.com/" }, { domain: "example.com" }).domain,
    "",
  )
})

test("sign-in and checkout hosts fold to Direct", () => {
  const site = { domain: "example.com" }
  for (const referrer of [
    "https://accounts.google.com/",
    "https://appleid.apple.com/",
    "https://login.microsoftonline.com/common/oauth2",
    "https://checkout.stripe.com/c/pay/cs_live_1",
    "https://billing.stripe.com/p/session/1",
    "https://www.paypal.com/checkoutnow",
    "https://polar.sh/",
    "https://buy.polar.sh/polar_cl_1",
    "https://checkout.paddle.com/",
    "https://acme.lemonsqueezy.com/checkout",
  ]) {
    assert.deepEqual(
      resolveReferrer({ referrer }, site),
      { domain: "", source: "", channel: "Direct" },
      referrer,
    )
  }
  // The session's own tags still name it.
  assert.equal(
    resolveReferrer({ referrer: "https://checkout.stripe.com/", utm_source: "newsletter" }, site)
      .source,
    "newsletter",
  )
})

test("only Google's search hosts count as search", () => {
  assert.deepEqual(classify("https://www.google.de/"), {
    source: "Google",
    channel: "Organic Search",
  })
  assert.equal(classify("https://images.google.fr/").channel, "Organic Search")
  for (const host of [
    "docs.google.com",
    "search.google.com",
    "drive.google.com",
    "sites.google.com",
  ]) {
    assert.deepEqual(classify(`https://${host}/`), { source: host, channel: "Referral" }, host)
  }
  // Google's ad hosts keep the Google name.
  assert.deepEqual(classify("https://www.googleadservices.com/"), {
    source: "Google",
    channel: "Display",
  })
  assert.equal(classify("https://googleads.g.doubleclick.net/", { gclid: "1" }).source, "Google")
  assert.deepEqual(classify("https://notebooklm.google.com/notebook/1"), {
    source: "NotebookLM",
    channel: "AI",
  })
})

test("AI assistants the dataset lacks or misnames", () => {
  const assistants: [host: string, source: string][] = [
    ["meta.ai", "Meta AI"],
    ["poe.com", "Poe"],
    ["kimi.com", "Kimi"],
    ["duck.ai", "Duck.ai"],
    ["chat.qwen.ai", "Qwen"],
    ["chat.deepseek.com", "DeepSeek"],
    ["aistudio.google.com", "Google AI Studio"],
  ]
  for (const [host, source] of assistants) {
    assert.deepEqual(classify(`https://${host}/`), { source, channel: "AI" }, host)
  }
  // An assistant that sends no referrer and names itself only in utm_medium.
  assert.deepEqual(classify("", { utm_medium: "claude.ai" }), { source: "Claude", channel: "AI" })
  assert.deepEqual(classify("", { utm_medium: "chatgpt" }), { source: "ChatGPT", channel: "AI" })
  assert.equal(classify("", { utm_source: "somebot", utm_medium: "ai-assistant" }).channel, "AI")
})

test("a click id names the source when the browser sent no referrer", () => {
  const cases: [param: keyof Attribution, source: string, channel: string][] = [
    ["gclid", "Google", "Paid Search"],
    ["gclsrc", "Google", "Paid Search"],
    ["wbraid", "Google", "Paid Search"],
    ["gbraid", "Google", "Paid Search"],
    ["msclkid", "Bing", "Paid Search"],
    ["yclid", "Yandex", "Paid Search"],
    ["ttclid", "TikTok", "Paid Social"],
    ["li_fat_id", "LinkedIn", "Paid Social"],
    ["twclid", "X", "Paid Social"],
    ["fbclid", "Facebook", "Organic Social"],
    ["igshid", "Instagram", "Organic Social"],
  ]
  for (const [param, source, channel] of cases) {
    assert.deepEqual(classify("", { [param]: "1" }), { source, channel }, param)
  }
  // A referrer the browser sent wins, and so does a utm_source.
  assert.deepEqual(classify("https://blog.example.org/", { gclid: "1" }), {
    source: "blog.example.org",
    channel: "Paid Search",
  })
  assert.equal(classify("", { gclid: "1", utm_source: "newsletter" }).source, "newsletter")
})

test("a URL-shaped utm_source reads as its host", () => {
  assert.deepEqual(classify("", { utm_source: "https://selfh.st/" }), {
    source: "selfh.st",
    channel: "Referral",
  })
  assert.deepEqual(classify("", { utm_source: "https://www.producthunt.com/posts/a" }), {
    source: "Product Hunt",
    channel: "Organic Social",
  })
  assert.equal(classify("", { utm_source: "spring sale" }).source, "spring sale")
})
