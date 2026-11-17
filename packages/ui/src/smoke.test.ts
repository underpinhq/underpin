import { describe, expect, test } from "bun:test"

/**
 * Smoke test that the public entry points import cleanly from source and expose the expected
 * shapes. It is not a rendering test (no DOM needed): it exists so `bun test` has a real,
 * green check that catches gross breakage (a bad export, a broken import graph) in CI.
 */
describe("@underpin/ui exports", () => {
  test("component subpaths export their components", async () => {
    const { Button } = await import("./components/button")
    const { Badge } = await import("./components/badge")
    const { Input } = await import("./components/input")
    const { Stack } = await import("./components/stack")
    const { Skeleton } = await import("./components/skeleton")
    const { Kbd } = await import("./components/kbd")

    for (const component of [Button, Badge, Input, Stack, Skeleton, Kbd]) {
      expect(typeof component).toBe("function")
    }
  })

  test("autocomplete exports its parts", async () => {
    const parts = await import("./components/autocomplete")

    for (const part of Object.values(parts)) {
      expect(typeof part).toBe("function")
    }
  })

  test("promoted component subpaths export their components", async () => {
    const { Card, CardHeader, CardPanel } = await import("./components/card")
    const { SectionHeader } = await import("./components/section-header")
    const { EmptyState } = await import("./components/empty-state")
    const { Callout } = await import("./components/callout")
    const { EntityAvatar } = await import("./components/entity-avatar")
    const { Toaster } = await import("./components/toaster")

    const components = [
      Card,
      CardHeader,
      CardPanel,
      SectionHeader,
      EmptyState,
      Callout,
      EntityAvatar,
      Toaster,
    ]

    for (const component of components) {
      expect(typeof component).toBe("function")
    }
  })

  test("tier 1 component subpaths export their components", async () => {
    const { FormattedNumber } = await import("./components/formatted-number")
    const { StatStrip, StatStripItem } = await import("./components/stat-strip")
    const { Pagination } = await import("./components/pagination")
    const { CopyInput } = await import("./components/copy-input")
    const { NavButton, NavButtonSkeleton, NavIdentity } = await import("./components/nav-button")

    const components = [
      // Memoised, so the component is the function it wraps.
      FormattedNumber.type,
      StatStrip,
      StatStripItem,
      Pagination,
      CopyInput,
      NavButton,
      NavButtonSkeleton,
      NavIdentity,
    ]

    for (const component of components) {
      expect(typeof component).toBe("function")
    }
  })

  test("dashboard primitive subpaths export their components", async () => {
    const { ThemeSelect, useTheme } = await import("./components/theme")
    const { BarList } = await import("./components/bar-list")
    const { BreakdownCard } = await import("./components/breakdown-card")
    const { ViewPicker } = await import("./components/view-picker")
    const { TimeSeriesChart } = await import("./components/time-series-chart")
    const { niceTicks } = await import("./lib/time-series")

    const components = [
      ThemeSelect,
      useTheme,
      BarList,
      BarList.Row,
      BarList.Skeleton,
      BreakdownCard,
      ViewPicker,
      TimeSeriesChart,
      niceTicks,
    ]

    for (const component of components) {
      expect(typeof component).toBe("function")
    }
  })

  test("calendar subpaths export their components", async () => {
    const { Calendar } = await import("./components/calendar")
    const { DatePicker } = await import("./components/date-picker")
    const { dayToDate, dateToDay } = await import("./lib/day")

    for (const exported of [Calendar, DatePicker, dayToDate, dateToDay]) {
      expect(typeof exported).toBe("function")
    }
  })

  test("a calendar day survives the round trip in any timezone", async () => {
    const { dayToDate, dateToDay } = await import("./lib/day")

    // The trap these two exist for: `new Date("2026-01-01")` is parsed as UTC midnight, which
    // is the 31st of December anywhere west of Greenwich. Reading the local calendar fields
    // keeps the day the string named.
    for (const day of ["2026-01-01", "2026-09-14", "2026-12-31", "2028-02-29"]) {
      const date = dayToDate(day)
      expect(date && dateToDay(date)).toBe(day)
    }

    expect(dayToDate(undefined)).toBeUndefined()
    expect(dayToDate("")).toBeUndefined()
  })

  test("the package ships no public icon registry", async () => {
    // A variable, so neither tsc nor knip tries to resolve the missing module.
    const registry = "./components/icons"
    // Bun types `rejects` matchers as void, but they return a promise the test must await.
    // oxlint-disable-next-line typescript/await-thenable
    await expect(import(registry)).rejects.toThrow()
  })

  test("lib subpaths export their helpers", async () => {
    const { cn, variants } = await import("./lib/variants")
    const { interactiveVariants } = await import("./lib/interactive")
    const { ANIMATION_DURATION, easeOutExpo } = await import("./lib/animation")

    expect(typeof cn).toBe("function")
    expect(typeof variants).toBe("function")
    expect(typeof interactiveVariants).toBe("function")
    expect(typeof ANIMATION_DURATION).toBe("number")
    expect(easeOutExpo(0)).toBe(0)
    expect(easeOutExpo(1)).toBe(1)
  })
})
