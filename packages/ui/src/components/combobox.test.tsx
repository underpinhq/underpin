import { describe, expect, mock, test } from "bun:test"
import type { ComboboxCreateOption } from "../lib/combobox-create"
import { click, listAxeViolations, press, readDescription, registerDom, render } from "../test-dom"

registerDom()

interface Tag {
  id: string
  name: string
}

const REACT: Tag = { id: "react", name: "React" }
const VUE: Tag = { id: "vue", name: "Vue" }
const SVELTE: Tag = { id: "svelte", name: "Svelte" }
const TAGS = [REACT, VUE, SVELTE]

interface TagPickerProps {
  initial?: Tag[]
  disabled?: boolean
  readOnly?: boolean
  commaAdds?: boolean
  creatable?: boolean
  maxLength?: number
  onChange?: (tags: Tag[]) => void
  onCreate?: (names: string[]) => void
}

function getInput() {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Tags"]')
  if (!input) throw new Error("No tags input")
  return input
}

function getOption(text: string) {
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(element =>
    element.textContent?.startsWith(text),
  )
  if (!option) throw new Error(`No option reads "${text}"`)
  return option
}

function readChips() {
  return [...document.querySelectorAll<HTMLElement>("[data-chip]")].map(chip => chip.textContent)
}

/** Pastes the text into the input, as a clipboard paste does. */
async function paste(input: HTMLInputElement, text: string) {
  const { act } = await import("react")

  await act(async () => {
    input.focus()
    const event = new Event("paste", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "clipboardData", { value: { getData: () => text } })
    input.dispatchEvent(event)
  })
}

function readAnnouncement() {
  return document.querySelector('[aria-live="polite"].sr-only')?.textContent
}

/** Types into the input the way a key press does: the value changes, then an input event. */
async function type(input: HTMLInputElement, text: string) {
  const { act } = await import("react")
  // The prototype's setter, past the one React puts on the element, so React sees a change.
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")

  await act(async () => {
    input.focus()
    descriptor?.set?.call(input, text)
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }),
    )
  })
}

async function loadPicker() {
  const { useState } = await import("react")
  const combobox = await import("./combobox")
  const create = await import("../lib/combobox-create")

  function TagPicker({
    initial = [],
    disabled,
    readOnly,
    commaAdds,
    creatable,
    maxLength,
    onChange,
    onCreate,
  }: TagPickerProps) {
    const [value, setValue] = useState<Tag[]>(initial)
    const [query, setQuery] = useState("")
    const option = create.findComboboxCreateOption(
      query,
      TAGS.map(tag => tag.name),
    )
    const items = option ? [...TAGS, option] : TAGS

    return (
      <combobox.Combobox
        multiple
        items={items}
        value={value}
        inputValue={query}
        disabled={disabled}
        readOnly={readOnly}
        autoHighlight
        itemToStringLabel={create.withComboboxCreateLabel((tag: Tag) => tag.name)}
        onInputValueChange={setQuery}
        onValueChange={next => {
          const split = create.splitComboboxCreateValue(next)
          setValue(split.items)
          onChange?.(split.items)
          if (split.create.length) onCreate?.(split.create)
        }}
      >
        <combobox.ComboboxChips>
          {value.map(tag => (
            <combobox.ComboboxChip key={tag.id} data-chip>
              {tag.name}
            </combobox.ComboboxChip>
          ))}
          <combobox.ComboboxChipsInput
            aria-label="Tags"
            placeholder="Add tags"
            commaAdds={commaAdds}
            creatable={creatable}
            maxLength={maxLength}
          />
        </combobox.ComboboxChips>

        <combobox.ComboboxContent>
          <combobox.ComboboxList>
            {(item: Tag | ComboboxCreateOption) =>
              create.isComboboxCreateOption(item) ? (
                <combobox.ComboboxCreateItem key="create" value={item}>
                  {`Create tag “${item.create}”`}
                </combobox.ComboboxCreateItem>
              ) : (
                <combobox.ComboboxItem key={item.id} value={item}>
                  {item.name}
                </combobox.ComboboxItem>
              )
            }
          </combobox.ComboboxList>
          <combobox.ComboboxFooter>
            <combobox.ComboboxKeyHint keys="↵">Add</combobox.ComboboxKeyHint>
            <combobox.ComboboxKeyHint keys="Esc">Close</combobox.ComboboxKeyHint>
          </combobox.ComboboxFooter>
        </combobox.ComboboxContent>
      </combobox.Combobox>
    )
  }

  return TagPicker
}

describe("Combobox with multiple values", () => {
  test("adds the clicked option as a chip and keeps the field open for the next", async () => {
    const TagPicker = await loadPicker()
    const onChange = mock()
    const view = await render(<TagPicker onChange={onChange} />)

    await type(getInput(), "Vu")
    await click(getOption("Vue"))

    expect(readChips()).toEqual(["Vue"])
    expect(onChange).toHaveBeenLastCalledWith([VUE])
    expect(getInput().value).toBe("")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("adds the highlighted option on Enter and on a comma", async () => {
    const TagPicker = await loadPicker()
    const view = await render(<TagPicker />)

    await type(getInput(), "Sve")
    await press(getInput(), "Enter")
    expect(readChips()).toEqual(["Svelte"])

    await type(getInput(), "Rea")
    await press(getInput(), ",")
    expect(readChips()).toEqual(["Svelte", "React"])
    expect(getInput().value).toBe("")

    await view.unmount()
  })

  test("removes a chip by its button and the last chip on Backspace", async () => {
    const TagPicker = await loadPicker()
    const onChange = mock()
    const view = await render(<TagPicker initial={TAGS} onChange={onChange} />)

    expect(document.querySelector('[role="toolbar"]')?.contains(getInput())).toBe(true)

    const remove = document.querySelector<HTMLElement>('[aria-label="Remove Vue"]')
    if (!remove) throw new Error("No remove button for Vue")
    await click(remove)
    expect(readChips()).toEqual(["React", "Svelte"])

    getInput().focus()
    await press(getInput(), "Backspace")
    expect(readChips()).toEqual(["React"])
    expect(onChange).toHaveBeenLastCalledWith([REACT])

    await press(getInput(), "Escape")
    expect(readChips()).toEqual(["React"])

    await view.unmount()
  })

  test("offers to create a term nothing matches, and hands the term over", async () => {
    const TagPicker = await loadPicker()
    const onCreate = mock()
    const view = await render(<TagPicker initial={[REACT]} onCreate={onCreate} />)

    await type(getInput(), "react")
    expect(() => getOption("Create tag")).toThrow()

    await type(getInput(), "Solid")
    expect(getOption("Create tag").textContent).toBe("Create tag “Solid”")
    expect(document.querySelector("kbd")?.textContent).toBe("↵")

    await press(getInput(), "Enter")
    expect(onCreate).toHaveBeenCalledWith(["Solid"])
    expect(readChips()).toEqual(["React"])

    await view.unmount()
  })

  test("a comma on an option already picked leaves the chips as they are", async () => {
    const TagPicker = await loadPicker()
    const view = await render(<TagPicker initial={[REACT]} />)

    await type(getInput(), "Rea")
    await press(getInput(), ",")
    expect(readChips()).toEqual(["React"])

    await press(getInput(), "Enter")
    expect(readChips()).toEqual([])

    await view.unmount()
  })

  test("with commaAdds off a comma adds nothing", async () => {
    const TagPicker = await loadPicker()
    const view = await render(<TagPicker commaAdds={false} />)

    await type(getInput(), "Vu")
    await press(getInput(), ",")
    expect(readChips()).toEqual([])

    await paste(getInput(), "React, Vue")
    expect(readChips()).toEqual([])

    await view.unmount()
  })

  test("splits a pasted list into chips, matching labels in any case", async () => {
    const TagPicker = await loadPicker()
    const onChange = mock()
    const view = await render(<TagPicker initial={[VUE]} onChange={onChange} />)

    await paste(getInput(), "react,\nvue, Solid, svelte")

    expect(readChips()).toEqual(["Vue", "React", "Svelte"])
    expect(getInput().value).toBe("Solid")

    await view.unmount()
  })

  test("hands the pasted terms nothing matches over to create when creatable", async () => {
    const TagPicker = await loadPicker()
    const onCreate = mock()
    const view = await render(<TagPicker creatable onCreate={onCreate} />)

    await paste(getInput(), "Solid, Qwik, Vue")

    expect(readChips()).toEqual(["Vue"])
    expect(onCreate).toHaveBeenCalledWith(["Solid", "Qwik"])
    expect(getInput().value).toBe("")

    await view.unmount()
  })

  test("announces each value added or removed while the field has focus", async () => {
    const TagPicker = await loadPicker()
    const view = await render(<TagPicker initial={[REACT]} />)
    expect(readAnnouncement()).toBe("")

    await type(getInput(), "Vu")
    await press(getInput(), "Enter")
    expect(readAnnouncement()).toBe("Added Vue")

    await press(getInput(), "Backspace")
    expect(readAnnouncement()).toBe("Removed Vue")

    await view.unmount()
  })

  test("a paste keeps the text typed before it, and terms longer than the input takes", async () => {
    const TagPicker = await loadPicker()
    const view = await render(<TagPicker maxLength={6} />)

    await type(getInput(), "So")
    await paste(getInput(), "React, Vue, Svelte Kit")

    expect(readChips()).toEqual(["React", "Vue"])
    expect(getInput().value).toBe("So, Svelte Kit")

    await view.unmount()
  })

  test("a read-only field keeps its chips and shows no remove button", async () => {
    const TagPicker = await loadPicker()
    const onChange = mock()
    const view = await render(<TagPicker initial={[REACT]} readOnly onChange={onChange} />)

    const remove = document.querySelector<HTMLElement>('[aria-label="Remove React"]')
    expect(remove?.closest("[data-chip]")?.getAttribute("aria-readonly")).toBe("true")
    expect(remove?.className).toContain("group-aria-readonly/chip:hidden")

    getInput().focus()
    await press(getInput(), "Backspace")
    await paste(getInput(), "Vue, Svelte")
    expect(readChips()).toEqual(["React"])
    expect(onChange).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("a chip with rich children warns without a label and names its remove with one", async () => {
    const { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput } = await import("./combobox")
    const warn = mock()
    const original = console.warn
    console.warn = warn

    const view = await render(
      <Combobox multiple items={TAGS} defaultValue={[REACT]}>
        <ComboboxChips>
          <ComboboxChip>
            <b>React</b>
          </ComboboxChip>
          <ComboboxChip label="Vue">
            <b>Vue</b>
          </ComboboxChip>
          <ComboboxChipsInput aria-label="Tags" />
        </ComboboxChips>
      </Combobox>,
    )
    console.warn = original

    expect(warn).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[aria-label="Remove Vue"]')).not.toBeNull()

    await view.unmount()
  })

  test("a disabled field neither opens nor lets a chip go", async () => {
    const TagPicker = await loadPicker()
    const onChange = mock()
    const view = await render(<TagPicker initial={[REACT]} disabled onChange={onChange} />)

    expect(getInput().disabled).toBe(true)

    const remove = document.querySelector<HTMLElement>('[aria-label="Remove React"]')
    if (remove) await click(remove)
    await press(getInput(), "Backspace")

    expect(readChips()).toEqual(["React"])
    expect(onChange).not.toHaveBeenCalled()
    expect(document.querySelector('[role="listbox"]')).toBeNull()

    await view.unmount()
  })
})

describe("Combobox with multiple values, uncontrolled", () => {
  async function loadUncontrolled() {
    const combobox = await import("./combobox")

    interface PickerProps {
      onValueChange?: (tags: Tag[], details: { cancel: () => void }) => void
      onInputValueChange?: (text: string, details: { cancel: () => void }) => void
    }

    function Picker({ onValueChange, onInputValueChange }: PickerProps) {
      return (
        <combobox.Combobox
          multiple
          items={TAGS}
          autoHighlight
          itemToStringLabel={(tag: Tag) => tag.name}
          onValueChange={onValueChange}
          onInputValueChange={onInputValueChange}
        >
          <combobox.ComboboxChips>
            <combobox.ComboboxValue>
              {(value: Tag[]) =>
                value.map(tag => (
                  <combobox.ComboboxChip key={tag.id} data-chip>
                    {tag.name}
                  </combobox.ComboboxChip>
                ))
              }
            </combobox.ComboboxValue>
            <combobox.ComboboxChipsInput aria-label="Tags" />
          </combobox.ComboboxChips>
          <combobox.ComboboxContent>
            <combobox.ComboboxList>
              {(tag: Tag) => (
                <combobox.ComboboxItem key={tag.id} value={tag}>
                  {tag.name}
                </combobox.ComboboxItem>
              )}
            </combobox.ComboboxList>
          </combobox.ComboboxContent>
        </combobox.Combobox>
      )
    }

    return Picker
  }

  test("renders its chips through ComboboxValue and adds a paste", async () => {
    const Picker = await loadUncontrolled()
    const view = await render(<Picker />)

    await type(getInput(), "Vu")
    await click(getOption("Vue"))
    await paste(getInput(), "React, Svelte")

    expect(readChips()).toEqual(["Vue", "React", "Svelte"])

    await view.unmount()
  })

  test("keeps its value when onValueChange cancels the change", async () => {
    const Picker = await loadUncontrolled()
    const view = await render(<Picker onValueChange={(_tags, details) => details.cancel()} />)

    await type(getInput(), "Vu")
    await click(getOption("Vue"))
    await paste(getInput(), "React, Svelte")

    expect(readChips()).toEqual([])

    await view.unmount()
  })

  test("keeps its text when onInputValueChange cancels the change", async () => {
    const Picker = await loadUncontrolled()
    const view = await render(<Picker onInputValueChange={(_text, details) => details.cancel()} />)

    await type(getInput(), "Vu")

    expect(getInput().value).toBe("")

    await view.unmount()
  })
})

describe("Combobox groups", () => {
  test("labels each group and ends each option in its count", async () => {
    const {
      Combobox,
      ComboboxCollection,
      ComboboxContent,
      ComboboxGroup,
      ComboboxGroupLabel,
      ComboboxInput,
      ComboboxItem,
      ComboboxList,
    } = await import("./combobox")

    interface Category {
      name: string
      count: number
    }

    const groups = [
      { value: "Suggested", items: [{ name: "Analytics", count: 12 }] },
      {
        value: "All categories",
        items: [
          { name: "Design", count: 40 },
          { name: "Hosting", count: 7 },
        ],
      },
    ]

    const view = await render(
      <Combobox
        items={groups}
        defaultOpen
        itemToStringLabel={(category: Category) => category.name}
      >
        <ComboboxInput aria-label="Categories" />
        <ComboboxContent>
          <ComboboxList>
            {(group: (typeof groups)[number]) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(category: Category) => (
                    <ComboboxItem key={category.name} value={category} suffix={category.count}>
                      {category.name}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    )

    const labels = [...document.querySelectorAll('[role="group"]')].map(
      group => group.getAttribute("aria-labelledby") && group.firstElementChild?.textContent,
    )
    expect(labels).toEqual(["Suggested", "All categories"])
    expect(getOption("Design").textContent).toBe("Design40")

    await type(document.querySelector<HTMLInputElement>("input") as HTMLInputElement, "host")
    expect(
      [...document.querySelectorAll('[role="option"]')].map(option => option.textContent),
    ).toEqual(["Hosting7"])

    await view.unmount()
  })
})

describe("Combobox in a form", () => {
  test("stores the picked values, and marks the field invalid while it holds none", async () => {
    const { createFormHook } = await import("@tanstack/react-form")
    const form = await import("./form")
    const {
      Combobox,
      ComboboxChip,
      ComboboxChips,
      ComboboxChipsInput,
      ComboboxContent,
      ComboboxItem,
      ComboboxList,
    } = await import("./combobox")
    const { act } = await import("react")
    const { useAppForm } = createFormHook({
      fieldContext: form.fieldContext,
      formContext: form.formContext,
      fieldComponents: form.fieldComponents,
      formComponents: form.formComponents,
    })
    const onSubmit = mock()

    function TagForm() {
      const appForm = useAppForm({
        defaultValues: { tags: [] as string[] },
        validators: {
          onSubmit: ({ value }) =>
            value.tags.length ? undefined : { fields: { tags: "Pick a tag." } },
        },
        onSubmit: ({ value }) => onSubmit(value),
      })

      return (
        <form.Form form={appForm}>
          <appForm.AppField name="tags">
            {field => (
              <form.Field label="Tags">
                {({ onBlur, ...control }) => (
                  <Combobox
                    multiple
                    items={TAGS}
                    value={TAGS.filter(tag => field.state.value.includes(tag.id))}
                    itemToStringLabel={(tag: Tag) => tag.name}
                    onValueChange={next => field.handleChange(next.map(tag => tag.id))}
                    onOpenChange={open => !open && onBlur()}
                  >
                    <ComboboxChips>
                      {TAGS.filter(tag => field.state.value.includes(tag.id)).map(tag => (
                        <ComboboxChip key={tag.id} data-chip>
                          {tag.name}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput {...control} />
                    </ComboboxChips>
                    <ComboboxContent>
                      <ComboboxList>
                        {(tag: Tag) => (
                          <ComboboxItem key={tag.id} value={tag}>
                            {tag.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              </form.Field>
            )}
          </appForm.AppField>
          <button type="submit">Save</button>
        </form.Form>
      )
    }

    async function submit() {
      await act(async () => {
        document.querySelector("form")?.requestSubmit()
        await new Promise(resolve => setTimeout(resolve, 20))
      })
    }

    const view = await render(<TagForm />)
    const input = document.querySelector<HTMLInputElement>("form input[role='combobox']")
    if (!input) throw new Error("No combobox input")
    expect(document.querySelector("label")?.getAttribute("for")).toBe(input.id)

    await submit()
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(readDescription(input)).toBe("Pick a tag.")
    expect(onSubmit).not.toHaveBeenCalled()

    await type(input, "Vu")
    await click(getOption("Vue"))
    await submit()

    expect(readChips()).toEqual(["Vue"])
    expect(onSubmit).toHaveBeenCalledWith({ tags: ["vue"] })
    expect(input.getAttribute("aria-invalid")).toBeNull()

    await view.unmount()
  })
})
