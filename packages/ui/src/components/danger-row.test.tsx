import { describe, expect, mock, test } from "bun:test"
import { click, readDescription, registerDom, render } from "../test-dom"

registerDom()

function findButton(name: string) {
  return [...document.querySelectorAll("button")].find(button => button.textContent === name)
}

function getButton(name: string) {
  const button = findButton(name)
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

const ROW = {
  label: "Delete site",
  description: "Deletes the site and its data.",
  trigger: "Delete site…",
  title: "Delete Acme?",
  confirmDescription: "Every visit recorded for Acme is deleted.",
  action: "Delete site",
}

describe("DangerRow", () => {
  test("opens the confirmation, and Cancel closes it without running the action", async () => {
    const { DangerRow } = await import("./danger-row")
    const onConfirm = mock(() => Promise.resolve())

    const view = await render(<DangerRow {...ROW} onConfirm={onConfirm} />)

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await click(getButton("Delete site…"))

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain("Delete Acme?")
    expect(dialog?.textContent).toContain("Every visit recorded for Acme is deleted.")
    await click(getButton("Cancel"))

    expect(onConfirm).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("asks for the typed name and passes the dialog's labels through", async () => {
    const { DangerRow } = await import("./danger-row")

    const view = await render(
      <DangerRow
        {...ROW}
        confirmText="acme.com"
        cancelLabel="Keep it"
        formatConfirmTextReason={text => `Enter ${text} first.`}
        onConfirm={() => Promise.resolve()}
      />,
    )

    await click(getButton("Delete site…"))

    expect(findButton("Keep it")).toBeDefined()
    expect(getButton("Delete site").getAttribute("aria-disabled")).toBe("true")
    expect(readDescription(getButton("Delete site"))).toContain("Enter acme.com first.")

    await view.unmount()
  })

  test("a disabled row gives its reason, and a failed load takes the button's place", async () => {
    const { DangerRow } = await import("./danger-row")
    const onRetry = mock(() => {})

    const view = await render(
      <>
        <DangerRow
          {...ROW}
          disabledReason="Only the owner can delete the site."
          onConfirm={() => Promise.resolve()}
        />
        <DangerRow
          {...ROW}
          errorTitle="Couldn’t load the site"
          retryLabel="Retry"
          onRetry={onRetry}
          onConfirm={() => Promise.resolve()}
        />
      </>,
    )

    const triggers = [...document.querySelectorAll("button")].filter(
      button => button.textContent === "Delete site…",
    )
    expect(triggers).toHaveLength(1)
    expect(readDescription(triggers[0] as HTMLElement)).toContain(
      "Only the owner can delete the site.",
    )
    expect(document.body.textContent).toContain("Couldn’t load the site")
    await click(getButton("Retry"))
    expect(onRetry).toHaveBeenCalledTimes(1)

    await view.unmount()
  })

  test("a parent drives the confirmation for an action that returns nothing", async () => {
    const { useState } = await import("react")
    const { DangerRow } = await import("./danger-row")
    const onOpenChange = mock((_open: boolean) => {})

    function Row() {
      const [open, setOpen] = useState(false)

      return (
        <DangerRow
          {...ROW}
          open={open}
          onOpenChange={next => {
            onOpenChange(next)
            setOpen(next)
          }}
          onConfirm={() => setOpen(false)}
        />
      )
    }

    const view = await render(<Row />)

    await click(getButton("Delete site…"))
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    await click(getButton("Delete site"))
    const { act } = await import("react")
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await view.unmount()
  })
})
