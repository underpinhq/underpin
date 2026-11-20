import { describe, expect, mock, test } from "bun:test"
import { click, listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

/** Thousands separators without Intl, which the package never calls itself. */
function format(value: number) {
  return String(value).replace(/\B(?=(\d{3})+$)/g, ",")
}

function listButtonLabels() {
  return [...document.querySelectorAll("button")].map(button => button.getAttribute("aria-label"))
}

function getButton(label: string) {
  const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`No button "${label}"`)
  return button
}

/** Stands in for the browser's observer, so a test can scroll an element into view. */
class FakeObserver {
  static instances: FakeObserver[] = []
  callback: IntersectionObserverCallback
  observed: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeObserver.instances.push(this)
  }

  observe(element: Element) {
    this.observed.push(element)
  }

  disconnect() {
    this.observed = []
  }

  reveal() {
    const entries = this.observed.map(target => ({ target, isIntersecting: true }))
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

describe("Pagination", () => {
  test("draws the band: the count, the page and the joined pager", async () => {
    const { Pagination } = await import("./pagination")

    const view = await render(
      <Pagination
        page={2}
        pageCount={49}
        total={1204}
        perPage={25}
        format={format}
        onPageChange={() => {}}
      />,
    )

    expect(document.body.textContent).toContain("Showing 26–50 of 1,204")
    expect(document.body.textContent).toContain("Page 2 of 49")
    expect(listButtonLabels()).toEqual(["First page", "Previous page", "Next page", "Last page"])
    for (const button of document.querySelectorAll("button")) {
      expect(button.className).toContain("aspect-square")
    }
    // The first and last buttons go on a phone, and the word "Showing" with them.
    expect(getButton("First page").className).toContain("max-sm:hidden")
    expect(document.querySelector("p > span")?.className).toBe("max-sm:hidden")
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("disables the ends of the range and every button while loading", async () => {
    const { Pagination } = await import("./pagination")
    const onPageChange = mock((_page: number) => {})

    const view = await render(
      <Pagination page={1} pageCount={3} total={60} perPage={20} onPageChange={onPageChange} />,
    )
    expect(getButton("First page").disabled).toBe(true)
    expect(getButton("Previous page").disabled).toBe(true)
    await click(getButton("Last page"))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await view.rerender(
      <Pagination
        page={2}
        pageCount={3}
        total={60}
        perPage={20}
        loading
        onPageChange={onPageChange}
      />,
    )
    for (const button of document.querySelectorAll("button")) expect(button.disabled).toBe(true)

    await view.unmount()
  })

  test("keeps only the count on a single page, and draws nothing when empty", async () => {
    const { Pagination } = await import("./pagination")

    const view = await render(
      <Pagination page={1} pageCount={1} total={12} perPage={25} onPageChange={() => {}} />,
    )
    expect(document.body.textContent).toContain("1–12 of 12")
    expect(document.querySelectorAll("button").length).toBe(0)

    // A page past the end reads as the last row.
    await view.rerender(
      <Pagination page={3} pageCount={2} total={50} perPage={25} onPageChange={() => {}} />,
    )
    expect(document.body.textContent).toContain("50–50 of 50")

    await view.rerender(
      <Pagination page={1} pageCount={0} total={0} perPage={25} onPageChange={() => {}} />,
    )
    expect(document.body.textContent).toBe("")

    await view.unmount()
  })

  test("offers a per-page select when given the sizes", async () => {
    const { Pagination } = await import("./pagination")

    const view = await render(
      <Pagination
        page={1}
        pageCount={4}
        total={100}
        perPage={25}
        perPageOptions={[25, 50, 100]}
        onPerPageChange={() => {}}
        onPageChange={() => {}}
      />,
    )
    expect(document.body.textContent).toContain("Per page")
    expect(document.querySelector('[role="combobox"]')?.textContent).toContain("25")

    await view.unmount()
  })
})

describe("PaginationInfinite", () => {
  test("loads the next page as the band comes into view, then says where the list ends", async () => {
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver
    FakeObserver.instances = []

    try {
      const { PaginationInfinite } = await import("./pagination")
      const onLoadMore = mock(() => {})

      const view = await render(
        <PaginationInfinite
          count="120 of 4,300 events"
          hasMore
          loading={false}
          onLoadMore={onLoadMore}
        />,
      )
      expect(document.body.textContent).toBe("120 of 4,300 events")
      FakeObserver.instances.at(-1)?.reveal()
      expect(onLoadMore).toHaveBeenCalledTimes(1)

      await view.rerender(
        <PaginationInfinite count="120 of 4,300 events" hasMore loading onLoadMore={onLoadMore} />,
      )
      expect(document.querySelector("output")?.textContent).toBe("Loading more…")

      await view.rerender(
        <PaginationInfinite
          count="4,300 events"
          hasMore={false}
          loading={false}
          onLoadMore={onLoadMore}
        />,
      )
      expect(document.querySelector("output")?.textContent).toBe("End of list")
      expect(await listAxeViolations()).toEqual([])

      await view.unmount()
    } finally {
      globalThis.IntersectionObserver = original
    }
  })
})
