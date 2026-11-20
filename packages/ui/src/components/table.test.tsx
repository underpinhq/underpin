import { describe, expect, mock, test } from "bun:test"
import type { ReactNode } from "react"
import { click, listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

const COLUMNS = [
  { width: "minmax(0,1fr)" },
  { width: "6rem", align: "end" as const },
  { width: "8rem", priority: "medium" as const },
  { width: "5rem", priority: "low" as const },
  { width: "2.5rem", skeleton: false },
]

async function renderTable(
  body: ReactNode,
  options: { header?: boolean; footer?: ReactNode } = {},
) {
  const { Table, TableHead, TableHeader } = await import("./table")

  return render(
    <Table aria-label="Sites" columns={COLUMNS} footer={options.footer}>
      {options.header !== false && (
        <TableHeader sticky>
          <TableHead sort="ascending" onSort={() => {}}>
            Site
          </TableHead>
          <TableHead align="end">Visitors</TableHead>
          <TableHead priority="medium">Trend</TableHead>
          <TableHead priority="low">Added</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableHeader>
      )}
      {body}
    </Table>,
  )
}

function getTable() {
  const table = document.querySelector<HTMLElement>('[role="table"], [role="list"]')
  if (!table) throw new Error("No table rendered")
  return table
}

describe("Table", () => {
  test("drops a column's track at the width its priority gives way", async () => {
    const { TableBody } = await import("./table")
    const view = await renderTable(<TableBody />)
    const { style } = getTable()

    expect(style.getPropertyValue("--table-columns")).toBe("minmax(0,1fr) 6rem 2.5rem")
    expect(style.getPropertyValue("--table-columns-md")).toBe("minmax(0,1fr) 6rem 8rem 2.5rem")
    expect(style.getPropertyValue("--table-columns-lg")).toBe("minmax(0,1fr) 6rem 8rem 5rem 2.5rem")

    const heads = [...document.querySelectorAll("th")]
    expect(heads[2]?.className).toContain("@max-2xl:hidden")
    expect(heads[3]?.className).toContain("@max-4xl:hidden")

    await view.unmount()
  })

  test("drops a lowest column below a 1152px table", async () => {
    const { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } =
      await import("./table")
    const view = await render(
      <Table
        aria-label="Workspaces"
        columns={[
          { width: "minmax(0,1fr)" },
          { width: "6rem", priority: "low" },
          { width: "5rem", priority: "lowest" },
        ]}
      >
        <TableHeader>
          <TableHead>Workspace</TableHead>
          <TableHead priority="low">Plan</TableHead>
          <TableHead priority="lowest">Sites</TableHead>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Acme</TableCell>
            <TableCell priority="low">Pro</TableCell>
            <TableCell priority="lowest">6</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    const { style } = getTable()
    expect(style.getPropertyValue("--table-columns")).toBe("minmax(0,1fr)")
    expect(style.getPropertyValue("--table-columns-md")).toBe("minmax(0,1fr)")
    expect(style.getPropertyValue("--table-columns-lg")).toBe("minmax(0,1fr) 6rem")
    expect(style.getPropertyValue("--table-columns-xl")).toBe("minmax(0,1fr) 6rem 5rem")
    expect(getTable().className).toContain("@6xl:grid-cols-(--table-columns-xl)")

    const [name, plan, sites] = document.querySelectorAll("td")
    expect(sites?.className).toContain("@max-6xl:hidden")
    expect(sites?.getAttribute("data-priority")).toBe("lowest")
    // Below 1152px Plan ends the row and takes the trailing inset; below 896px the name does.
    const lowestGone = "@max-6xl:[&:not(:has(~:not([data-priority=lowest])))]:pr-5"
    expect(plan?.className).toContain(lowestGone)
    expect(name?.className).toContain(
      "@max-4xl:[&:not(:has(~:not([data-priority=low]):not([data-priority=lowest])))]:pr-5",
    )

    await view.unmount()
  })

  test("gives the trailing inset to the last cell still shown as columns drop", async () => {
    const { Table, TableBody, TableCell, TableRow } = await import("./table")
    const view = await render(
      <Table
        aria-label="Events"
        columns={[
          { width: "6rem" },
          { width: "1fr" },
          { width: "6rem", priority: "medium" },
          { width: "5rem", priority: "low" },
        ]}
      >
        <TableBody>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Page</TableCell>
            <TableCell priority="medium">Country</TableCell>
            <TableCell priority="low">Device</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    const [time, page, country, device] = document.querySelectorAll("td")
    const lowGone =
      "@max-4xl:[&:not(:has(~:not([data-priority=low]):not([data-priority=lowest])))]:pr-5"
    const bothGone = "@max-2xl:[&:not(:has(~:not([data-priority])))]:pr-5"
    expect(country?.getAttribute("data-priority")).toBe("medium")
    expect(device?.getAttribute("data-priority")).toBe("low")
    expect(time?.hasAttribute("data-priority")).toBe(false)
    // The rules match the cell whose later siblings are all gone at that width, which happy-dom
    // cannot evaluate: it has no relative `:has()`. Below 896px Country ends the row, below
    // 672px Page does.
    for (const cell of [time, page, country]) expect(cell?.className).toContain(lowGone)
    expect(page?.className).toContain(bothGone)

    await view.unmount()
  })

  test("draws one line under the header and none above the first row", async () => {
    const { TableBody, TableCell, TableRow } = await import("./table")
    const view = await renderTable(
      <TableBody>
        <TableRow>
          <TableCell>One</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Two</TableCell>
        </TableRow>
      </TableBody>,
    )

    const header = document.querySelector("thead")
    expect(header?.className).toContain("border-b")
    expect(header?.hasAttribute("data-sticky")).toBe(true)
    expect(document.querySelector("tbody")?.className).toContain(
      "[&:first-of-type>:first-child]:border-t-0",
    )
    for (const row of document.querySelectorAll("tbody > tr")) {
      expect(row.className).toContain("border-t")
    }

    await view.unmount()
  })

  test("sorts from a column name and announces the order", async () => {
    const { Table, TableHead, TableHeader } = await import("./table")
    const onSort = mock(() => {})
    const view = await render(
      <Table aria-label="Sites" columns={[{ width: "1fr" }]}>
        <TableHeader>
          <TableHead sort="descending" onSort={onSort}>
            Added
          </TableHead>
        </TableHeader>
      </Table>,
    )

    const head = document.querySelector("th")
    expect(head?.getAttribute("aria-sort")).toBe("descending")
    const button = head?.querySelector("button")
    if (!button) throw new Error("No sort button")
    await click(button)
    expect(onSort).toHaveBeenCalledTimes(1)

    await view.unmount()
  })

  test("stretches the row link over the row and keeps the menu above it", async () => {
    const { TableActionsCell, TableBody, TableCell, TableIdentityCell, TableRow, TableRowLink } =
      await import("./table")
    const view = await renderTable(
      <TableBody>
        <TableRow size="identity">
          <TableIdentityCell
            leading={<span>F</span>}
            title={<TableRowLink href="/figma">Figma</TableRowLink>}
            detail="figma.com"
          />
          <TableCell align="end">1,204</TableCell>
          <TableCell priority="medium">Up</TableCell>
          <TableCell priority="low">Sep 16</TableCell>
          <TableActionsCell>
            <button type="button">Actions</button>
          </TableActionsCell>
        </TableRow>
        <TableRow inactive>
          <TableCell>Not a link</TableCell>
          <TableCell align="end">0</TableCell>
          <TableCell priority="medium">-</TableCell>
          <TableCell priority="low">-</TableCell>
          <TableActionsCell>
            <button type="button">More</button>
          </TableActionsCell>
        </TableRow>
      </TableBody>,
    )

    const [linked, plain] = [...document.querySelectorAll("tbody > tr")]
    expect(linked?.className).toContain("h-13")
    expect(linked?.className).toContain("relative")
    // The hover fill applies only to a row that holds a row link, and never over the press fill.
    expect(linked?.className).toContain("has-[[data-row-link]:not(:active)]:hover:bg-canvas")
    expect(linked?.className).toContain("has-[[data-press-target]:active]:bg-fill-strong")
    expect(linked?.className).not.toContain("has-[[data-row-link]]:hover:bg-canvas")
    expect(linked?.querySelector("[data-row-link]")).not.toBeNull()
    expect(plain?.querySelector("[data-row-link]")).toBeNull()
    expect(plain?.hasAttribute("data-inactive")).toBe(true)

    const link = document.querySelector("a")
    expect(link?.className).toContain("after:inset-0")
    expect(link?.hasAttribute("data-press-target")).toBe(true)

    const menu = document.querySelector('[data-slot="actions"] > span')
    expect(menu?.className).toContain("z-10")
    expect(menu?.className).toContain("group-hover/row:opacity-100")

    expect(await listAxeViolations()).toEqual([])
    await view.unmount()
  })

  test("keeps a checkbox in a faded row above the row link", async () => {
    const { Table, TableBody, TableCheckboxCell, TableIdentityCell, TableRow, TableRowLink } =
      await import("./table")
    const view = await render(
      <Table aria-label="Sites" columns={[{ width: "2rem" }, { width: "1fr" }]}>
        <TableBody>
          <TableRow inactive>
            <TableCheckboxCell label="Select Figma" checked={false} />
            <TableIdentityCell title={<TableRowLink href="/figma">Figma</TableRowLink>} />
          </TableRow>
        </TableBody>
      </Table>,
    )

    const row = document.querySelector("tbody > tr")
    // The fade skips the checkbox cell, whose box would otherwise sit in its own stacking
    // context, under the link; the box fades itself.
    expect(row?.className).toContain(
      "data-inactive:*:not-data-[slot=actions]:not-data-[slot=checkbox]:not-data-[slot=mono]:opacity-50",
    )
    // The link's cell sits on a layer above the faded cells after it, so the link still covers them.
    expect(row?.className).toContain("*:has-[[data-row-link]]:z-1")
    const cell = row?.querySelector('[data-slot="checkbox"]')
    expect(cell?.tagName).toBe("TD")
    const box = cell?.querySelector('[role="checkbox"]')
    expect(box?.className).toContain("z-10")
    expect(box?.className).toContain("in-data-inactive:opacity-50")

    await view.unmount()
  })

  test("renders the select-all box as a head cell with its props", async () => {
    const { Table, TableCheckboxCell, TableHeader } = await import("./table")
    const view = await render(
      <Table aria-label="Sites" columns={[{ width: "2rem" }]}>
        <TableHeader>
          <TableCheckboxCell header id="select-all" priority="low" label="Select all" />
        </TableHeader>
      </Table>,
    )

    const head = document.querySelector("th")
    expect(head?.id).toBe("select-all")
    expect(head?.getAttribute("data-slot")).toBe("checkbox")
    expect(head?.className).toContain("@max-4xl:hidden")

    await view.unmount()
  })

  test("renders a list layout with list items and no header", async () => {
    const { Table, TableBody, TableCell, TableGroupHeader, TableHead, TableHeader, TableRow } =
      await import("./table")
    const view = await render(
      <Table aria-label="Members" layout="list" columns={[{ width: "1fr" }, { width: "6rem" }]}>
        <TableHeader>
          <TableHead>Name</TableHead>
        </TableHeader>
        <TableBody>
          <TableGroupHeader>Owners</TableGroupHeader>
          <TableRow>
            <TableCell>Alex Morgan</TableCell>
            <TableCell>Owner</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(document.querySelector("table")).toBeNull()
    expect(document.querySelector("thead")).toBeNull()
    expect(getTable().getAttribute("role")).toBe("list")
    // The group heading is a list item holding a heading, the row another list item.
    const items = [...document.querySelectorAll('[role="listitem"]')]
    expect(items.length).toBe(2)
    expect(items[0]?.querySelector('[role="heading"]')?.textContent).toBe("Owners")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("draws each cell type", async () => {
    const {
      TableBadgeCell,
      TableBody,
      TableCheckboxCell,
      TableCountryCell,
      TableDateCell,
      TableMeterCell,
      TableMonoCell,
      TableNumberCell,
      TablePersonCell,
      TableRow,
      TableSparklineCell,
      TableTagsCell,
      Table,
    } = await import("./table")
    const columns = Array.from({ length: 11 }, () => ({ width: "8rem" }))
    const view = await render(
      <Table aria-label="Cells" columns={columns}>
        <TableBody>
          <TableRow>
            <TableCheckboxCell label="Select Figma" checked={false} />
            <TableNumberCell>$1,234.56</TableNumberCell>
            <TableDateCell>2 days ago</TableDateCell>
            <TableBadgeCell>
              <span>Published</span>
            </TableBadgeCell>
            <TableTagsCell tags={["Design", "Editor", "Free", "Web"]} />
            <TableSparklineCell data={[1, 3, 2]} />
            <TableMeterCell value={95} max={100} label="95 of 100" />
            <TableCountryCell flag={<span>PL</span>} name="Poland" />
            <TableMonoCell value="hs_live_123" copy />
            <TablePersonCell avatar={<span>A</span>} name="Alex Morgan" />
            <TableNumberCell>12</TableNumberCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    const cells = [...document.querySelectorAll("td")]
    expect(cells[0]?.querySelector('[role="checkbox"]')?.getAttribute("aria-label")).toBe(
      "Select Figma",
    )
    expect(cells[1]?.className).toContain("justify-end")
    expect(cells[1]?.className).toContain("tabular-nums")
    expect(cells[2]?.className).toContain("text-ink-muted")
    expect(cells[4]?.textContent).toBe("DesignEditor+2")
    expect(cells[5]?.querySelector("svg")).not.toBeNull()
    const meter = cells[6]?.querySelector('[role="meter"]')
    expect(meter?.getAttribute("aria-valuenow")).toBe("95")
    expect(meter?.firstElementChild?.className).toContain("bg-warning")
    expect(cells[7]?.textContent).toBe("PLPoland")
    expect(cells[8]?.querySelector("button")?.getAttribute("aria-label")).toBe("Copy to clipboard")
    // A faded row skips this cell and fades its value and button, so the button stays clickable.
    expect(cells[8]?.getAttribute("data-slot")).toBe("mono")
    expect(cells[8]?.querySelector("button")?.className).toContain("in-data-inactive:opacity-50")
    expect(cells[9]?.textContent).toBe("AAlex Morgan")

    expect(await listAxeViolations()).toEqual([])
    await view.unmount()
  })

  test("colours a meter by the tone it is given over its share", async () => {
    const { TableBody, TableMeterCell, TableRow } = await import("./table")
    const view = await renderTable(
      <TableBody>
        <TableRow>
          <TableMeterCell value={20} max={100} tone="danger" />
          <TableMeterCell value={20} max={100} />
          <TableMeterCell value={95} max={100} tone="brand" />
        </TableRow>
      </TableBody>,
    )

    const bars = [...document.querySelectorAll('[role="meter"] > span')]
    expect(bars.map(bar => bar.className.split(" ").find(name => name.startsWith("bg-")))).toEqual([
      "bg-danger",
      "bg-ink",
      "bg-brand",
    ])
    await view.unmount()
  })

  test("draws a meter as a ring before the figure", async () => {
    const { TableBody, TableMeterCell, TableRow } = await import("./table")
    const view = await renderTable(
      <TableBody>
        <TableRow>
          <TableMeterCell value={25} max={100} label="25 of 100 rows" layout="ring" tone="danger" />
          <TableMeterCell value={0} max={100} label="0 of 100 rows" layout="ring" />
        </TableRow>
      </TableBody>,
    )

    const [quarter, empty] = document.querySelectorAll("td")
    const meter = quarter?.querySelector('[role="meter"]')
    expect(meter?.getAttribute("aria-valuenow")).toBe("25")
    expect(quarter?.lastElementChild?.textContent).toBe("25 of 100 rows")
    const arcs = quarter?.querySelectorAll("circle") ?? []
    expect(arcs[1]?.getAttribute("class")).toContain("stroke-danger")
    // A quarter of the circle's length is drawn, the rest is the gap.
    const [drawn, length] = (arcs[1]?.getAttribute("stroke-dasharray") ?? "").split(" ").map(Number)
    expect(drawn).toBeCloseTo((length ?? 0) / 4)
    // An empty meter draws the track alone.
    expect(empty?.querySelectorAll("circle").length).toBe(1)
    await view.unmount()
  })

  test("heads a run of rows with a sticky group header", async () => {
    const { TableBody, TableGroupHeader } = await import("./table")
    const view = await renderTable(
      <TableBody>
        <TableGroupHeader>Today</TableGroupHeader>
      </TableBody>,
    )

    const heading = document.querySelector('[role="rowheader"]')
    expect(heading?.textContent).toBe("Today")
    expect(heading?.className).toContain("col-span-full")
    expect(heading?.parentElement?.className).toContain("sticky")
    // Above the row controls (`z-10`), below a sticky header (`z-20`).
    expect(heading?.parentElement?.className).toContain("z-15")
    expect(document.querySelector("thead")?.className).toContain("z-20")
    // Under a sticky header, the heading sticks below it.
    expect(getTable().className).toContain("has-[>[data-sticky]]:[--table-header-height")

    await view.unmount()
  })

  test("stands one skeleton per column in for a loading row", async () => {
    const { TableBody, TableSkeletonRow } = await import("./table")
    const view = await renderTable(
      <TableBody aria-busy>
        <TableSkeletonRow size="identity" />
        <TableSkeletonRow index={1} />
      </TableBody>,
    )

    const [identity, plain] = [...document.querySelectorAll("tbody > tr")]
    expect(identity?.getAttribute("aria-hidden")).toBe("true")
    expect(identity?.className).toContain("h-13")
    expect(identity?.children.length).toBe(COLUMNS.length)
    // The name cell holds a tile and two lines; the actions column stays blank.
    expect(identity?.children[0]?.querySelectorAll('[aria-hidden="true"]').length).toBe(3)
    expect(identity?.children[4]?.childElementCount).toBe(0)
    expect(identity?.children[2]?.className).toContain("@max-2xl:hidden")
    expect(plain?.children[0]?.firstElementChild?.className).toContain("w-28")

    await view.unmount()
  })

  test("puts the name stand-in past a leading checkbox column", async () => {
    const { Table, TableBody, TableSkeletonRow } = await import("./table")
    const view = await render(
      <Table
        aria-label="Sites"
        columns={[{ width: "2rem", skeleton: false }, { width: "1fr" }, { width: "6rem" }]}
      >
        <TableBody>
          <TableSkeletonRow size="identity" />
        </TableBody>
      </Table>,
    )

    const cells = [...(document.querySelector("tbody > tr")?.children ?? [])]
    expect(cells[0]?.childElementCount).toBe(0)
    expect(cells[1]?.querySelectorAll('[aria-hidden="true"]').length).toBe(3)
    expect(cells[2]?.querySelectorAll('[aria-hidden="true"]').length).toBe(1)

    await view.unmount()
  })

  test("replaces the rows with a message that keeps the header", async () => {
    const { TableBody, TableMessage } = await import("./table")

    for (const kind of ["empty", "filtered", "error"] as const) {
      const view = await renderTable(
        <TableBody>
          <TableMessage
            kind={kind}
            icon={kind === "empty" ? <svg data-own /> : undefined}
            title="Nothing here"
            action={<button type="button">Act</button>}
          />
        </TableBody>,
      )

      expect(document.querySelector("thead")).not.toBeNull()
      const message = document.querySelector(`[data-kind="${kind}"]`)
      expect(message?.textContent).toContain("Nothing here")
      expect(message?.querySelector("svg")).not.toBeNull()
      if (kind === "empty") expect(message?.querySelector("[data-own]")).not.toBeNull()
      expect(message?.querySelector('[role="alert"]') !== null).toBe(kind === "error")
      expect(await listAxeViolations()).toEqual([])

      await view.unmount()
    }
  })

  test("puts the footer band inside the card, after the table", async () => {
    const { TableBody } = await import("./table")
    const view = await renderTable(<TableBody />, { footer: <div data-footer>Band</div> })

    const footer = document.querySelector("[data-footer]")
    expect(footer?.previousElementSibling?.tagName).toBe("TABLE")
    expect(footer?.parentElement?.className).toContain("shadow-card")

    await view.unmount()
  })
})
