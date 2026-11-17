import { describe, expect, test } from "bun:test"
import { d3Curve } from "@tanstack/charts/d3/shape"
import { curveLinear, curveMonotoneX } from "d3-shape"
import { splitCurve } from "./chart-curve"

const POINTS = [
  [0, 10],
  [10, 30],
  [20, 5],
  [30, 25],
  [40, 20],
] as const

/** The path with its opening move dropped, so a part can be appended to the one before it. */
function withoutMove(path: string) {
  return path.replace(/^M[^LC]+/, "")
}

describe("splitCurve", () => {
  test("the complete and running parts of a smooth line add up to the whole line", () => {
    const whole = d3Curve(curveMonotoneX).line(POINTS)
    const { complete, running } = splitCurve(curveMonotoneX, 1)

    expect(complete.line(POINTS) + withoutMove(running.line(POINTS))).toBe(whole)
  })

  test("the running part starts at the last finished bucket", () => {
    const { running } = splitCurve(curveMonotoneX, 1)

    expect(running.line(POINTS).startsWith("M30,25C")).toBe(true)
  })

  test("a straight line splits the same way", () => {
    const whole = d3Curve(curveLinear).line(POINTS)
    const { complete, running } = splitCurve(curveLinear, 2)

    expect(complete.line(POINTS)).toBe("M0,10L10,30L20,5")
    expect(running.line(POINTS)).toBe("M20,5L30,25L40,20")
    expect(complete.line(POINTS) + withoutMove(running.line(POINTS))).toBe(whole)
  })

  test("with no running bucket the complete part is the whole line and the running part is empty", () => {
    const { complete, running } = splitCurve(curveMonotoneX, 0)

    expect(complete.line(POINTS)).toBe(d3Curve(curveMonotoneX).line(POINTS))
    expect(running.line(POINTS)).toBe("")
  })

  test("a partial first bucket joins the running part, ahead of the complete one", () => {
    const { complete, running } = splitCurve(curveLinear, 1, 1)

    expect(complete.line(POINTS)).toBe("M10,30L20,5L30,25")
    expect(running.line(POINTS)).toBe("M0,10L10,30M30,25L40,20")
  })

  test("both parts keep the whole series' area", () => {
    const top = POINTS
    const bottom = POINTS.map(([x]) => [x, 0] as const)
    const { complete, running } = splitCurve(curveMonotoneX, 1)

    expect(complete.area(top, bottom)).toBe(d3Curve(curveMonotoneX).area(top, bottom))
    expect(running.area(top, bottom)).toBe(complete.area(top, bottom))
  })
})
