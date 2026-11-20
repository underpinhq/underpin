"use client"

import { useEffect } from "react"

export interface LoadMoreOptions {
  /** False while a page is in flight, when there is no next page, or after a failed page. */
  enabled: boolean
  onLoad: () => void
  /** How far below the viewport the sentinel starts loading, in pixels. */
  ahead?: number
}

/**
 * Loads the next page as `sentinel` scrolls into view. The observer is dropped while a page is
 * in flight and set up again after it lands: observing fires straight away for an element
 * already on screen, which is what walks a fast scroll on through page after page. Pass the
 * element through a state setter (`ref={setSentinel}`), so the hook sees it once it mounts.
 */
export function useLoadMore(sentinel: Element | null, { enabled, onLoad, ahead }: LoadMoreOptions) {
  useEffect(() => {
    if (!sentinel || !enabled) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) onLoad()
      },
      ahead === undefined ? undefined : { rootMargin: `0px 0px ${ahead}px 0px` },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, enabled, onLoad, ahead])
}
