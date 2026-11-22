import { afterEach, describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

// happy-dom fetches no image, so an `<img>` with an absolute URL reads as settled and broken. A
// test that needs another state replaces `complete` and `naturalWidth`, then fires the image's
// events itself.
const stubbed = new Map<string, PropertyDescriptor | undefined>()

function stubImages(values: { complete: boolean; naturalWidth?: number }) {
  for (const [key, value] of Object.entries(values)) {
    stubbed.set(key, Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, key))

    Object.defineProperty(HTMLImageElement.prototype, key, {
      configurable: true,
      get: () => value,
    })
  }
}

function holdImagesLoading() {
  stubImages({ complete: false })
}

async function fire(image: Element | null, type: "load" | "error") {
  const { act } = await import("react")

  if (!image) throw new Error("No image to fire on")
  await act(async () => image.dispatchEvent(new Event(type)))
}

function findImage() {
  return document.querySelector("img")
}

afterEach(() => {
  for (const [key, descriptor] of stubbed) {
    if (descriptor) Object.defineProperty(HTMLImageElement.prototype, key, descriptor)
  }

  stubbed.clear()
})

describe("Favicon", () => {
  test("shows the first letter, past `www.`, while the icon loads", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon src="https://icons.test/github.com" name="www.github.com" />)

    expect(document.body.textContent).toBe("G")
    expect(findImage()?.className).toContain("opacity-0")

    await view.unmount()
  })

  test("drops the letter once the icon loads", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon src="https://icons.test/github.com" name="github.com" />)
    await fire(findImage(), "load")

    expect(document.body.textContent).toBe("")
    expect(findImage()?.className).not.toContain("opacity-0")

    await view.unmount()
  })

  test("removes a failed icon and keeps the fallback", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const view = await render(
      <Favicon
        src="https://icons.test/nothing.test"
        name="nothing.test"
        fallback={<svg data-globe />}
      />,
    )
    await fire(findImage(), "error")

    expect(findImage()).toBeNull()
    expect(document.querySelector("[data-globe]")).not.toBeNull()

    await view.unmount()
  })

  test("keeps the fallback back until the icon fails", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const view = await render(
      <Favicon
        src="https://icons.test/github.com"
        name="github.com"
        fallback={<svg data-globe />}
      />,
    )

    expect(document.querySelector("[data-globe]")).toBeNull()
    expect(document.body.textContent).toBe("G")

    await view.unmount()
  })

  test("shows nothing while an icon with no name loads", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon src="https://icons.test/github.com" />)

    expect(document.querySelector("span")?.children).toHaveLength(1)
    expect(findImage()).not.toBeNull()

    await view.unmount()
  })

  test("reads an icon that loaded before it mounted", async () => {
    stubImages({ complete: true, naturalWidth: 32 })
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon src="https://icons.test/github.com" name="github.com" />)

    expect(document.body.textContent).toBe("")
    expect(findImage()?.className).not.toContain("opacity-0")

    await view.unmount()
  })

  test("reads an icon that failed before it mounted", async () => {
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon src="https://icons.test/nothing.test" name="nothing.test" />)

    expect(findImage()).toBeNull()
    expect(document.body.textContent).toBe("N")

    await view.unmount()
  })

  test("tries a new URL after the previous one failed", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon src="https://icons.test/nothing.test" name="nothing.test" />)
    await fire(findImage(), "error")
    await view.rerender(<Favicon src="https://icons.test/github.com" name="github.com" />)

    expect(findImage()?.getAttribute("src")).toBe("https://icons.test/github.com")
    expect(document.body.textContent).toBe("G")

    await view.unmount()
  })

  test("renders only the fallback with no URL", async () => {
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon name="Acme" />)

    expect(findImage()).toBeNull()
    expect(document.body.textContent).toBe("A")

    await view.rerender(<Favicon name="Acme" fallback={<svg data-globe />} />)

    expect(document.querySelector("[data-globe]")).not.toBeNull()
    expect(document.body.textContent).toBe("")

    await view.unmount()
  })

  test("draws no empty box for an empty name", async () => {
    const { Favicon } = await import("./favicon")

    const view = await render(<Favicon name="" />)

    expect(document.querySelector("span")?.children).toHaveLength(0)

    await view.unmount()
  })

  test("sizes the box and the image", async () => {
    holdImagesLoading()
    const { Favicon } = await import("./favicon")

    const sizes = [
      ["sm", "size-4", 16],
      ["md", "size-5", 20],
      ["lg", "size-7", 16],
    ] as const

    for (const [size, box, pixels] of sizes) {
      const view = await render(
        <Favicon src="https://icons.test/github.com" name="github.com" size={size} />,
      )

      expect(document.querySelector("span")?.className).toContain(box)
      expect(findImage()?.getAttribute("width")).toBe(String(pixels))

      await view.unmount()
    }
  })

  test("is hidden from assistive tech unless it has a label", async () => {
    const { Favicon } = await import("./favicon")

    const view = await render(
      <p>
        <Favicon name="github.com" />
        github.com
      </p>,
    )

    expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(await listAxeViolations()).toEqual([])

    await view.rerender(<Favicon name="github.com" label="GitHub" />)

    expect(document.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("GitHub")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })
})
