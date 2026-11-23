/**
 * Whether the page runs a development build, where a misuse is worth a loud error. A bundler
 * replaces the read with a string without defining `process`, so the read cannot be guarded
 * by a check on `process`. An unbundled page has no `process` and lands in the `catch`.
 */
export function isDevelopment() {
  try {
    // oxlint-disable-next-line node/no-process-env
    return process.env.NODE_ENV !== "production"
  } catch {
    return false
  }
}
