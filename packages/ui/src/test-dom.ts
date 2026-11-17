import { afterAll, beforeAll } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import type { ReactElement } from "react"

/**
 * A DOM for the component tests (happy-dom), registered for the calling test file's run and
 * removed after it, so every other suite keeps the bare runtime.
 */

/** Viewport widths either side of `sm`. */
export const PHONE_WIDTH = 375
export const DESKTOP_WIDTH = 1024

interface Rendered {
  rerender: (element: ReactElement) => Promise<void>
  unmount: () => Promise<void>
}

interface ActEnvironment {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

declare global {
  interface Window {
    /** The handle happy-dom puts on its window, present while the DOM is registered. */
    happyDOM?: { setViewport: (viewport: { width: number }) => void }
  }
}

/**
 * Registers the DOM around the calling file's tests. A module that touches `window` as it loads
 * (React DOM, Base UI) has to be imported inside a test, after this has run, which is why
 * `render` and the suites import theirs dynamically.
 */
export function registerDom() {
  beforeAll(() => {
    GlobalRegistrator.register({ width: DESKTOP_WIDTH, height: 800 })
    ;(globalThis as ActEnvironment).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterAll(async () => {
    delete (globalThis as ActEnvironment).IS_REACT_ACT_ENVIRONMENT
    await GlobalRegistrator.unregister()
  })
}

/** Mounts an element into the document, flushing its effects before returning. */
export async function render(element: ReactElement): Promise<Rendered> {
  const { act } = await import("react")
  const { createRoot } = await import("react-dom/client")

  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => root.render(element))

  return {
    rerender: async next => act(async () => root.render(next)),
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

/** Resizes the viewport, flushing whatever re-renders on it. */
export async function resize(width: number) {
  const { act } = await import("react")

  await act(async () => window.happyDOM?.setViewport({ width }))
}

/** Presses a key on the element: its keydown, then its keyup. */
export async function press(element: Element, key: string) {
  const { act } = await import("react")

  await act(async () => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
    element.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }))
  })
}

/**
 * Clicks the element with the press events a pointer sends before the click, then lets a
 * tooltip that opens on a timer settle.
 */
export async function click(element: HTMLElement) {
  const { act } = await import("react")

  await act(async () => {
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }))
    }
    element.click()
    await new Promise(resolve => setTimeout(resolve, 20))
  })
}

/** The text of the elements an `aria-describedby` points at, as a screen reader reads it. */
export function readDescription(element: Element) {
  return (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map(id => document.getElementById(id)?.textContent)
    .join(" ")
}

/**
 * The ids of the axe rules a rendered tree breaks. Two rules are left out. Colour contrast:
 * happy-dom does no layout or painting, so axe cannot compute the colours a reader sees. And
 * `region`, which wants all content inside a landmark: a component rendered alone has no page
 * around it.
 */
export async function listAxeViolations(root: Element = document.body) {
  const { default: axe } = await import("axe-core")
  const result = await axe.run(root, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  })

  return result.violations.map(violation => violation.id)
}
