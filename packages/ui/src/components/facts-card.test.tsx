import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

function readRows() {
  return [...document.querySelectorAll("dl > div")].map(row => [
    row.firstElementChild?.textContent,
    row.lastElementChild?.textContent,
  ])
}

describe("FactsCard", () => {
  test("lists its facts in order, a missing value as a dash", async () => {
    const { FactsCard } = await import("./facts-card")

    const view = await render(
      <FactsCard
        title="Account"
        description="How the account signs in."
        facts={[
          ["Email verified", "Yes"],
          ["Referred by", null],
          ["Role", undefined],
        ]}
      />,
    )

    expect(readRows()).toEqual([
      ["Email verified", "Yes"],
      ["Referred by", "–"],
      ["Role", "–"],
    ])
    expect(document.querySelectorAll("dl")).toHaveLength(1)
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("closes with the record's ID, with copy, and its stamps", async () => {
    const { FactsCard } = await import("./facts-card")

    const view = await render(
      <FactsCard
        title="Details"
        facts={[["Plan", "Pro"]]}
        record={{
          id: "usr_123",
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: new Date("2026-03-04T05:06:07.000Z"),
          updatedLabel: "Changed",
        }}
        time={{ locale: "en-US", timeZone: "UTC" }}
      />,
    )

    expect(document.querySelectorAll("dl")).toHaveLength(2)
    const rows = readRows()
    expect(rows.map(([label]) => label)).toEqual(["Plan", "ID", "Created", "Changed"])
    expect(rows[1]?.[1]).toBe("usr_123")
    expect(rows[2]?.[1]).toContain("ago")
    const times = [...document.querySelectorAll("time")].map(time => time.getAttribute("datetime"))
    expect(times).toEqual(["2026-01-02T03:04:05.000Z", "2026-03-04T05:06:07.000Z"])
    expect(document.querySelector(".font-mono")?.textContent).toBe("usr_123")
    expect(document.querySelector("button")).not.toBeNull()
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("renders the stamps through `renderTime` when given", async () => {
    const { FactsCard } = await import("./facts-card")

    const view = await render(
      <FactsCard
        title="Details"
        record={{
          id: "usr_123",
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: "2026-03-04T05:06:07.000Z",
        }}
        renderTime={date => <span>{date.toISOString().slice(0, 10)}</span>}
      />,
    )

    expect(readRows()).toEqual([
      ["ID", "usr_123"],
      ["Created", "2026-01-02"],
      ["Updated", "2026-03-04"],
    ])

    await view.unmount()
  })

  test("two facts may share a label", async () => {
    const { FactsCard } = await import("./facts-card")
    const errors: unknown[] = []
    const original = console.error
    console.error = (...args: unknown[]) => errors.push(args)

    const view = await render(
      <FactsCard
        title="Billing"
        facts={[
          ["Customer", "cus_1"],
          ["Customer", "cus_2"],
        ]}
      />,
    )

    console.error = original
    expect(readRows()).toEqual([
      ["Customer", "cus_1"],
      ["Customer", "cus_2"],
    ])
    expect(errors).toEqual([])

    await view.unmount()
  })
})
