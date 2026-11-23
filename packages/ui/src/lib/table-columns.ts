/**
 * Grid tracks for the columns of a `Table` or a `DataTable`. A table's rows are subgrids of one
 * grid, so a content-sized track is as wide as its widest cell in the table, the column's name
 * included.
 */

/**
 * A figure, a date or a short state ("Renews in 20 days"): at least `floor` wide, and as wide as
 * its widest cell past that, so it never wraps or truncates. The floor holds the column still
 * while the skeleton rows load.
 */
export function figureColumn(floor: string) {
  return `minmax(${floor},max-content)`
}

/**
 * A short label, such as a tier or an advertiser name: as wide as its longest value up to `cap`,
 * where it truncates, so a column of short names gives its room back to the name column. The
 * track follows its content, so it changes width when data replaces the skeleton rows and can
 * end up narrower than `cap`. A column that must hold still takes a fixed width or
 * {@link labelShareColumn}.
 */
export function labelColumn(cap = "12rem") {
  return `fit-content(${cap})`
}

/**
 * A figure, a date or a short state in a wide table: as wide as its widest cell, like
 * {@link figureColumn}, plus `share` parts of the spare width, so the columns spread out instead
 * of packing against the table's end. Pair it with {@link nameColumn}.
 */
export function shareColumn(share = 1) {
  return `minmax(max-content,${share}fr)`
}

/**
 * A short label in a wide table: `floor` wide, plus `share` parts of the spare width, truncating
 * past that. The track ignores its content, so the column holds still when data replaces the
 * skeleton rows. Pair it with {@link nameColumn}.
 */
export function labelShareColumn(floor: string, share = 1) {
  return `minmax(${floor},${share}fr)`
}

/**
 * The name column of a table whose other columns take a share of the spare width: `share` parts
 * of it, so the name stays the widest column without taking every spare pixel.
 */
export function nameColumn(share = 3) {
  return `minmax(0,${share}fr)`
}
