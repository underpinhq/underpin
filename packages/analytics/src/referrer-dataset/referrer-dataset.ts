import { parse } from "yaml"
import type { Medium, ReferrerDataset, ReferrerEntry } from "../referrer/referrer.js"

/** Snowplow's referer-parser list (GPL-3.0), which Plausible and PostHog also use. */
export const REFERER_PARSER_URL =
  "https://raw.githubusercontent.com/snowplow-referer-parser/referer-parser/master/resources/referers.yml"

/** The attribution and licence notice to keep next to a downloaded copy of the list. */
export const REFERER_PARSER_NOTICE: string = `# Referrer dataset

This dataset is a flattened copy of Snowplow's referer-parser list:
https://github.com/snowplow-referer-parser/referer-parser

The list is based on Matomo's SearchEngines.php and Socials.php, copyright 2012 Matthieu Aubry
(https://matomo.org).

It is distributed under the GNU General Public License, version 3 or later. You can redistribute
it and/or modify it under the terms of that licence. It comes WITHOUT ANY WARRANTY, without even
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. The full licence is at
https://www.gnu.org/licenses/gpl-3.0.html.
`

const MEDIUMS = new Set<string>(["search", "social", "email", "paid", "chatbot", "unknown"])

type SourceList = Record<string, Record<string, { domains?: unknown[] } | null> | null>

/**
 * Flattens referer-parser's YAML, keyed medium, then source, then domains, into one entry per
 * domain. A later medium wins on a duplicate domain: upstream lists "unknown" first, so the
 * specific mediums (search, social, email) override it. A domain that is not a string is skipped.
 * @param yamlText - The contents of `referers.yml`.
 * @returns The dataset for `createReferrerClassifier`.
 */
export function parseReferrerDataset(yamlText: string): ReferrerDataset {
  const sources = (parse(yamlText) ?? {}) as SourceList
  // A Map, so a domain such as `__proto__` becomes an own key of the result rather than its
  // prototype: `Object.fromEntries` defines each key as a plain property.
  const entries = new Map<string, ReferrerEntry>()

  for (const [medium, sourceEntries] of Object.entries(sources)) {
    if (!MEDIUMS.has(medium)) {
      continue
    }

    for (const [source, entry] of Object.entries(sourceEntries ?? {})) {
      for (const domain of entry?.domains ?? []) {
        if (typeof domain !== "string") {
          continue
        }

        entries.set(domain.toLowerCase(), [source, medium as Medium])
      }
    }
  }

  return Object.fromEntries(entries)
}

/**
 * Downloads and flattens referer-parser's list. Run it from a script and commit the JSON: the
 * list is GPL-3.0, so this package cannot bundle it, and a fixed copy keeps classification the same
 * between deploys. Refresh it every few months. The `underpin-referers` command does this and
 * writes the licence notice beside the file.
 * @param url - The YAML to download. Defaults to {@link REFERER_PARSER_URL}.
 * @returns The dataset for `createReferrerClassifier`.
 * @example
 * await writeFile("src/data/referers.json", JSON.stringify(await downloadReferrerDataset()))
 */
export async function downloadReferrerDataset(
  url: string = REFERER_PARSER_URL,
): Promise<ReferrerDataset> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) {
    throw new Error(`Downloading ${url} answered ${response.status}`)
  }

  return parseReferrerDataset(await response.text())
}
