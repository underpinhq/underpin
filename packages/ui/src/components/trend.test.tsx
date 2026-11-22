import { describe, expect, test } from "bun:test"
import type { ReactElement } from "react"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

/** The figure, the glyph's name and the tone a reader gets from one trend. */
async function read(element: ReactElement) {
  const view = await render(element)
  const trend = document.querySelector("span")
  const glyph = trend?.querySelector("[role=img]")
  const reading = {
    text: trend?.textContent,
    label: glyph?.getAttribute("aria-label"),
    className: trend?.className ?? "",
  }
  await view.unmount()
  return reading
}

describe("Trend", () => {
  test("points the way the figure moved, coloured by whether the move is good", async () => {
    const { Trend } = await import("./trend")

    const up = await read(<Trend change={0.06} locale="en-US" />)
    expect(up).toMatchObject({ text: "6%", label: "Up" })
    expect(up.className).toContain("text-success-ink")

    const down = await read(<Trend change={-0.5} locale="en-US" />)
    expect(down).toMatchObject({ text: "50%", label: "Down" })
    expect(down.className).toContain("text-danger-ink")

    // A bounce rate that fell is good news.
    const inverted = await read(<Trend change={-0.5} invert locale="en-US" />)
    expect(inverted.className).toContain("text-success-ink")
  })

  test("a change that rounds to zero reads as no change, in the full ink", async () => {
    const { Trend } = await import("./trend")

    const flat = await read(<Trend change={0.004} locale="en-US" />)
    expect(flat).toMatchObject({ text: "0%", label: "No change" })
    expect(flat.className).toContain("text-ink")
  })

  test("a multiplier from tenfold up, with a tenth only under 100×", async () => {
    const { Trend } = await import("./trend")

    for (const [change, text] of [
      [9.99, "999%"],
      [10, "11×"],
      [11.5, "12.5×"],
      [247.43, "248×"],
      [12345, "12K×"],
    ] as const) {
      expect((await read(<Trend change={change} locale="en-US" />)).text).toBe(text)
    }
  })

  test("takes a formatter of its own for the figure", async () => {
    const { Trend } = await import("./trend")

    // Handed the change before any rounding, so a figure of its own keeps every digit.
    const reading = await read(<Trend change={0.1234} format={value => `${value * 100} pts`} />)
    expect(reading.text).toBe("12.34 pts")
  })

  test("a half rounds away from zero, down as well as up", async () => {
    const { Trend } = await import("./trend")

    for (const [change, text, label] of [
      [0.005, "1%", "Up"],
      [-0.005, "1%", "Down"],
      [0.015, "2%", "Up"],
      [-0.015, "2%", "Down"],
      [-0.0049, "0%", "No change"],
    ] as const) {
      expect(await read(<Trend change={change} locale="en-US" />)).toMatchObject({ text, label })
    }
  })

  test("reads the change to the precision it is given, glyph and figure alike", async () => {
    const { Trend } = await import("./trend")

    expect(await read(<Trend change={0.004} precision={1} locale="en-US" />)).toMatchObject({
      text: "0.4%",
      label: "Up",
    })
    expect(await read(<Trend change={-0.0004} precision={1} locale="en-US" />)).toMatchObject({
      text: "0%",
      label: "No change",
    })
  })

  test("reads a negative or fractional precision as whole decimals from zero", async () => {
    const { Trend } = await import("./trend")

    expect((await read(<Trend change={0.06} precision={-2} locale="en-US" />)).text).toBe("6%")
    expect((await read(<Trend change={0.064} precision={1.7} locale="en-US" />)).text).toBe("6.4%")
  })

  test("renders nothing for a change that is not a finite number", async () => {
    const { Trend } = await import("./trend")

    for (const change of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const view = await render(<Trend change={change} />)
      expect(document.body.textContent).toBe("")
      await view.unmount()
    }
  })

  test("is announced with its direction", async () => {
    const { Trend } = await import("./trend")

    const view = await render(<Trend change={0.06} />)
    expect(await listAxeViolations()).toEqual([])
    await view.unmount()
  })
})
