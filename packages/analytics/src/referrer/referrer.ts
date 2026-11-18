import { isHostname, isWithinDomain, normalizeHostname } from "@underpin/utils/http"

/**
 * Referrer classification: a referrer dataset the consumer supplies (Snowplow's referer-parser,
 * see `@underpin/analytics/referrer-dataset`) plus a hand-maintained layer, folded into a canonical source
 * name and a GA4-style default channel.
 */

export type Medium = "search" | "social" | "email" | "paid" | "chatbot" | "unknown"

/** A source name and its medium. */
export type ReferrerEntry = [source: string, medium: Medium]

/** Source names and mediums keyed by lowercase host, such as `{ "google.com": ["Google", "search"] }`. */
export type ReferrerDataset = Record<string, ReferrerEntry>

export type Channel =
  | "Direct"
  | "Organic Search"
  | "Paid Search"
  | "Organic Social"
  | "Paid Social"
  | "Email"
  | "Referral"
  | "Affiliate"
  | "Display"
  | "AI"
  | "Other"

/** The campaign parameters and ad click ids of a landing URL. */
export interface Attribution {
  utm_source?: string
  utm_medium?: string
  gclid?: string
  gclsrc?: string
  wbraid?: string
  gbraid?: string
  msclkid?: string
  yclid?: string
  fbclid?: string
  igshid?: string
  ttclid?: string
  li_fat_id?: string
  twclid?: string
}

/** The campaign parameters and the raw `Referer` of a visit. */
export interface ReferrerInput extends Attribution {
  referrer?: string
}

export interface ReferrerClassification {
  /** The canonical name (Google, Hacker News), the raw host when unknown, else `utm_source`, or "" for Direct. */
  source: string
  channel: Channel
}

export interface ResolvedReferrer extends ReferrerClassification {
  /** The referrer host without "www.", or "" for a self-referral, a pass-through host or none. */
  domain: string
}

/** The hosts a site counts as its own. */
export interface SiteHostnames {
  domain: string
  /** Counted besides the domain: an exact name, or `*.example.com` as the domain counts. */
  extraHostnames?: string[]
}

export interface ReferrerClassifierOptions {
  /** Entries checked before the dataset. Defaults to {@link REFERRER_OVERRIDES}. */
  overrides?: ReferrerDataset
  /** Source names to display differently. Defaults to {@link REFERRER_RENAMES}. */
  renames?: Record<string, string>
  /** Hosts that hand a visitor back, which fold to Direct. Defaults to {@link PASS_THROUGH_HOSTS}. */
  passThroughHosts?: ReadonlySet<string>
}

export interface ReferrerClassifier {
  /**
   * Classifies a visit from its referrer host, already filtered for self-referrals, and its
   * campaign parameters.
   */
  classifyReferrer(host: string, attribution?: Attribution): ReferrerClassification
  /**
   * The referrer fields of a stored row, from the raw `Referer` and the campaign parameters. A
   * self-referral (a host the site counts) and a return from a sign-in or checkout host fold to
   * Direct.
   */
  resolveReferrer(attribution: ReferrerInput, site?: SiteHostnames): ResolvedReferrer
}

// Layered on top of the dataset: platforms it lacks or lists incompletely, such as AI
// assistants, X and developer communities. Vendor lists lag behind AI assistants, and GA4 has
// no Claude or Perplexity.
export const REFERRER_OVERRIDES: ReferrerDataset = {
  "x.com": ["X", "social"],
  "bsky.app": ["Bluesky", "social"],
  "mastodon.social": ["Mastodon", "social"],
  "mastodon.online": ["Mastodon", "social"],
  "threads.net": ["Threads", "social"],
  "producthunt.com": ["Product Hunt", "social"],
  "lobste.rs": ["Lobsters", "social"],
  "indiehackers.com": ["Indie Hackers", "social"],
  "dev.to": ["Dev.to", "social"],
  "medium.com": ["Medium", "social"],
  "substack.com": ["Substack", "social"],
  "lemmy.world": ["Lemmy", "social"],
  "flipboard.com": ["Flipboard", "social"],
  "twitch.tv": ["Twitch", "social"],
  "discord.com": ["Discord", "social"],
  "discordapp.com": ["Discord", "social"],
  "slack.com": ["Slack", "social"],
  "teams.microsoft.com": ["Microsoft Teams", "social"],
  "t.me": ["Telegram", "social"],
  "telegram.me": ["Telegram", "social"],
  "wa.me": ["WhatsApp", "social"],
  "whatsapp.com": ["WhatsApp", "social"],
  "claude.ai": ["Claude", "chatbot"],
  "perplexity.ai": ["Perplexity", "chatbot"],
  "pplx.ai": ["Perplexity", "chatbot"],
  "gemini.google.com": ["Gemini", "chatbot"],
  "bard.google.com": ["Gemini", "chatbot"],
  "copilot.microsoft.com": ["Copilot", "chatbot"],
  "copilot.com": ["Copilot", "chatbot"],
  "copilot.cloud.microsoft": ["Copilot", "chatbot"],
  "deepseek.com": ["DeepSeek", "chatbot"],
  "grok.com": ["Grok", "chatbot"],
  "x.ai": ["Grok", "chatbot"],
  "you.com": ["You.com", "chatbot"],
  "phind.com": ["Phind", "chatbot"],
  "chat.mistral.ai": ["Mistral", "chatbot"],
  "notebooklm.google.com": ["NotebookLM", "chatbot"],
  "aistudio.google.com": ["Google AI Studio", "chatbot"],
  "kimi.com": ["Kimi", "chatbot"],
  "duck.ai": ["Duck.ai", "chatbot"],
  "chat.qwen.ai": ["Qwen", "chatbot"],
  "t3.chat": ["T3 Chat", "chatbot"],
  "lumo.proton.me": ["Lumo", "chatbot"],
}

// The subdomains of a google.<tld> that are search.
const GOOGLE_SEARCH_SUBDOMAINS = new Set(["images", "news", "video", "lens", "scholar", "books"])

// Hosts a visitor returns from mid-visit rather than arrives from: sign-in providers and
// checkout pages hand the visitor back to the site that sent them. They fold to Direct like a
// self-referral, so the session keeps the source it entered with. Matched on the host and its
// parents; a path cannot tell a sign-in page apart, because browsers cut a cross-origin
// referrer to its origin.
export const PASS_THROUGH_HOSTS: ReadonlySet<string> = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "login.microsoftonline.com",
  "login.live.com",
  "checkout.stripe.com",
  "billing.stripe.com",
  "buy.stripe.com",
  "invoice.stripe.com",
  "hooks.stripe.com",
  "paypal.com",
  "polar.sh",
  "checkout.paddle.com",
  "buy.paddle.com",
  "pay.paddle.io",
  "lemonsqueezy.com",
])

// Ad click ids: the network each names and the channel it makes the visit. An ad click often
// arrives with no Referer, so with neither a referrer nor a utm_source the id names the
// source. `fbclid` and `igshid` ride on organic shares too, so they name the platform
// without making the visit paid.
const CLICK_IDS: [param: keyof Attribution, source: ReferrerEntry, channel?: Channel][] = [
  ["gclid", ["Google", "search"], "Paid Search"],
  ["gclsrc", ["Google", "search"], "Paid Search"],
  ["wbraid", ["Google", "search"], "Paid Search"],
  ["gbraid", ["Google", "search"], "Paid Search"],
  ["msclkid", ["Bing", "search"], "Paid Search"],
  ["yclid", ["Yandex", "search"], "Paid Search"],
  ["ttclid", ["TikTok", "social"], "Paid Social"],
  ["li_fat_id", ["LinkedIn", "social"], "Paid Social"],
  ["twclid", ["X", "social"], "Paid Social"],
  ["fbclid", ["Facebook", "social"]],
  ["igshid", ["Instagram", "social"]],
]

// Dataset names displayed differently: Twitter is now X, and ".ai" suffixes are dropped.
export const REFERRER_RENAMES: Record<string, string> = {
  Twitter: "X",
  "Claude.ai": "Claude",
  "Perplexity.ai": "Perplexity",
  "Google Gemini": "Gemini",
  "Microsoft Copilot": "Copilot",
  "Mistral.ai": "Mistral",
  "META.ai": "Meta AI",
}

// GA4 default channel grouping rules for utm_medium.
const PAID_MEDIUM = /^(.*cp.*|ppc|retargeting|paid.*)$/
const SOCIAL_MEDIUM = /^(social|social-network|social-media|sm|social network|social media)$/
const EMAIL_MEDIUM = /^e[-_ ]?mail$/
const DISPLAY_MEDIUM = /^(display|cpm|banner)$/
// GA4 tags its own AI Assistant channel `ai-assistant`; the rest are common hand-written forms.
const AI_MEDIUM = /^(ai|ai-assistant|ai-chat|ai-search|chatbot|llm)$/

// An own entry only, so a host such as `constructor` never reads the prototype.
function ownEntry(dataset: ReferrerDataset, key: string): ReferrerEntry | undefined {
  return Object.hasOwn(dataset, key) ? dataset[key] : undefined
}

function nameKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** The host and each parent domain: `m.facebook.com`, then `facebook.com`. */
function domainLabels(host: string): string[] {
  const parts = host.split(".")
  return parts.slice(0, -1).map((_, index) => parts.slice(index).join("."))
}

function matchesEntry(hostname: string, entry: string) {
  return entry.startsWith("*.")
    ? isWithinDomain(hostname, entry)
    : normalizeHostname(hostname) === entry
}

function isHostnameAllowed(hostname: string, site: SiteHostnames): boolean {
  return (
    isWithinDomain(hostname, site.domain) ||
    (site.extraHostnames?.some(entry => matchesEntry(hostname, entry)) ?? false)
  )
}

/** Lowercased hostname, or "" for unparsable input. */
function parseHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ""
  }
}

function stripWww(host: string): string {
  return host.replace(/^www\./, "")
}

/**
 * Reads the host of a referrer URL.
 * @param url - The `Referer` header or `document.referrer`.
 * @returns The lowercased host without a leading "www.", or "" for unparsable input.
 */
export function referrerHost(url: string): string {
  return stripWww(parseHost(url))
}

// A tag written as a URL (`?ref=https://selfh.st/`) names the site the link sat on, so its host
// is the source. Any other value is kept as written.
function readSourceTag(value: string): string {
  // `||`: an unparsable URL reads as "" and keeps the tag as written.
  // oxlint-disable-next-line typescript/prefer-nullish-coalescing
  return value.includes("://") ? referrerHost(value) || value : value
}

function resolveChannel(
  medium: Medium | null,
  utmMedium: string,
  attribution: Attribution,
): Channel {
  // A paid click id is an unambiguous paid signal, whatever the tags say.
  const paid = CLICK_IDS.find(([param, , channel]) => channel && attribution[param])?.[2]
  if (paid) return paid

  // Display first: "cpm" would otherwise be swallowed by the paid regex (.*cp.*).
  if (DISPLAY_MEDIUM.test(utmMedium)) return "Display"
  if (PAID_MEDIUM.test(utmMedium)) return medium === "social" ? "Paid Social" : "Paid Search"
  if (EMAIL_MEDIUM.test(utmMedium)) return "Email"
  if (utmMedium === "affiliate") return "Affiliate"
  if (SOCIAL_MEDIUM.test(utmMedium)) return "Organic Social"
  if (utmMedium === "organic") return "Organic Search"
  if (utmMedium === "referral") return "Referral"
  if (AI_MEDIUM.test(utmMedium)) return "AI"

  switch (medium) {
    case "search":
      return "Organic Search"
    case "social":
      return "Organic Social"
    case "email":
      return "Email"
    case "chatbot":
      return "AI"
    // Ad networks (Doubleclick, AdRoll, …).
    case "paid":
      return "Display"
    case "unknown":
      return "Referral"
  }

  return utmMedium || attribution.utm_source ? "Other" : "Direct"
}

/**
 * Builds a referrer classifier over a dataset you supply. The package bundles none: Snowplow's
 * referer-parser list is GPL-3.0, so download it with `underpin-referers` or
 * `@underpin/analytics/referrer-dataset` and commit the result in your own repository.
 * @param dataset - Source names and mediums by host.
 * @param options - Replacements for the built-in overrides, renames and pass-through hosts.
 * @returns The classifier.
 * @example
 * import dataset from "./data/referers.json" with { type: "json" }
 * const { resolveReferrer } = createReferrerClassifier(dataset as ReferrerDataset)
 * resolveReferrer({ referrer: "https://news.ycombinator.com/" }) // { domain: "news.ycombinator.com", source: "Hacker News", channel: "Organic Social" }
 */
export function createReferrerClassifier(
  dataset: ReferrerDataset,
  options: ReferrerClassifierOptions = {},
): ReferrerClassifier {
  const {
    overrides = REFERRER_OVERRIDES,
    renames = REFERRER_RENAMES,
    passThroughHosts = PASS_THROUGH_HOSTS,
  } = options

  // Canonical names by a loose key ("producthunt", "hackernews"), so a utm_source that names
  // a platform folds onto the same row as a plain referral from it.
  const byName = new Map<string, ReferrerEntry>()
  for (const [name, medium] of [...Object.values(dataset), ...Object.values(overrides)]) {
    const canonical = renames[name] ?? name
    byName.set(nameKey(canonical), [canonical, medium])
    byName.set(nameKey(name), [canonical, medium])
  }

  // A Google host that is neither search nor ads (Docs, Drive, Search Console) keeps its own name
  // rather than reading as Google. The dataset names a few of them "Google" outright, and lists
  // every google.<tld> as search, so the walk up would hand that to all the rest.
  function isGoogleProduct(host: string, key: string, [name, medium]: ReferrerEntry) {
    if (name !== "Google") return false
    if (medium === "unknown") return true
    if (medium !== "search" || !key.startsWith("google.") || host === key) return false
    return !GOOGLE_SEARCH_SUBDOMAINS.has(host.slice(0, -key.length - 1))
  }

  // Walk up the labels (m.facebook.com → facebook.com) like referer-parser does. Matching is
  // host-only: the dataset's path-qualified entries (google.com/products) are treated as plain
  // hosts.
  function lookup(host: string): ReferrerEntry | undefined {
    for (const key of domainLabels(host)) {
      const hit = ownEntry(overrides, key) ?? ownEntry(dataset, key)
      if (!hit) continue
      if (isGoogleProduct(host, key, hit)) return
      return [renames[hit[0]] ?? hit[0], hit[1]]
    }
  }

  // utm_source is free text: a host ("news.ycombinator.com"), a bare domain ("producthunt"),
  // or a name ("twitter", "Product Hunt"). Try each reading before keeping it raw.
  function lookupSource(utmSource: string): ReferrerEntry | undefined {
    if (!utmSource) return
    return lookup(utmSource) ?? lookup(`${utmSource}.com`) ?? byName.get(nameKey(utmSource))
  }

  // The source of a visit with no referrer: its utm_source, else an assistant that names itself
  // only in utm_medium (`utm_medium=claude.ai`), else an ad click id.
  function lookupWithoutReferrer(utmSource: string, utmMedium: string, attribution: Attribution) {
    if (utmSource) return lookupSource(utmSource)
    const assistant = lookupSource(utmMedium)
    if (assistant?.[1] === "chatbot") return assistant
    return CLICK_IDS.find(([param]) => attribution[param])?.[1]
  }

  function classifyReferrer(host: string, attribution: Attribution = {}): ReferrerClassification {
    const utmSource = readSourceTag((attribution.utm_source ?? "").toLowerCase())
    const utmMedium = (attribution.utm_medium ?? "").toLowerCase()
    const hit = host ? lookup(host) : lookupWithoutReferrer(utmSource, utmMedium, attribution)
    // A utm_source that is itself a hostname names the site the link sat on, so a visit that
    // arrives without a Referer header reads as the same referral as one that arrives with it.
    const medium = hit?.[1] ?? (host || isHostname(utmSource) ? "unknown" : null)
    const source = hit?.[0] ?? host

    return {
      // `||`, because a hit with no name and a host of "" both have to fall through to the tag.
      // oxlint-disable-next-line typescript/prefer-nullish-coalescing
      source: source || utmSource,
      channel: resolveChannel(medium, utmMedium, attribution),
    }
  }

  function resolveReferrer(attribution: ReferrerInput, site?: SiteHostnames): ResolvedReferrer {
    // The site is matched on the full host: a site registered as `www.example.com` counts
    // `www.example.com`, which the stored form below drops the `www.` from.
    const fullHost = attribution.referrer ? parseHost(attribution.referrer) : ""
    const host = stripWww(fullHost)
    const isSelfReferral =
      site !== undefined && fullHost !== "" && isHostnameAllowed(fullHost, site)
    const isPassThrough = domainLabels(host).some(key => passThroughHosts.has(key))
    const domain = isSelfReferral || isPassThrough ? "" : host

    return { domain, ...classifyReferrer(domain, attribution) }
  }

  return { classifyReferrer, resolveReferrer }
}
