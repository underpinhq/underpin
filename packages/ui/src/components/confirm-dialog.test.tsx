import { describe, expect, mock, test } from "bun:test"
import { click, press, registerDom, render } from "../test-dom"

registerDom()

interface Deferred {
  promise: Promise<void>
  resolve: () => void
}

/** A promise the test settles by hand, standing in for a running mutation. */
function createDeferred(): Deferred {
  const { promise, resolve } = Promise.withResolvers<void>()
  return { promise, resolve: () => resolve() }
}

function getDialog() {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!dialog) throw new Error("No dialog is open")
  return dialog
}

function getTypedField() {
  const input = getDialog().querySelector("input")
  if (!input) throw new Error("No confirmation field")
  return input
}

/** Lets the popup move focus, which Base UI does a frame after it opens. */
async function waitForFocus() {
  const { act } = await import("react")
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })
}

async function settle(deferred: Deferred) {
  const { act } = await import("react")
  await act(async () => {
    deferred.resolve()
    await deferred.promise
  })
}

function findButton(name: string) {
  return [...document.querySelectorAll("button")].find(button => button.textContent === name)
}

function getButton(name: string) {
  const button = findButton(name)
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

/** Types into a React-controlled input: the native setter, then the event React listens for. */
async function typeInto(input: HTMLInputElement, value: string) {
  const { act } = await import("react")
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")

  await act(async () => {
    descriptor?.set?.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

describe("ConfirmDialog", () => {
  test("runs the action and closes once its promise resolves", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const onOpenChange = mock((_open: boolean) => {})
    const onConfirm = mock(() => Promise.resolve())

    const view = await render(
      <ConfirmDialog
        open
        title="Delete this share link?"
        description="Anyone with the link loses access."
        action="Delete share link"
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    )

    expect(getButton("Cancel")).toBeDefined()
    await click(getButton("Delete share link"))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    await view.unmount()
  })

  test("stays open and reports a rejected action", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const failure = new Error("Network down")
    const onOpenChange = mock((_open: boolean) => {})
    const onError = mock((_error: unknown) => {})

    const view = await render(
      <ConfirmDialog
        open
        title="Remove this member?"
        description="They lose access to every site."
        action="Remove member"
        onOpenChange={onOpenChange}
        onConfirm={() => Promise.reject(failure)}
        onError={onError}
      />,
    )

    await click(getButton("Remove member"))

    expect(onError).toHaveBeenCalledWith(failure)
    expect(onOpenChange).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("unlocks a typed confirmation only on the exact text", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const onConfirm = mock(() => {})

    const view = await render(
      <ConfirmDialog
        open
        title="Delete example.com?"
        description="Its stats are deleted with it."
        action="Delete site"
        confirm={{ text: "example.com" }}
        onConfirm={onConfirm}
      />,
    )

    expect(document.body.textContent).toContain("This cannot be undone.")
    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')
    if (!input) throw new Error("No confirmation field")
    expect(input.labels?.[0]?.textContent).toBe("Type example.com to confirm")

    await typeInto(input, "example")
    await click(getButton("Delete site"))
    expect(onConfirm).not.toHaveBeenCalled()

    await typeInto(input, "example.com")
    await click(getButton("Delete site"))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await view.unmount()
  })

  test("a loose match ignores case and spaces, and the typed text is reported apart", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const onConfirm = mock((..._args: unknown[]) => {})
    const onTextChange = mock((_typed: string) => {})

    const view = await render(
      <ConfirmDialog
        open
        title="Delete go.example.com?"
        description="Its links stop working."
        action="Delete domain"
        confirm={{ text: "go.example.com", match: "loose", onTextChange }}
        onConfirm={onConfirm}
      />,
    )

    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')
    if (!input) throw new Error("No confirmation field")

    await typeInto(input, " Go.Example.org ")
    await click(getButton("Delete domain"))
    expect(onConfirm).not.toHaveBeenCalled()

    await typeInto(input, " Go.Example.com ")
    await click(getButton("Delete domain"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0]).toEqual([])
    expect(onTextChange).toHaveBeenLastCalledWith(" Go.Example.com ")

    await view.unmount()
  })

  test("stays locked with the caller's reason, against a click and Enter", async () => {
    const { act } = await import("react")
    const { readDescription } = await import("../test-dom")
    const { ConfirmDialog } = await import("./confirm-dialog")
    const onConfirm = mock(() => {})

    function renderDialog(reason: string | undefined) {
      return (
        <ConfirmDialog
          open
          title="Reject this ad?"
          description="The advertiser gets your note."
          action="Reject ad"
          confirm={{ disabledReason: reason }}
          onConfirm={onConfirm}
        >
          <input aria-label="Note" />
        </ConfirmDialog>
      )
    }

    const view = await render(renderDialog("Write a note first."))

    expect(readDescription(getButton("Reject ad"))).toContain("Write a note first.")
    await click(getButton("Reject ad"))
    await act(async () => {
      getDialog().querySelector("form")?.requestSubmit()
    })
    expect(onConfirm).not.toHaveBeenCalled()

    await view.rerender(renderDialog(undefined))
    await click(getButton("Reject ad"))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await view.unmount()
  })

  test("takes its labels as props", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")

    const view = await render(
      <ConfirmDialog
        open
        title="Supprimer ce site ?"
        description="Ses statistiques sont supprimées."
        action="Supprimer"
        confirm={{ text: "example.com" }}
        cancelLabel="Annuler"
        irreversibleLabel="Action irréversible."
        formatConfirmTextLabel={text => `Saisissez ${text}`}
        onConfirm={() => {}}
      />,
    )

    expect(findButton("Annuler")).toBeDefined()
    expect(findButton("Cancel")).toBeUndefined()
    expect(document.body.textContent).toContain("Action irréversible.")
    expect(document.body.textContent).toContain("Saisissez example.com")

    await view.unmount()
  })

  test("opens from its own trigger without `open`", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")

    const view = await render(
      <ConfirmDialog
        trigger={<button type="button">Revoke</button>}
        title="Revoke this API key?"
        description="Anything using it stops working."
        action="Revoke key"
        onConfirm={() => {}}
      />,
    )

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await click(getButton("Revoke"))
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    await view.unmount()
  })

  test("focuses the typed field and starts locked each time the parent opens it", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const onConfirm = mock(() => {})

    function renderOpen(open: boolean) {
      return (
        <ConfirmDialog
          open={open}
          title="Delete example.com?"
          description="Its stats are deleted with it."
          action="Delete site"
          confirm={{ text: "example.com" }}
          onConfirm={onConfirm}
        />
      )
    }

    const view = await render(renderOpen(true))
    await waitForFocus()
    expect(document.activeElement === getTypedField()).toBe(true)
    await typeInto(getTypedField(), "example.com")

    await view.rerender(renderOpen(false))
    await view.rerender(renderOpen(true))

    expect(getTypedField().value).toBe("")
    await click(getButton("Delete site"))
    expect(onConfirm).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("cannot be dismissed while the action runs", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const deferred = createDeferred()
    const onOpenChange = mock((_open: boolean) => {})

    const view = await render(
      <ConfirmDialog
        open
        title="Delete this goal?"
        description="Its conversions are deleted with it."
        action="Delete goal"
        onOpenChange={onOpenChange}
        onConfirm={() => deferred.promise}
      />,
    )

    await click(getButton("Delete goal"))
    await press(getDialog(), "Escape")
    await click(getButton("Cancel"))
    expect(onOpenChange).not.toHaveBeenCalled()

    await settle(deferred)
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    await view.unmount()
  })

  test("leaves the dialog alone when the parent closed it before the action settled", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const deferred = createDeferred()
    const onOpenChange = mock((_open: boolean) => {})

    function renderOpen(open: boolean) {
      return (
        <ConfirmDialog
          open={open}
          title="Delete this goal?"
          description="Its conversions are deleted with it."
          action="Delete goal"
          onOpenChange={onOpenChange}
          onConfirm={() => deferred.promise}
        />
      )
    }

    const view = await render(renderOpen(true))
    await click(getButton("Delete goal"))
    await view.rerender(renderOpen(false))
    await settle(deferred)

    expect(onOpenChange).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("never submits a form it is rendered inside", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const onOuterSubmit = mock(() => {})
    const onConfirm = mock(() => {})

    const view = await render(
      <form
        onSubmit={event => {
          event.preventDefault()
          onOuterSubmit()
        }}
      >
        <ConfirmDialog
          open
          title="Remove this filter?"
          description="The report stops filtering on it."
          action="Remove filter"
          onConfirm={onConfirm}
        />
      </form>,
    )

    await click(getButton("Remove filter"))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOuterSubmit).not.toHaveBeenCalled()

    await view.unmount()
  })

  test("does nothing when the action settles after the dialog unmounted", async () => {
    const { ConfirmDialog } = await import("./confirm-dialog")
    const deferred = createDeferred()
    const onOpenChange = mock((_open: boolean) => {})

    const view = await render(
      <ConfirmDialog
        open
        title="Delete this goal?"
        description="Its conversions are deleted with it."
        action="Delete goal"
        onOpenChange={onOpenChange}
        onConfirm={() => deferred.promise}
      />,
    )

    await click(getButton("Delete goal"))
    await view.unmount()
    await settle(deferred)

    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe("ConfirmItemDialog", () => {
  test("an action on one item never closes the dialog for the next", async () => {
    const { ConfirmItemDialog } = await import("./confirm-dialog")
    const deferred = createDeferred()
    const onClose = mock(() => {})

    function renderItem(item: { name: string } | null) {
      return (
        <ConfirmItemDialog
          item={item}
          title={goal => `Delete ${goal.name}?`}
          description={() => "Its conversions are deleted with it."}
          action="Delete goal"
          onClose={onClose}
          onConfirm={() => deferred.promise}
        />
      )
    }

    const view = await render(renderItem({ name: "Signups" }))
    await click(getButton("Delete goal"))
    await press(getDialog(), "Escape")
    expect(onClose).not.toHaveBeenCalled()

    await view.rerender(renderItem(null))
    await view.rerender(renderItem({ name: "Purchases" }))
    await settle(deferred)

    expect(onClose).not.toHaveBeenCalled()
    expect(getDialog().textContent).toContain("Delete Purchases?")
    expect(getButton("Delete goal").hasAttribute("data-pending")).toBe(false)

    await view.unmount()
  })
  test("words the dialog from the item and runs the action on it", async () => {
    const { ConfirmItemDialog } = await import("./confirm-dialog")
    const onConfirm = mock((..._args: unknown[]) => Promise.resolve())
    const onClose = mock(() => {})

    const view = await render(
      <ConfirmItemDialog
        item={{ name: "Signups" }}
        title={goal => `Delete ${goal.name}?`}
        description={() => "Its conversions are deleted with it."}
        action="Delete goal"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Delete Signups?")
    await click(getButton("Delete goal"))

    expect(onConfirm).toHaveBeenCalledWith({ name: "Signups" })
    expect(onClose).toHaveBeenCalledTimes(1)

    await view.unmount()
  })

  test("words the typed text from the item and keeps the rest of `confirm`", async () => {
    const { ConfirmItemDialog } = await import("./confirm-dialog")
    const onConfirm = mock((..._args: unknown[]) => Promise.resolve())
    const onTextChange = mock((_typed: string) => {})

    const view = await render(
      <ConfirmItemDialog
        item={{ name: "Signups" }}
        title={goal => `Delete ${goal.name}?`}
        description={() => "Its conversions are deleted with it."}
        action="Delete goal"
        confirm={{ text: goal => goal.name, match: "loose", onTextChange }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    )

    expect(getTypedField().labels?.[0]?.textContent).toBe("Type Signups to confirm")
    await typeInto(getTypedField(), "signups")
    await click(getButton("Delete goal"))

    expect(onTextChange).toHaveBeenLastCalledWith("signups")
    expect(onConfirm).toHaveBeenCalledWith({ name: "Signups" })

    await view.unmount()
  })
})
