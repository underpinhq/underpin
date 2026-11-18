#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { parseArgs } from "node:util"
import {
  downloadReferrerDataset,
  REFERER_PARSER_NOTICE,
  REFERER_PARSER_URL,
} from "./referrer-dataset.js"

// Downloads referer-parser's list, writes it as JSON and writes its licence notice beside it.
// Usage: underpin-referers <output.json> [--url <yaml url>]

const USAGE = "Usage: underpin-referers <output.json> [--url <yaml url>]"

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { url: { type: "string" }, help: { type: "boolean", short: "h" } },
  })

  const [output] = positionals
  if (values.help || !output || positionals.length > 1) {
    console.error(USAGE)
    process.exitCode = values.help ? 0 : 1
    return
  }

  const dataset = await downloadReferrerDataset(values.url ?? REFERER_PARSER_URL)
  const noticePath = join(dirname(output), "NOTICE.md")

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(dataset, null, 2)}\n`)
  await writeFile(noticePath, REFERER_PARSER_NOTICE)

  console.log(
    `Wrote ${Object.keys(dataset).length} domains to ${output} and the notice to ${noticePath}`,
  )
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
