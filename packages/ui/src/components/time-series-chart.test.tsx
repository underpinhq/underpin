import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { registerDom, render } from "../test-dom"

registerDom()

const POINTS = [
  { date: new Date("2026-09-01T00:00:00Z"), value: 4 },
  { date: new Date("2026-09-02T00:00:00Z"), value: 9 },
]

/** The chart's props, with every reading formatted plainly. */
const PROPS = {
  data: POINTS,
  label: "Visitors",
  formatTick: String,
  formatValue: String,
  formatDate: (date: Date) => date.toISOString(),
  formatTooltipDate: (date: Date) => date.toISOString(),
}

describe("TimeSeriesChart", () => {
  test("the entry reaches the chart library only through a dynamic import", () => {
    const source = readFileSync(new URL("./time-series-chart.tsx", import.meta.url), "utf8")
    const staticImports = source.match(/^import .+ from "[^"]+"/gm) ?? []

    expect(staticImports.some(line => line.includes("@tanstack/charts"))).toBe(false)
    // A type import is erased from the build, so it loads nothing.
    expect(
      staticImports.filter(
        line => line.includes("time-series-plot") && !line.startsWith("import type"),
      ),
    ).toEqual([])
    expect(source).toContain('import("../lib/time-series-plot")')
  })

  test("draws its skeleton until the chart's code arrives, then the chart", async () => {
    const { act } = await import("react")
    const { TimeSeriesChart, loadTimeSeriesChart } = await import("./time-series-chart")

    // A server render does not wait for the lazy module, so it shows what a reader sees while
    // the chart's code is on its way: the skeleton in the chart's place.
    const { renderToString } = await import("react-dom/server")
    const first = renderToString(<TimeSeriesChart {...PROPS} className="chart-marker" />)
    expect(first).toContain("animate-pulse")
    expect(first).not.toContain("chart-marker")

    const view = await render(<TimeSeriesChart {...PROPS} className="chart-marker" />)
    await act(async () => {
      await loadTimeSeriesChart()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(document.querySelector(".chart-marker")).not.toBeNull()
    expect(document.querySelector(".animate-pulse")).toBeNull()

    await view.unmount()
  })

  test("the skeleton takes a height of its own", async () => {
    const { TimeSeriesChartSkeleton } = await import("./time-series-chart")

    const view = await render(<TimeSeriesChartSkeleton className="h-48" />)
    const skeleton = document.querySelector(".animate-pulse")
    expect(skeleton?.className).toContain("h-48")
    expect(skeleton?.className).not.toContain("h-64")

    await view.unmount()
  })

  test("a chart that fails shows a retry in its place, and the retry draws it again", async () => {
    const { act } = await import("react")
    const { TimeSeriesChart, loadTimeSeriesChart } = await import("./time-series-chart")
    await loadTimeSeriesChart()

    // Data the plot cannot read throws while it renders, as a chunk that failed to load would.
    const broken = { ...PROPS, data: undefined as unknown as typeof POINTS }
    const silenced = console.error
    console.error = () => {}

    const view = await render(
      <main>
        <p>Page marker</p>
        <TimeSeriesChart {...broken} className="chart-marker" />
      </main>,
    )
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    console.error = silenced

    expect(document.body.textContent).toContain("Page marker")
    expect(document.body.textContent).toContain("Couldn’t load the chart")

    await view.rerender(
      <main>
        <p>Page marker</p>
        <TimeSeriesChart {...PROPS} className="chart-marker" />
      </main>,
    )
    const retry = [...document.querySelectorAll("button")].find(button =>
      button.textContent?.includes("Try again"),
    )
    await act(async () => {
      retry?.click()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(document.body.textContent).not.toContain("Couldn’t load the chart")
    expect(document.querySelector(".chart-marker")).not.toBeNull()

    await view.unmount()
  })

  test("takes its accessible name for the plot, not for the box around it", async () => {
    const { TimeSeriesChart, loadTimeSeriesChart } = await import("./time-series-chart")
    await loadTimeSeriesChart()

    const view = await render(
      <TimeSeriesChart {...PROPS} aria-label="Clicks over the last 30 days" className="named" />,
    )

    expect(document.querySelector(".named")?.getAttribute("aria-label")).toBeNull()

    await view.unmount()
  })
})
