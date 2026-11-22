import { describe, expect, mock, test } from "bun:test"
import { click, listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("ErrorState", () => {
  test("says the load failed and retries on Try again", async () => {
    const { ErrorState } = await import("./error-state")
    const onRetry = mock(() => {})

    const view = await render(<ErrorState onRetry={onRetry} />)

    expect(document.querySelector('[role="alert"]')).toBeNull()
    expect(document.body.textContent).toContain("Couldn’t load this data")
    const button = document.querySelector("button")
    expect(button?.textContent).toBe("Try again")
    if (button) await click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("has no button without `onRetry`", async () => {
    const { ErrorState } = await import("./error-state")

    const view = await render(<ErrorState title="Couldn’t load the map" />)

    expect(document.body.textContent).toBe("Couldn’t load the map")
    expect(document.querySelector("button")).toBeNull()

    await view.unmount()
  })

  test("the page variant is a heading, a sentence and the retry, with its own labels", async () => {
    const { ErrorState } = await import("./error-state")

    const view = await render(
      <ErrorState
        variant="page"
        description="The error was reported."
        retryLabel="Réessayer"
        onRetry={() => {}}
      />,
    )

    expect(document.querySelector('[role="alert"] h1')?.textContent).toBe("Something went wrong")
    expect(document.body.textContent).toContain("The error was reported.")
    expect(document.querySelector("button")?.textContent).toBe("Réessayer")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })
})

describe("TableErrorState", () => {
  test("stands in for the rows with the retry", async () => {
    const { Table, TableBody } = await import("./table")
    const { TableErrorState } = await import("./error-state")

    const view = await render(
      <Table aria-label="Sites" columns={[{ width: "minmax(0,1fr)" }]}>
        <TableBody>
          <TableErrorState onRetry={() => {}} />
        </TableBody>
      </Table>,
    )

    const row = document.querySelector('[data-kind="error"]')
    expect(row?.textContent).toContain("Couldn’t load this data")
    expect(row?.querySelector("button")?.textContent).toBe("Try again")

    await view.unmount()
  })
})
