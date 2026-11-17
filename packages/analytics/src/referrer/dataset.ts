import { parse } from "yaml"
import type { Medium, ReferrerDataset } from "./referrer.js"

/** Snowplow's referer-parser list (GPL-3.0), which Plausible and PostHog also use. */
export const REFERER_PARSER_URL =
  "https://raw.githubusercontent.com/snowplow-referer-parser/referer-parser/master/resources/referers.yml"

const MEDIUMS = new Set<string>(["search", "social", "email", "paid", "chatbot", "unknown"])

type SourceList = Record<string, Record<string, { domains?: string[] } | null> | null>

/**
 * Flattens referer-parser's YAML, keyed medium, then source, then domains, into one entry per
 * domain. A later medium wins on a duplicate domain: upstream lists "unknown" first, so the
 * specific mediums (search, social, email) override it.
 * @param yamlText - The contents of `referers.yml`.
 * @returns The dataset for `createReferrerClassifier`.
 */
export function parseReferrerDataset(yamlText: string): ReferrerDataset {
  const sources = (parse(yamlText) ?? {}) as SourceList
  const dataset: ReferrerDataset = {}

  for (const [medium, entries] of Object.entries(sources)) {
    if (!MEDIUMS.has(medium)) continue

    for (const [source, entry] of Object.entries(entries ?? {})) {
      for (const domain of entry?.domains ?? []) {
        dataset[domain.toLowerCase()] = [source, medium as Medium]
      }
    }
  }

  return dataset
}

/**
 * Downloads and flattens referer-parser's list. Run it from a script and commit the JSON: the
 * list is GPL-3.0, so this package cannot bundle it, and a fixed copy keeps classification the same
 * between deploys. Refresh it every few months.
 * @param url - The YAML to download. Defaults to {@link REFERER_PARSER_URL}.
 * @returns The dataset for `createReferrerClassifier`.
 * @example
 * await Bun.write("src/data/referers.json", JSON.stringify(await downloadReferrerDataset()))
 */
export async function downloadReferrerDataset(
  url: string = REFERER_PARSER_URL,
): Promise<ReferrerDataset> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Downloading ${url} answered ${response.status}`)

  return parseReferrerDataset(await response.text())
}
