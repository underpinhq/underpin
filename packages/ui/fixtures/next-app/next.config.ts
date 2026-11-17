import type { NextConfig } from "next"

const config: NextConfig = {
  // The fixture sits inside the package, so Next.js would otherwise trace from the monorepo root.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
}

export default config
