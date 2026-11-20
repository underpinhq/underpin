import { describe, expect, mock, test } from "bun:test"
import { createElement, useState } from "react"
import { registerDom, render } from "../test-dom"

registerDom()

interface ObserverRecord {
  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit
  observed: Element[]
}

const observers: ObserverRecord[] = []

class FakeObserver {
  record: ObserverRecord

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = { callback, options, observed: [] }
    observers.push(this.record)
  }

  observe(element: Element) {
    this.record.observed.push(element)
  }

  disconnect() {
    this.record.observed = []
  }
}

function reveal(record: ObserverRecord | undefined) {
  if (!record) throw new Error("No observer")
  const entries = record.observed.map(target => ({ target, isIntersecting: true }))
  record.callback(entries as IntersectionObserverEntry[], {} as IntersectionObserver)
}

describe("useLoadMore", () => {
  test("loads as the sentinel shows, and stops observing while disabled", async () => {
    const original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver

    try {
      const { useLoadMore } = await import("./load-more")
      const onLoad = mock(() => {})

      interface ListProps {
        enabled: boolean
      }

      function List({ enabled }: ListProps) {
        const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
        useLoadMore(sentinel, { enabled, onLoad, ahead: 400 })
        return createElement("div", { ref: setSentinel })
      }

      const view = await render(createElement(List, { enabled: true }))
      const active = observers.at(-1)
      expect(active?.options?.rootMargin).toBe("0px 0px 400px 0px")
      reveal(active)
      expect(onLoad).toHaveBeenCalledTimes(1)

      await view.rerender(createElement(List, { enabled: false }))
      expect(active?.observed.length).toBe(0)

      await view.unmount()
    } finally {
      globalThis.IntersectionObserver = original
    }
  })
})
