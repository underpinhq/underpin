import { describe, expect, test } from "bun:test"
import { registerDom } from "../test-dom"
import {
  findShortcutRow,
  formatKeys,
  formatSpokenKeys,
  getShortcutList,
  isMacUserAgent,
  isWidgetKey,
  registerShortcuts,
} from "./shortcuts"

registerDom()

describe("formatKeys", () => {
  test("renders modifiers as Apple symbols on a mac, spelled out elsewhere", () => {
    expect(formatKeys("mod+k", true)).toEqual(["⌘", "K"])
    expect(formatKeys("mod+k", false)).toEqual(["Ctrl", "K"])
  })

  test("orders the modifiers, whatever order they were written in", () => {
    expect(formatKeys("shift+mod+alt+ctrl+d", true)).toEqual(["⌃", "⌥", "⇧", "⌘", "D"])
    expect(formatKeys("shift+mod+alt+ctrl+d", false)).toEqual(["Ctrl", "Alt", "⇧", "Ctrl", "D"])
  })

  test("names the keys that have a glyph of their own", () => {
    expect(formatKeys("left", true)).toEqual(["←"])
    expect(formatKeys("escape", true)).toEqual(["Esc"])
    expect(formatKeys("enter", true)).toEqual(["↵"])
  })

  test("drops the shift from a shifted symbol, but not from a letter", () => {
    expect(formatKeys("shift+?", true)).toEqual(["?"])
    expect(formatKeys("shift+d", true)).toEqual(["⇧", "D"])
  })
})

describe("formatSpokenKeys", () => {
  test("spells the modifiers out as the platform names them", () => {
    expect(formatSpokenKeys("mod+k", true)).toBe("Command K")
    expect(formatSpokenKeys("mod+k", false)).toBe("Control K")
    expect(formatSpokenKeys("shift+alt+d", true)).toBe("Option Shift D")
    expect(formatSpokenKeys("shift+alt+d", false)).toBe("Alt Shift D")
  })

  test("names the keys whose badge is a glyph", () => {
    expect(formatSpokenKeys("left", true)).toBe("Left arrow")
    expect(formatSpokenKeys("enter", true)).toBe("Enter")
    expect(formatSpokenKeys("shift+?", true)).toBe("?")
  })
})

describe("registry", () => {
  test("groups in registration order, dedupes, and cleans up on unregister", () => {
    const removeDates = registerShortcuts([
      { group: "Date range", keys: "d", label: "Today" },
      { group: "Date range", keys: "w", label: "This week" },
    ])

    const removeNav = registerShortcuts([
      { group: "Navigation", keys: "s", label: "Sites" },
      // Same group, keys and label as a mounted one: one row, not two.
      { group: "Date range", keys: "d", label: "Today" },
    ])

    expect(getShortcutList()).toEqual([
      {
        group: "Date range",
        shortcuts: [
          { keys: "d", label: "Today" },
          { keys: "w", label: "This week" },
        ],
      },
      { group: "Navigation", shortcuts: [{ keys: "s", label: "Sites" }] },
    ])

    removeDates()

    // The duplicate the second caller registered keeps the row alive, and its group with it.
    expect(getShortcutList()).toEqual([
      { group: "Navigation", shortcuts: [{ keys: "s", label: "Sites" }] },
      { group: "Date range", shortcuts: [{ keys: "d", label: "Today" }] },
    ])

    removeNav()
    expect(getShortcutList()).toEqual([])
  })
})

describe("isMacUserAgent", () => {
  // Kept in step with react-hotkeys-hook's own `mod` resolution on purpose: if these two
  // disagree, the badge advertises a key the matcher is not listening for.
  test("a mac is a mac", () => {
    expect(
      isMacUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36",
      ),
    ).toBe(true)
  })

  test("iOS is not, even though its user agent says Mac OS", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    ]) {
      expect(isMacUserAgent(ua)).toBe(false)
    }
  })

  test("windows and linux are not", () => {
    expect(isMacUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0")).toBe(false)
    expect(isMacUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/138.0")).toBe(false)
  })
})

/**
 * A menu as the date range picker draws it: two rows with their shortcut badges, a hint badge
 * outside the rows, a disabled row and a search field.
 */
function renderMenu() {
  const menu = document.createElement("div")
  menu.setAttribute("role", "menu")
  menu.innerHTML = [
    `<input aria-label="Find" />`,
    `<div role="menuitemradio">Last 30 days <kbd data-shortcut="t">T</kbd></div>`,
    `<div role="menuitem">Keyboard shortcuts <kbd data-shortcut="?">?</kbd></div>`,
    `<div role="menuitemcheckbox" aria-disabled="true">Locked <kbd data-shortcut="l">L</kbd></div>`,
    `<span>Show by <kbd data-shortcut="b">B</kbd></span>`,
  ].join("")
  const rows = [...menu.querySelectorAll("[role^=menuitem]")]
  return { menu, rows }
}

function press(key: string, target: Element | null = null, modifiers: Partial<KeyboardEvent> = {}) {
  return { key, ctrlKey: false, metaKey: false, altKey: false, target, ...modifiers }
}

describe("isWidgetKey", () => {
  /** A focusable element inside nested roles, outermost first. */
  function inside(...roles: string[]) {
    const root = document.createElement("div")
    let parent = root
    for (const role of roles) {
      const element = document.createElement("div")
      element.setAttribute("role", role)
      parent.append(element)
      parent = element
    }
    const target = document.createElement("button")
    parent.append(target)
    return target
  }

  test("a modal, a menu and a listbox keep every key", () => {
    for (const role of ["dialog", "menu", "menubar", "listbox"]) {
      expect(isWidgetKey(inside(role), "t")).toBe(true)
      expect(isWidgetKey(inside(role), "ArrowLeft")).toBe(true)
    }
  })

  test("tabs, a grid and a radio group keep their arrows and leave letters to the page", () => {
    for (const role of ["tablist", "grid", "radiogroup"]) {
      expect(isWidgetKey(inside(role), "ArrowRight")).toBe(true)
      expect(isWidgetKey(inside(role), "Home")).toBe(true)
      expect(isWidgetKey(inside(role), "t")).toBe(false)
    }
  })

  test("tabs inside a modal still leave nothing to the page", () => {
    expect(isWidgetKey(inside("dialog", "tablist"), "t")).toBe(true)
  })

  test("a key typed outside any widget is the page's", () => {
    expect(isWidgetKey(inside(), "t")).toBe(false)
    expect(isWidgetKey(null, "ArrowLeft")).toBe(false)
  })

  test("a menu leaves the page a key it prints outside its rows, and keeps the rest", () => {
    const { menu, rows } = renderMenu()
    const target = rows[0] as Element

    expect(isWidgetKey(target, "b")).toBe(false)
    expect(isWidgetKey(target, "t")).toBe(true)
    expect(isWidgetKey(target, "x")).toBe(true)
    expect(isWidgetKey(menu.querySelector("input"), "b")).toBe(true)
  })

  test("a modal keeps a key it prints, since its badges may only list the page's shortcuts", () => {
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.innerHTML = `<kbd data-shortcut="d">D</kbd><button>Close</button>`

    expect(isWidgetKey(dialog.querySelector("button"), "d")).toBe(true)
  })
})

describe("findShortcutRow", () => {
  test("a key printed beside a row finds that row, whatever its case", () => {
    const { menu, rows } = renderMenu()

    expect(findShortcutRow(menu, press("t", rows[0]))).toBe(rows[0] as HTMLElement)
    expect(findShortcutRow(menu, press("T", rows[0]))).toBe(rows[0] as HTMLElement)
  })

  test("a symbol typed with Shift finds its row", () => {
    const { menu, rows } = renderMenu()

    expect(findShortcutRow(menu, press("?", rows[0]))).toBe(rows[1] as HTMLElement)
  })

  test("a disabled row is still found, so its key does not fall through to the typeahead", () => {
    const { menu, rows } = renderMenu()

    expect(findShortcutRow(menu, press("l", rows[0]))).toBe(rows[2] as HTMLElement)
  })

  test("a key with Ctrl, Cmd or Alt held, a named key or a space finds nothing", () => {
    const { menu, rows } = renderMenu()

    expect(findShortcutRow(menu, press("t", rows[0], { ctrlKey: true }))).toBeUndefined()
    expect(findShortcutRow(menu, press("t", rows[0], { metaKey: true }))).toBeUndefined()
    expect(findShortcutRow(menu, press("t", rows[0], { altKey: true }))).toBeUndefined()
    expect(findShortcutRow(menu, press("Enter", rows[0]))).toBeUndefined()
    expect(findShortcutRow(menu, press(" ", rows[0]))).toBeUndefined()
  })

  test("a key typed into an empty field in the menu still finds its row", () => {
    const { menu, rows } = renderMenu()

    expect(findShortcutRow(menu, press("t", menu.querySelector("input")))).toBe(
      rows[0] as HTMLElement,
    )
  })

  test("once the field holds a query, a key typed into it finds nothing", () => {
    const { menu } = renderMenu()
    const field = menu.querySelector("input") as HTMLInputElement
    field.value = "a"

    expect(findShortcutRow(menu, press("t", field))).toBeUndefined()
  })

  test("a badge outside the rows and a key with no badge find nothing", () => {
    const { menu, rows } = renderMenu()

    expect(findShortcutRow(menu, press("b", rows[0]))).toBeUndefined()
    expect(findShortcutRow(menu, press("x", rows[0]))).toBeUndefined()
  })
})
