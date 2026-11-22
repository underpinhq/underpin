import { describe, expect, test } from "bun:test"
import type { ReactElement } from "react"
import { registerDom, render as renderTree } from "../test-dom"

registerDom()

const CHART = {
  data: [
    { date: new Date("2026-09-01T00:00:00Z"), value: 4 },
    { date: new Date("2026-09-02T00:00:00Z"), value: 9 },
  ],
  label: "Visitors",
  formatTick: String,
  formatValue: String,
  formatDate: (date: Date) => date.toISOString(),
  formatTooltipDate: (date: Date) => date.toISOString(),
  className: "chart-marker",
}

/** Mounts the card with the chart's code already loaded, so the chart draws on first render. */
async function render(element: ReactElement) {
  const { loadTimeSeriesChart } = await import("./time-series-chart")
  await loadTimeSeriesChart()
  const view = await renderTree(element)
  const { act } = await import("react")
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  return view
}

describe("PerformanceCard", () => {
  test("draws the header, the strip and the chart in one card", async () => {
    const { PerformanceCard } = await import("./performance-card")

    const view = await render(
      <PerformanceCard
        header={<h2>Performance</h2>}
        strip={<div>Strip marker</div>}
        chart={CHART}
        footnote="Excludes bots"
      />,
    )

    const card = document.querySelector("h2")?.parentElement
    expect(card?.textContent).toContain("Strip marker")
    expect(card?.textContent).toContain("Excludes bots")
    expect(card?.querySelector(".chart-marker")).not.toBeNull()
    expect(card?.querySelector(".chart-marker")?.className).toContain("transition-none")

    await view.unmount()
  })

  test("draws the skeleton while loading or with no chart yet", async () => {
    const { PerformanceCard } = await import("./performance-card")

    for (const props of [{ isLoading: true, chart: CHART }, {}]) {
      const view = await render(<PerformanceCard strip={null} {...props} />)
      expect(document.querySelector(".animate-pulse")).not.toBeNull()
      expect(document.querySelector(".chart-marker")).toBeNull()
      await view.unmount()
    }
  })

  test("dims the chart while it shows an earlier range", async () => {
    const { PerformanceCard } = await import("./performance-card")

    const view = await render(<PerformanceCard strip={null} chart={CHART} isPlaceholder />)
    expect(document.querySelector(".chart-marker")?.className).toContain("opacity-50")

    await view.unmount()
  })

  test("shows the error only while there is nothing to draw", async () => {
    const { PerformanceCard } = await import("./performance-card")
    const error = <p>Error marker</p>

    // A first load that failed: no chart, and the error wins over the skeleton.
    const failed = await render(<PerformanceCard strip={null} isLoading error={error} />)
    expect(document.body.textContent).toContain("Error marker")
    expect(document.querySelector(".animate-pulse")).toBeNull()
    await failed.unmount()

    // A refetch that failed keeps the series already on screen.
    const kept = await render(<PerformanceCard strip={null} chart={CHART} error={error} />)
    expect(document.body.textContent).not.toContain("Error marker")
    expect(document.querySelector(".chart-marker")).not.toBeNull()
    await kept.unmount()
  })

  test("says so when the range has no data, in its own words or the caller's", async () => {
    const { PerformanceCard } = await import("./performance-card")
    const chart = { ...CHART, data: [] }

    const plain = await render(<PerformanceCard strip={null} chart={chart} />)
    expect(document.body.textContent).toContain("No data in this range")
    await plain.unmount()

    const own = await render(
      <PerformanceCard strip={null} chart={chart} empty={<p>Nothing yet</p>} />,
    )
    expect(document.body.textContent).toContain("Nothing yet")
    await own.unmount()
  })

  test("draws the strip from its series and switches the chart on a pick", async () => {
    const { act } = await import("react")
    const { PerformanceCard } = await import("./performance-card")
    const picks: string[] = []

    const view = await render(
      <PerformanceCard
        series={[
          { id: "visitors", label: "Visitors", value: 120, chart: CHART },
          {
            id: "pageviews",
            label: "Pageviews",
            value: 340,
            chart: { ...CHART, className: "pageviews-marker" },
          },
          { id: "lifetime", label: "Lifetime", value: 9000 },
        ]}
        onValueChange={id => picks.push(id)}
      >
        <p>Note marker</p>
      </PerformanceCard>,
    )

    const buttons = [...document.querySelectorAll("button")]
    // The series without a chart is a figure only.
    expect(buttons.map(button => button.textContent?.replace(/\d/g, ""))).toEqual([
      "Visitors",
      "Pageviews",
    ])
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true")
    expect(document.querySelector(".chart-marker")).not.toBeNull()
    expect(document.body.textContent).toContain("Note marker")

    await act(async () => {
      buttons[1]?.click()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(picks).toEqual(["pageviews"])
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true")
    expect(document.querySelector(".pageviews-marker")).not.toBeNull()

    await view.unmount()
  })

  test("follows the page's selection when it passes one", async () => {
    const { PerformanceCard } = await import("./performance-card")
    const series = [
      { id: "visitors", label: "Visitors", value: 120, chart: CHART },
      { id: "pageviews", label: "Pageviews", value: 340, chart: { ...CHART, className: "pv" } },
    ]

    const view = await render(<PerformanceCard series={series} value="pageviews" />)
    expect(document.querySelector(".pv")).not.toBeNull()

    await view.unmount()
  })

  test("marks the chart busy while it loads or shows an earlier range", async () => {
    const { PerformanceCard } = await import("./performance-card")

    const view = await render(<PerformanceCard strip={null} chart={CHART} isPlaceholder />)
    expect(document.querySelector("[aria-busy=true] .chart-marker")).not.toBeNull()
    await view.unmount()

    const settled = await render(<PerformanceCard strip={null} chart={CHART} />)
    expect(document.querySelector("[aria-busy]")).toBeNull()
    await settled.unmount()
  })

  test("a selection with no chart behind it falls back to the first chart", async () => {
    const { PerformanceCard } = await import("./performance-card")
    const series = [
      { id: "lifetime", label: "Lifetime", value: 9000 },
      { id: "visitors", label: "Visitors", value: 120, chart: CHART },
      { id: "pageviews", label: "Pageviews", value: 340, chart: { ...CHART, className: "pv" } },
    ]

    // A figure-only series, an id no series has, and a selection whose series was removed.
    for (const [value, shown] of [
      ["lifetime", series],
      ["unknown", series],
      ["pageviews", series.slice(0, 2)],
    ] as const) {
      const view = await render(<PerformanceCard series={[...shown]} value={value} />)
      expect(document.querySelector(".chart-marker")).not.toBeNull()
      expect(document.querySelector(".animate-pulse")).toBeNull()
      await view.unmount()
    }

    // With two charts to pick between, the fallback is the item marked as selected.
    const view = await render(<PerformanceCard series={series} value="unknown" />)
    expect(document.querySelector("[aria-pressed=true]")?.textContent).toContain("Visitors")
    await view.unmount()
  })

  test("a lone chart needs no picking, and each item takes its own classes", async () => {
    const { PerformanceCard } = await import("./performance-card")

    const view = await render(
      <PerformanceCard
        series={[
          { id: "clicks", label: "Clicks", value: 12, chart: CHART },
          { id: "ctr", label: "CTR", value: "1.2%", className: "max-sm:hidden" },
        ]}
      />,
    )

    expect(document.querySelector("button")).toBeNull()
    expect(document.querySelector("[data-selected]")).toBeNull()
    expect(document.querySelector(".chart-marker")).not.toBeNull()
    expect(document.querySelector(".max-sm\\:hidden")?.textContent).toContain("CTR")

    await view.unmount()
  })

  test("series with no chart to draw once loaded read as empty", async () => {
    const { PerformanceCard } = await import("./performance-card")

    const view = await render(<PerformanceCard series={[{ id: "a", label: "A", value: 1 }]} />)
    expect(document.body.textContent).toContain("No data in this range")
    expect(document.querySelector(".animate-pulse")).toBeNull()

    await view.unmount()
  })
})
