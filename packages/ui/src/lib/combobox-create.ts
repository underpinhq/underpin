/**
 * The "Create …" option of a combobox: an item that stands for a typed term no option matches.
 * It goes into the root's `items` beside the real ones, so the keyboard reaches it and the
 * filter keeps it, and it leaves the value again through `splitComboboxCreateValue`, which hands
 * the terms to whatever creates the records.
 */

/**
 * Marks the create option, so an item type with a `create` field of its own is never read as
 * one. Registered globally, so two copies of the package still agree on it.
 */
const CREATE_OPTION: unique symbol = Symbol.for("@underpin/ui/combobox-create")

// A term ends at a comma or a line break, so a pasted list of either kind splits the same way.
const TERM_SEPARATOR = /[,\r\n]+/

/** The option offering to create `create`, the term as typed, trimmed. */
export interface ComboboxCreateOption {
  readonly [CREATE_OPTION]: true
  readonly create: string
}

/** The terms a split value asks to create, beside the items already picked. */
export interface ComboboxCreateValue<Item> {
  items: Item[]
  create: string[]
}

export function isComboboxCreateOption(value: unknown): value is ComboboxCreateOption {
  return typeof value === "object" && value !== null && CREATE_OPTION in value
}

/** The create option for a term, whether or not a label already reads it. */
export function createComboboxCreateOption(term: string): ComboboxCreateOption {
  return { [CREATE_OPTION]: true, create: term.trim() }
}

/**
 * The option that creates the typed term, or `undefined` when the term is blank or an existing
 * label already reads it, ignoring case: "Create “react”" beside a React tag would make a twin.
 */
export function findComboboxCreateOption(
  query: string,
  labels: Iterable<string>,
): ComboboxCreateOption | undefined {
  const create = query.trim()
  if (!create) return

  const term = create.toLocaleLowerCase()
  for (const label of labels) {
    if (label.trim().toLocaleLowerCase() === term) return
  }

  return createComboboxCreateOption(create)
}

/**
 * Splits a multiple combobox's next value into the items picked and the terms to create, when
 * create options are among them. A paste of several new terms brings more than one. The caller
 * stores the items, then adds the records the terms name once they exist.
 */
export function splitComboboxCreateValue<Item>(
  value: readonly (Item | ComboboxCreateOption)[],
): ComboboxCreateValue<Item> {
  const items: Item[] = []
  const create: string[] = []

  for (const entry of value) {
    if (isComboboxCreateOption(entry)) create.push(entry.create)
    else items.push(entry)
  }

  return { items, create }
}

/** The terms in a typed or pasted text, split at commas and line breaks, trimmed, blanks dropped. */
export function splitComboboxTerms(text: string) {
  return text
    .split(TERM_SEPARATOR)
    .map(term => term.trim())
    .filter(Boolean)
}

/**
 * The label of an option or of the create option, for the root's `itemToStringLabel`. The
 * create option reads as its term, so the root's filter keeps it while the query matches.
 */
export function withComboboxCreateLabel<Item>(
  getLabel: (item: Item) => string,
): (value: Item | ComboboxCreateOption) => string {
  return value => (isComboboxCreateOption(value) ? value.create : getLabel(value))
}
