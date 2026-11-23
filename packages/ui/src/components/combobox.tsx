"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import type { BaseUIEvent } from "@base-ui/react/types"
import {
  type ClipboardEvent,
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  POPUP_SIDE_OFFSET,
  popoverAnimationClasses,
  popupEmptyClasses,
  popupGroupLabelClasses,
  popupItemClasses,
  popupSeparatorClasses,
  popupSurfaceClasses,
} from "../lib/classes"
import {
  type ComboboxCreateOption,
  createComboboxCreateOption,
  isComboboxCreateOption,
  splitComboboxTerms,
} from "../lib/combobox-create"
import { isDevelopment } from "../lib/env"
import { CancelIcon, CheckIcon, ChevronsUpDownIcon, PlusIcon } from "../lib/icons"
import { cn, variants, type VariantProps } from "../lib/variants"
import { badgeVariants } from "./badge"
import { inputVariants, passwordManagerAttributes, type PasswordManagerProps } from "./input"
import { Kbd } from "./kbd"

/** What the chips parts read from the root: the value, its labels, and a way to set it. */
interface ComboboxValueContext {
  multiple: boolean
  values: readonly unknown[]
  items: readonly unknown[]
  readOnly: boolean
  disabled: boolean
  getLabel: (value: unknown) => string
  addValues: (added: readonly unknown[], event: Event) => void
  setInputValue: (text: string, event: Event) => void
}

const ComboboxValueContext = createContext<ComboboxValueContext | null>(null)

/** Base UI's own fallback label: an object's `label`, or the value as text. */
function readDefaultLabel(value: unknown) {
  if (typeof value === "object" && value !== null && "label" in value) return String(value.label)
  return String(value)
}

/** The options of a flat list or of a grouped one, whose groups hold theirs under `items`. */
function flattenItems(items: readonly unknown[] | undefined): unknown[] {
  return (items ?? []).flatMap(item =>
    typeof item === "object" && item !== null && "items" in item && Array.isArray(item.items)
      ? item.items
      : [item],
  )
}

/**
 * The details Base UI hands `onValueChange`, for a change the chips parts make themselves. Built
 * here rather than with Base UI's own factory, which is internal and missing before 1.5.
 */
function createChangeDetails(event: Event): ComboboxPrimitive.Root.ChangeEventDetails {
  let isCanceled = false
  let isPropagationAllowed = false

  return {
    reason: "none",
    event,
    trigger: undefined,
    cancel: () => {
      isCanceled = true
    },
    allowPropagation: () => {
      isPropagationAllowed = true
    },
    get isCanceled() {
      return isCanceled
    },
    get isPropagationAllowed() {
      return isPropagationAllowed
    },
  }
}

/**
 * A text field that filters a list of options. Use a Combobox when the committed value has to
 * be one of the items and typing only narrows them down; use an Autocomplete when the value is
 * whatever the user typed and the list merely suggests completions.
 *
 * The parts cover two layouts. In the popup layout `ComboboxContent` portals the list and
 * anchors it under the input. In the inline layout the list is already inside someone else's
 * surface (a Popover, a Dialog), so `ComboboxContent` is left out and `ComboboxList` follows
 * `ComboboxInput` directly.
 *
 * With `multiple` on the root the value is a list, and `ComboboxChips` takes the input's place:
 * each picked value is a `ComboboxChip` in the field, ahead of a `ComboboxChipsInput`. Enter on
 * an option toggles it, as in any listbox: a picked option comes off again. A comma adds the
 * highlighted option and never takes one off. Backspace in an empty field removes the last chip,
 * and the arrow keys walk the chips. `autoHighlight` on the root makes the top match the one
 * Enter and a comma add. A `ComboboxCreateItem` offers a term nothing matches (see
 * `@underpin/ui/combobox-create`).
 *
 * A suggested group, counts and a create row, as an admin's tag picker shows them: the create
 * option sits in a group of its own with no label, after the matches.
 *
 * ```tsx
 * const create = findComboboxCreateOption(query, tags.map(tag => tag.name))
 * const groups = [
 *   { value: "Suggested", items: suggested },
 *   { value: "Tags", items: tags },
 *   ...(create ? [{ value: "", items: [create] }] : []),
 * ]
 *
 * <Combobox multiple autoHighlight items={groups} value={picked} inputValue={query}
 *   itemToStringLabel={withComboboxCreateLabel((tag: Tag) => tag.name)}
 *   onInputValueChange={setQuery}
 *   onValueChange={next => {
 *     const { items, create } = splitComboboxCreateValue(next)
 *     setPicked(items)
 *     for (const name of create) createTag(name)
 *   }}>
 *   <ComboboxChips>
 *     {picked.map(tag => <ComboboxChip key={tag.id}>{tag.name}</ComboboxChip>)}
 *     <ComboboxChipsInput aria-label="Tags" />
 *   </ComboboxChips>
 *   <ComboboxContent>
 *     <ComboboxList>
 *       {(group: TagGroup) => (
 *         <ComboboxGroup key={group.value} items={group.items}>
 *           {group.value && <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>}
 *           <ComboboxCollection>
 *             {(item: Tag | ComboboxCreateOption) =>
 *               isComboboxCreateOption(item) ? (
 *                 <ComboboxCreateItem key="create" value={item}>Create tag “{item.create}”</ComboboxCreateItem>
 *               ) : (
 *                 <ComboboxItem key={item.id} value={item} suffix={item.count}>{item.name}</ComboboxItem>
 *               )
 *             }
 *           </ComboboxCollection>
 *         </ComboboxGroup>
 *       )}
 *     </ComboboxList>
 *     <ComboboxFooter>
 *       <ComboboxKeyHint keys={["↑", "↓"]}>Move</ComboboxKeyHint>
 *       <ComboboxKeyHint keys="↵">Add</ComboboxKeyHint>
 *     </ComboboxFooter>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 *
 * The root is Base UI's. With `multiple` its value and its input's text are held controlled here
 * even when the caller passes only defaults, so the chips parts can read the value and add to it.
 */
function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>({
  value,
  defaultValue,
  onValueChange,
  inputValue,
  defaultInputValue,
  onInputValueChange,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple, Item>) {
  const [ownValue, setOwnValue] = useState(defaultValue)
  const [ownInputValue, setOwnInputValue] = useState(defaultInputValue ?? "")
  const isControlled = value !== undefined
  const current = isControlled ? value : ownValue
  const multiple = props.multiple === true

  function handleValueChange(
    next: Parameters<NonNullable<typeof onValueChange>>[0],
    details: ComboboxPrimitive.Root.ChangeEventDetails,
  ) {
    // The caller sees the change first, so `details.cancel()` keeps the value, as in Base UI.
    onValueChange?.(next, details)
    if (!isControlled && !details.isCanceled) setOwnValue(next)
  }

  function handleInputValueChange(
    next: string,
    details: ComboboxPrimitive.Root.ChangeEventDetails,
  ) {
    onInputValueChange?.(next, details)
    if (inputValue === undefined && !details.isCanceled) setOwnInputValue(next)
  }

  const getLabel = (props.itemToStringLabel ?? readDefaultLabel) as (value: unknown) => string
  const values: readonly unknown[] = multiple && Array.isArray(current) ? current : []

  const context: ComboboxValueContext = {
    multiple,
    values,
    items: flattenItems(props.items as readonly unknown[] | undefined),
    readOnly: props.readOnly === true,
    disabled: props.disabled === true,
    getLabel,
    addValues: (added, event) => {
      if (!added.length) return
      const next = [...values, ...added] as Parameters<NonNullable<typeof onValueChange>>[0]
      handleValueChange(next, createChangeDetails(event))
    },
    setInputValue: (text, event) => handleInputValueChange(text, createChangeDetails(event)),
  }

  return (
    <ComboboxValueContext value={context}>
      <ComboboxPrimitive.Root
        {...props}
        {...(multiple
          ? {
              // An empty list keeps Base UI controlled before the first pick.
              value: (current ?? []) as typeof value,
              inputValue: inputValue ?? ownInputValue,
              onValueChange: handleValueChange,
              onInputValueChange: handleInputValueChange,
            }
          : {
              value,
              defaultValue,
              inputValue,
              defaultInputValue,
              onValueChange,
              onInputValueChange,
            })}
      />
    </ComboboxValueContext>
  )
}

const ComboboxGroup = ComboboxPrimitive.Group
/** Renders the current value, or a function of it: the chips of an uncontrolled `multiple` field. */
const ComboboxValue = ComboboxPrimitive.Value
const ComboboxCollection = ComboboxPrimitive.Collection

interface ComboboxTriggerProps
  extends ComboboxPrimitive.Trigger.Props, Pick<VariantProps<typeof inputVariants>, "size"> {}

/**
 * The button that opens the list, for a searchable select: the field lives inside the popup and
 * the trigger shows the committed value. Styled as the package's Select trigger, so the two read
 * as one control with and without search.
 */
function ComboboxTrigger({ children, className, size, ...props }: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn(
        inputVariants({ interactive: true, size }),
        "flex items-center justify-between",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2 truncate">{children}</span>
      <ComboboxPrimitive.Icon
        render={<ChevronsUpDownIcon className="ml-1 size-3.5 shrink-0 text-ink-muted" />}
      />
    </ComboboxPrimitive.Trigger>
  )
}

/**
 * The text field. Styled as the package's Input, so a combobox sitting next to a plain field in
 * a form row is the same control with a list behind it. The native `size` attribute is dropped
 * in favour of the Input's size variant: a character count is meaningless on a control this
 * package always stretches to its container.
 */
function ComboboxInput({
  className,
  interactive,
  size,
  allowPasswordManager,
  ...props
}: Omit<ComboboxPrimitive.Input.Props, "size"> &
  VariantProps<typeof inputVariants> &
  PasswordManagerProps) {
  return (
    <ComboboxPrimitive.Input
      // Merged outside `variants`, which cannot take Base UI's state-function `className`.
      className={cn(inputVariants({ interactive, size }), className)}
      {...passwordManagerAttributes(allowPasswordManager)}
      {...props}
    />
  )
}

const comboboxChipsVariants = variants({
  // The field's surface, wrapping its chips onto more rows as they fill it. The padding fits a
  // 20px chip into the field's height at each size, 28, 32 and 36px, and the input inside adds
  // the rest of the plain field's inset, so the placeholder sits where an Input's text would.
  // The ring and the danger edge follow the input inside, which is what takes the focus.
  base: [
    "flex cursor-text flex-wrap items-center gap-1",
    "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-1 has-[input:focus-visible]:outline-focus has-[input:focus-visible]:outline-solid",
    "has-[input[aria-invalid=true]]:border-danger has-[input[aria-invalid=true]:focus-visible]:outline-danger",
    "data-disabled:cursor-default data-disabled:bg-fill-subtle data-disabled:text-ink-secondary",
  ],

  variants: {
    size: {
      sm: "px-1 py-0.75",
      md: "px-1.25 py-1.25",
      lg: "px-1.75 py-1.75",
    },
  },

  defaultVariants: {
    size: "md",
  },
})

interface ComboboxChipsAnnouncements {
  /** What a screen reader hears when a value is added. Defaults to "Added" and its label. */
  added?: (label: string) => string
  /** What a screen reader hears when a value is removed. Defaults to "Removed" and its label. */
  removed?: (label: string) => string
}

interface ComboboxChipsProps
  extends ComboboxPrimitive.Chips.Props, VariantProps<typeof comboboxChipsVariants> {
  /** The sentences a screen reader hears as values come and go, for a product in another language. */
  announcements?: ComboboxChipsAnnouncements
}

function announceAdded(label: string) {
  return `Added ${label}`
}

function announceRemoved(label: string) {
  return `Removed ${label}`
}

/** The labels in `next` that `previous` lacks, counting a repeated label once per repeat. */
function subtractLabels(next: readonly string[], previous: readonly string[]) {
  const left = [...previous]

  return next.filter(label => {
    const index = left.indexOf(label)
    if (index === -1) return true
    left.splice(index, 1)
    return false
  })
}

/**
 * The field of a `multiple` combobox: its chips and, last, a `ComboboxChipsInput`. Styled as the
 * package's Input, so it sits in a form row as one, and a press anywhere in it lands in the
 * input. The popup anchors to the whole field rather than to the input inside, so it lines up
 * with the box however many rows of chips it holds.
 *
 * A visually hidden live region reads out each value added or removed while the field has focus.
 * A value set from outside (a form reset, a load) passes in silence.
 */
function ComboboxChips({ className, size, announcements, children, ...props }: ComboboxChipsProps) {
  const context = use(ComboboxValueContext)
  const fieldRef = useRef<HTMLDivElement>(null)
  const regionRef = useRef<HTMLSpanElement>(null)
  const labels = context?.values.map(value => context.getLabel(value)) ?? []
  const previousRef = useRef(labels)
  const added = announcements?.added ?? announceAdded
  const removed = announcements?.removed ?? announceRemoved

  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = labels

    const region = regionRef.current
    if (!region || !fieldRef.current?.contains(document.activeElement)) return

    const message = [
      ...subtractLabels(labels, previous).map(added),
      ...subtractLabels(previous, labels).map(removed),
    ].join(". ")
    if (message) region.textContent = message
  })

  return (
    // The chips' toolbar role wins over the input group's `group`, so a screen reader stays in
    // focus mode while the arrow keys walk the chips.
    <ComboboxPrimitive.Chips
      ref={fieldRef}
      data-size={size ?? "md"}
      // Merged outside `variants`, which cannot take Base UI's state-function `className`.
      className={cn(inputVariants({ size }), comboboxChipsVariants({ size }), className)}
      render={<ComboboxPrimitive.InputGroup />}
      {...props}
    >
      {children}
      <span ref={regionRef} aria-live="polite" className="sr-only" />
    </ComboboxPrimitive.Chips>
  )
}

interface ComboboxChipProps extends ComboboxPrimitive.Chip.Props {
  /**
   * The value's name, for the remove button ("Remove React"). Defaults to the chip's text, so a
   * chip whose children are not a plain string (an icon beside the name) needs it.
   */
  label?: string
}

/**
 * One picked value in a `ComboboxChips`, with its own remove button. The arrow keys reach it from
 * the input, and Backspace or Delete on it removes it. Drawn as an outline `Badge`. A read-only
 * or disabled field drops the remove button, which would do nothing there.
 */
function ComboboxChip({ className, children, label, ...props }: ComboboxChipProps) {
  const name = label ?? (typeof children === "string" ? children : undefined)

  useEffect(() => {
    if (name === undefined && isDevelopment()) {
      console.warn(
        "ComboboxChip: children that are not a plain string need a `label`, or its remove button is named only “Remove”.",
      )
    }
  }, [name])

  return (
    <ComboboxPrimitive.Chip
      // Merged outside `variants`, which cannot take Base UI's state-function `className`.
      className={cn(
        badgeVariants({ tone: "neutral", variant: "outline", size: "md" }),
        "group/chip max-w-full gap-1 pr-0.5 font-sans font-normal text-ink outline-none focus-visible:border-focus data-disabled:text-ink-secondary aria-readonly:pr-1.5",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ComboboxPrimitive.ChipRemove
        aria-label={name ? `Remove ${name}` : "Remove"}
        className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-muted group-aria-readonly/chip:hidden hover:bg-fill hover:text-ink data-disabled:hidden [&>svg]:size-3"
      >
        <CancelIcon />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  )
}

/**
 * Adds the option the keyboard has highlighted, as Enter does: a comma ends a value in a list of
 * them. Enter toggles, but a comma only ever adds, so on an option already picked it does
 * nothing rather than take the chip off. With nothing highlighted (no `autoHighlight` on the
 * root, or no match) the comma is typed into the term.
 */
function addHighlightedOnComma(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "," || event.nativeEvent.isComposing) return

  const listId = event.currentTarget.getAttribute("aria-controls")
  const list = listId ? document.getElementById(listId) : null
  const highlighted = list?.querySelector<HTMLElement>("[data-highlighted]")
  if (!highlighted) return

  event.preventDefault()
  if (!highlighted.hasAttribute("data-selected")) highlighted.click()
}

/**
 * Keeps Escape on a closed list from clearing the field. Base UI empties the value on it, which
 * in a field of chips throws away every pick at a second press meant only to close the list.
 */
function keepChipsOnEscape(event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>) {
  if (event.key !== "Escape" || event.currentTarget.getAttribute("aria-expanded") === "true") return

  event.preventBaseUIHandler()
}

/** Whether the value's label reads the term, given in lower case. */
function isTermOf(context: ComboboxValueContext, value: unknown, term: string) {
  return context.getLabel(value).toLocaleLowerCase() === term
}

interface PasteOptions {
  creatable: boolean
  /** The input's `maxLength`, or 0 for none: a longer term could never have been typed. */
  maxLength: number
}

/**
 * The values a pasted list names: each term that an option's label reads (ignoring case) and
 * that is not picked yet, then a create option per remaining term when `creatable`. Terms left
 * over, and any longer than the input takes, go back into the input, so nothing pasted is lost.
 */
function resolvePastedTerms(
  context: ComboboxValueContext,
  terms: string[],
  { creatable, maxLength }: PasteOptions,
) {
  const added: unknown[] = []
  const rest: string[] = []

  for (const term of terms) {
    if (maxLength > 0 && term.length > maxLength) {
      rest.push(term)
      continue
    }

    const key = term.toLocaleLowerCase()
    const item = context.items.find(
      candidate => !isComboboxCreateOption(candidate) && isTermOf(context, candidate, key),
    )

    if ([...context.values, ...added].some(value => isTermOf(context, value, key))) continue
    if (item !== undefined) added.push(item)
    else if (creatable) added.push(createComboboxCreateOption(term))
    else rest.push(term)
  }

  return { added, rest }
}

interface ComboboxChipsInputProps
  extends Omit<ComboboxPrimitive.Input.Props, "size">, PasswordManagerProps {
  /**
   * Whether a comma adds the highlighted option and a pasted list splits into values. On by
   * default; turn it off where a value may hold a comma.
   */
  commaAdds?: boolean
  /** Whether a pasted term no option matches becomes a create option in the value. */
  creatable?: boolean
}

/**
 * The text field inside a `ComboboxChips`: no box of its own, since the chips' field is the box,
 * and as wide as the room the chips leave on their last row, but never narrower than a short
 * word. Its placeholder is the empty field's, so a field that holds chips usually passes none.
 *
 * A paste holding commas or line breaks adds each term the label of an option in the root's
 * `items` reads; an option rendered without being in `items` is never matched. With `creatable`
 * the rest arrive as create options for `splitComboboxCreateValue`; without it they stay in the
 * input, after whatever was typed there before the paste.
 */
function ComboboxChipsInput({
  className,
  allowPasswordManager,
  commaAdds = true,
  creatable = false,
  onKeyDown,
  onPaste,
  ...props
}: ComboboxChipsInputProps) {
  const context = use(ComboboxValueContext)

  function handlePaste(event: BaseUIEvent<ClipboardEvent<HTMLInputElement>>) {
    onPaste?.(event)
    if (event.defaultPrevented || !commaAdds || !context?.multiple) return
    if (context.readOnly || context.disabled) return

    const terms = splitComboboxTerms(event.clipboardData.getData("text"))
    if (terms.length < 2) return

    event.preventDefault()
    const input = event.currentTarget
    const typed = input.value.trim()
    const { added, rest } = resolvePastedTerms(context, terms, {
      creatable,
      maxLength: input.maxLength,
    })
    context.addValues(added, event.nativeEvent)
    context.setInputValue([typed, ...rest].filter(Boolean).join(", "), event.nativeEvent)
  }

  return (
    <ComboboxPrimitive.Input
      // Merged outside `variants`, which cannot take Base UI's state-function `className`.
      className={cn(
        "min-w-16 flex-1 bg-transparent px-1.75 py-0.5 text-ink outline-none placeholder:text-ink-muted in-data-[size=sm]:px-1 disabled:cursor-default",
        className,
      )}
      {...passwordManagerAttributes(allowPasswordManager)}
      onKeyDown={event => {
        onKeyDown?.(event)
        keepChipsOnEscape(event)
        if (commaAdds && !event.defaultPrevented) addHighlightedOnComma(event)
      }}
      onPaste={handlePaste}
      {...props}
    />
  )
}

/**
 * The popup the options appear in, for the popup layout only. Holds a `ComboboxList` and,
 * optionally, a `ComboboxEmpty` or `ComboboxStatus` beside it. Both have to be the list's sibling
 * to know whether it is empty. Sized to at least its anchor, so the popup lines up with
 * the control that opened it but a long label still gets the width it needs.
 */
function ComboboxContent({
  className,
  children,
  align,
  side,
  sideOffset = POPUP_SIDE_OFFSET,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          className={cn(
            popupSurfaceClasses,
            "relative z-50 isolate max-h-(--available-height) min-w-(--anchor-width) overflow-hidden outline-none",
            popoverAnimationClasses,
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

/**
 * The scroller around the items. Takes them as children, or as a function called with each of
 * the root's (filtered) `items`. The second form is what keeps a long list virtual.
 *
 * Renders standalone as well as inside a `ComboboxContent`: with no positioner above it the list
 * registers itself as the anchor, which is how the inline layout works without a `Popup` or a
 * `Positioner`. Nothing sets `--available-height` in that layout, so the height falls back to a
 * fixed cap that keeps the list scrolling inside whatever surface holds it. A Popover's own
 * positioner does set the variable, and it reaches a list inside the popover: give that list a
 * `max-h` of its own, or it grows to the whole room and the popover overflows it by the height
 * of everything else it holds.
 */
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      className={cn(
        "max-h-[var(--available-height,18rem)] overflow-y-auto overscroll-contain p-1",
        className,
      )}
      {...props}
    />
  )
}

/**
 * One option. `prefix` leads the label with a glyph that tells the row apart at a glance;
 * `suffix` fills the trailing edge, for the count or shortcut that belongs to the row rather
 * than to its label. The selected option ends in a check, as in a `Select`.
 */
function ComboboxItem({
  className,
  children,
  prefix,
  suffix,
  ...props
}: Omit<ComboboxPrimitive.Item.Props, "prefix"> & {
  prefix?: ReactNode
  suffix?: ReactNode
}) {
  return (
    <ComboboxPrimitive.Item
      className={cn(popupItemClasses, "group/choice w-full gap-2 px-2", className)}
      {...props}
    >
      {prefix != null && (
        <span className="flex shrink-0 text-ink-muted [&>svg]:size-4">{prefix}</span>
      )}
      {/* Truncation belongs on a child: `text-overflow` has no effect on a flex container,
          so the same classes on the item itself clip a long label without an ellipsis. */}
      <span className="truncate">{children}</span>
      {suffix != null && (
        <span className="ml-auto shrink-0 pl-4 text-ink-muted tabular-nums">{suffix}</span>
      )}
      {/* One auto margin on the row: two would split the free space and strand the suffix
          halfway along a selected row. */}
      <span
        aria-hidden
        className={cn(
          "hidden shrink-0 text-ink-muted group-data-selected/choice:flex",
          suffix == null ? "ml-auto pl-4" : "pl-2",
        )}
      >
        <ComboboxPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ComboboxPrimitive.ItemIndicator>
      </span>
    </ComboboxPrimitive.Item>
  )
}

interface ComboboxCreateItemProps extends Omit<
  ComboboxPrimitive.Item.Props,
  "value" | "prefix" | "children"
> {
  /** The option `findComboboxCreateOption` built for the typed term. */
  value: ComboboxCreateOption
  /** The row's label. Defaults to "Create" and the term in quotes. */
  children?: ReactNode
}

/**
 * The row that creates the typed term, led by a plus. Render it for the create option where the
 * list renders its items, so it takes its place in the keyboard order.
 */
function ComboboxCreateItem({ value, children, ...props }: ComboboxCreateItemProps) {
  return (
    <ComboboxItem value={value} prefix={<PlusIcon />} {...props}>
      {children ?? `Create “${value.create}”`}
    </ComboboxItem>
  )
}

function ComboboxGroupLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel className={cn(popupGroupLabelClasses, className)} {...props} />
  )
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return <ComboboxPrimitive.Separator className={cn(popupSeparatorClasses, className)} {...props} />
}

/** Stands in for the list while nothing matches the query; renders nothing when something does. */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty className={cn(popupEmptyClasses, className)} {...props} />
}

/**
 * A line for the state of an asynchronously loaded list, announced politely as it changes. Its
 * element has to stay mounted for screen readers to catch that change, so render it
 * unconditionally and vary its children instead; it collapses to nothing while it has none.
 */
function ComboboxStatus({ className, ...props }: ComboboxPrimitive.Status.Props) {
  return <ComboboxPrimitive.Status className={cn(popupEmptyClasses, className)} {...props} />
}

interface ComboboxFooterProps extends ComponentProps<"div"> {}

/**
 * The band under the list that names the keys the list answers to, as a row of
 * `ComboboxKeyHint`s. It sits below the list, inside `ComboboxContent`, behind a hairline.
 */
function ComboboxFooter({ className, ...props }: ComboboxFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-2 text-xs text-ink-muted",
        className,
      )}
      {...props}
    />
  )
}

interface ComboboxKeyHintProps extends ComponentProps<"span"> {
  /** The key or keys, each drawn as a key cap: `"↵"`, `["↑", "↓"]`. */
  keys: string | string[]
}

/** One key and what it does, for a `ComboboxFooter`: "↵ Add", "Esc Close". */
function ComboboxKeyHint({ keys, className, children, ...props }: ComboboxKeyHintProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} {...props}>
      <span className="inline-flex gap-0.5">
        {(Array.isArray(keys) ? keys : [keys]).map(key => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
      {children}
    </span>
  )
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxCreateItem,
  ComboboxEmpty,
  ComboboxFooter,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxKeyHint,
  ComboboxList,
  ComboboxSeparator,
  ComboboxStatus,
  ComboboxTrigger,
  ComboboxValue,
}
