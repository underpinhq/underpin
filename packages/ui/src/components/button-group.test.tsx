import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

/**
 * The elements a group's class applies `utility` to: each `[&>…]:utility` class is read back as
 * the selector Tailwind builds from it and run against the group, the way the browser would.
 */
function getStyled(group: Element, utility: string) {
  const classes = group.className.split(" ").filter(name => name.endsWith(`]:${utility}`))
  return classes.flatMap(name => {
    const selector = name.slice(2, name.lastIndexOf("]:")).replaceAll("_", " ")
    return [...group.querySelectorAll(`:scope${selector}`)]
  })
}

/** The labels of the buttons among `elements`; the spans beside them are out of the flow. */
function getLabels(elements: Element[]) {
  return elements
    .filter(element => element.tagName === "BUTTON")
    .map(element => element.getAttribute("aria-label"))
}

describe("ButtonGroup", () => {
  test("finds its ends among the members, past guards, owners and hidden reasons", async () => {
    const { ButtonGroup } = await import("./button-group")
    const { Button } = await import("./button")

    const view = await render(
      <ButtonGroup>
        <span data-base-ui-focus-guard="" />
        <Button variant="secondary" aria-label="First" disabled prefix={<svg />} />
        <Button variant="secondary" aria-label="Reasoned" aria-disabled prefix={<svg />} />
        <span hidden>Why it is disabled</span>
        <Button variant="secondary" aria-label="Middle" prefix={<svg />} />
        <Button variant="secondary" aria-label="Last" prefix={<svg />} />
        <span aria-owns="popup" />
      </ButtonGroup>,
    )

    const group = document.querySelector("[data-slot=button-group]")
    if (!group) throw new Error("No group rendered")

    const afterFirst = ["Reasoned", "Middle", "Last"]
    expect(getLabels(getStyled(group, "rounded-l-none"))).toEqual(afterFirst)
    expect(getLabels(getStyled(group, "border-l-0"))).toEqual(afterFirst)
    expect(getLabels(getStyled(group, "rounded-r-none"))).toEqual(["First", "Reasoned", "Middle"])

    await view.unmount()
  })
})
