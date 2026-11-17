import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { BrowserIcon, DeviceIcon, Favicon, Flag, OsIcon } from "./components.js"
import { loadBrowserLogo, loadFlag, preloadImages } from "./images.js"

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
})

describe("components", () => {
  test("render a preloaded flag and logo on the first render", async () => {
    await preloadImages({ flags: ["de"], browsers: ["Firefox"] })

    expect(renderToStaticMarkup(<Flag code="DE" />)).toMatch(
      /^<img src="data:image\/svg\+xml;base64,[^"]+" alt="" width="16" height="12"/,
    )
    expect(renderToStaticMarkup(<BrowserIcon name="Firefox" size={20} />)).toMatch(
      /^<img src="data:image\/png;base64,[^"]+" alt="" width="20" height="20"/,
    )
  })

  test("hold the space while an image has not loaded", () => {
    expect(renderToStaticMarkup(<Flag code="jp" />)).toBe(
      '<span aria-hidden="true" style="display:inline-block;width:16px;height:12px"></span>',
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
