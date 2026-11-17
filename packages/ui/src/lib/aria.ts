/**
 * An id list for `aria-describedby` or `aria-labelledby`, skipping the parts that are not on
 * screen; `undefined` when none are, so the attribute is left off.
 */
export function formatIdList(...ids: (string | false | undefined)[]) {
  const shown = ids.filter(Boolean)
  return shown.length ? shown.join(" ") : undefined
}
