import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("Callout", () => {
  test("a callout on the page from the start is a note, whatever its tone", async () => {
    const { Callout, CalloutText } = await import("./callout")

    const view = await render(
      <Callout tone="danger">
        <CalloutText>This cannot be undone.</CalloutText>
      </Callout>,
    )

    expect(document.querySelector('[role="note"]')).not.toBeNull()
    expect(document.querySelector('[role="alert"]')).toBeNull()
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("a live callout takes the role that announces it", async () => {
    const { Callout, CalloutText } = await import("./callout")

    const view = await render(
      <>
        <Callout tone="danger" live="assertive">
          <CalloutText>The invite has expired.</CalloutText>
        </Callout>
        <Callout tone="success" live="polite">
          <CalloutText>Saved.</CalloutText>
        </Callout>
      </>,
    )

    expect(document.querySelector('[role="alert"]')?.textContent).toBe("The invite has expired.")
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Saved.")

    await view.unmount()
  })

  test("each tone draws an outline icon, coloured by the tone", async () => {
    const { Callout, CalloutText } = await import("./callout")
    const tones = ["neutral", "warning", "success", "danger"] as const

    const view = await render(
      <>
        {tones.map(tone => (
          <Callout key={tone} tone={tone}>
            <CalloutText>{tone}</CalloutText>
          </Callout>
        ))}
      </>,
    )

    const icons = [...document.querySelectorAll('[role="note"] > svg')]

    expect(icons).toHaveLength(tones.length)
    expect(icons.every(icon => icon.getAttribute("stroke-width") === "1.75")).toBe(true)
    expect(icons.map(icon => icon.getAttribute("class"))).toEqual([
      expect.stringContaining("text-ink-muted"),
      expect.stringContaining("text-warning-ink"),
      expect.stringContaining("text-success-ink"),
      expect.stringContaining("text-danger-ink"),
    ])
    expect(new Set(icons.map(icon => icon.innerHTML)).size).toBe(tones.length)

    await view.unmount()
  })

  test("a prefix replaces the tone's icon and keeps the tone's colour", async () => {
    const { Callout, CalloutText } = await import("./callout")

    const view = await render(
      <Callout tone="warning" prefix={<span data-testid="prefix" />}>
        <CalloutText>Paused.</CalloutText>
      </Callout>,
    )

    expect(document.querySelector('[role="note"] > svg')).toBeNull()
    expect(document.querySelector('[data-testid="prefix"]')?.className).toContain(
      "text-warning-ink",
    )

    await view.unmount()
  })
})
