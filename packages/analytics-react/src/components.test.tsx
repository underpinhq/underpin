import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { BrowserIcon, DeviceIcon, Favicon, Flag, OsIcon } from "./components.js"
import { loadBrowserLogo, loadFlag, loadImage, preloadImages, selectImage } from "./images.js"

describe("loaders", () => {
  test("load a flag in any case as a data URI", async () => {
    expect(await loadFlag("PL")).toStartWith("data:image/svg+xml;base64,")
    expect(await loadFlag("pl")).toBe(await loadFlag("PL"))
  })

  test("load a browser logo by its parser name", async () => {
    expect(await loadBrowserLogo("Mobile Chrome")).toStartWith("data:image/png;base64,")
    expect(await loadBrowserLogo("Mobile Chrome")).toBe(await loadBrowserLogo("Chrome"))
  })

  test("return undefined for a name without an image", async () => {
    expect(await loadFlag("zz")).toBeUndefined()
    expect(await loadFlag("")).toBeUndefined()
    expect(await loadBrowserLogo("Lynx")).toBeUndefined()
  })

  test("retry a load that failed", async () => {
    let attempts = 0
    async function loader() {
      attempts += 1

      if (attempts === 1) {
        throw new Error("Offline")
      }

      return { default: "data:image/png;base64,AA==" }
    }

    await expect(loadImage(loader)).rejects.toThrow("Offline")
    expect(await loadImage(loader)).toBe("data:image/png;base64,AA==")
    expect(attempts).toBe(2)
  })
})

describe("image selection", () => {
  async function loader() {
    return { default: "data:image/png;base64,AA==" }
  }

  test("show the placeholder until hydration ends, even for a cached image", async () => {
    await loadImage(loader)

    expect(selectImage(loader, false, undefined)).toBeUndefined()
    expect(selectImage(loader, true, undefined)).toBe("data:image/png;base64,AA==")
  })

  test("show no image without a loader, on the server too", () => {
    expect(selectImage(undefined, false, undefined)).toBeNull()
    expect(selectImage(undefined, true, undefined)).toBeNull()
  })

  test("show the last finished load only for its own loader", async () => {
    async function other() {
      return { default: "data:image/png;base64,BB==" }
    }

    expect(selectImage(other, true, { loader: other, image: null })).toBeNull()
    expect(selectImage(other, true, { loader, image: "stale" })).toBeUndefined()
  })
})

describe("components", () => {
  test("render the placeholder on the server even for a preloaded image, as hydration does", async () => {
    await preloadImages({ flags: ["de"], browsers: ["Firefox"] })

    expect(renderToStaticMarkup(<Flag code="DE" />)).toBe(
      '<span style="display:inline-block;width:16px;height:12px" aria-hidden="true"></span>',
    )
    expect(renderToStaticMarkup(<BrowserIcon name="Firefox" size={20} />)).toBe(
      '<span style="display:inline-block;width:20px;height:20px" aria-hidden="true"></span>',
    )
  })

  test("hold the space while an image has not loaded", () => {
    expect(renderToStaticMarkup(<Flag code="jp" />)).toBe(
      '<span style="display:inline-block;width:16px;height:12px" aria-hidden="true"></span>',
    )
  })

  test("keep the accessible name on the placeholder", () => {
    expect(renderToStaticMarkup(<Flag code="jp" title="Japan" />)).toBe(
      '<span style="display:inline-block;width:16px;height:12px" role="img" aria-label="Japan"></span>',
    )
  })

  test("fall back to a glyph, or to the caller's own", () => {
    expect(renderToStaticMarkup(<Flag code="" />)).toContain("<svg")
    expect(renderToStaticMarkup(<BrowserIcon name="Lynx" />)).toContain("<svg")
    expect(renderToStaticMarkup(<BrowserIcon name="Lynx" fallback={<i>?</i>} />)).toBe("<i>?</i>")
  })

  test("draw an OS mark in the current color", () => {
    const markup = renderToStaticMarkup(<OsIcon name="macOS" title="macOS" />)

    expect(markup).toContain('fill="currentColor"')
    expect(markup).toContain('aria-label="macOS"')
  })

  test("draw a device glyph for every type", () => {
    for (const type of [
      "desktop",
      "mobile",
      "tablet",
      "smarttv",
      "console",
      "wearable",
      "xr",
      "embedded",
      "",
      null,
    ]) {
      expect(renderToStaticMarkup(<DeviceIcon type={type} />)).toContain('stroke="currentColor"')
    }
  })

  test("render a favicon from the caller's own endpoint only", () => {
    const markup = renderToStaticMarkup(
      <Favicon domain="example.com" src={domain => `/api/favicon/${domain}`} />,
    )

    expect(markup).toContain('src="/api/favicon/example.com"')
    expect(renderToStaticMarkup(<Favicon domain="" src="/x" />)).toContain("<svg")
  })
})
