/** An in-app href, in the three parts a router link takes. */
interface HrefParts {
  pathname: string
  /** The query string with its leading `?`, or empty. */
  search: string
  /** The fragment with no leading `#`, when the href has one. */
  hash?: string
}

/** Splits an in-app href ("/admin/users?page=2#top") into its path, query string and fragment. */
export function parseHref(href: string): HrefParts {
  const hashStart = href.indexOf("#")
  const beforeHash = hashStart === -1 ? href : href.slice(0, hashStart)
  const searchStart = beforeHash.indexOf("?")

  return {
    pathname: searchStart === -1 ? beforeHash : beforeHash.slice(0, searchStart),
    search: searchStart === -1 ? "" : beforeHash.slice(searchStart),
    hash: hashStart === -1 ? undefined : href.slice(hashStart + 1),
  }
}
