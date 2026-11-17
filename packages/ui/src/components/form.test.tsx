import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

/** Submits the only form on the page and lets the validation and the focus move settle. */
async function submitForm() {
  const { act } = await import("react")

  await act(async () => {
    document.querySelector("form")?.requestSubmit()
    await new Promise(resolve => setTimeout(resolve, 20))
  })
}

async function loadForm() {
  const { createFormHook } = await import("@tanstack/react-form")
  const form = await import("./form")
  const { useAppForm } = createFormHook({
    fieldContext: form.fieldContext,
    formContext: form.formContext,
    fieldComponents: form.fieldComponents,
    formComponents: form.formComponents,
  })

  return { Form: form.Form, useAppForm }
}

describe("Form fields", () => {
  test("a checkbox shows its error, is marked invalid and takes focus", async () => {
    const { Form, useAppForm } = await loadForm()

    function Terms() {
      const form = useAppForm({
        defaultValues: { accepted: false },
        validators: {
          onSubmit: ({ value }) =>
            value.accepted ? undefined : { fields: { accepted: "Accept the terms." } },
        },
      })

      return (
        <Form form={form}>
          <form.AppField name="accepted">
            {field => <field.CheckboxField label="I accept the terms" />}
          </form.AppField>
        </Form>
      )
    }

    const view = await render(<Terms />)
    await submitForm()

    const checkbox = document.querySelector<HTMLElement>('[role="checkbox"]')
    const message = document.getElementById(checkbox?.getAttribute("aria-describedby") ?? "")
    expect(checkbox?.getAttribute("aria-invalid")).toBe("true")
    expect(message?.textContent).toBe("Accept the terms.")
    expect(document.activeElement).toBe(checkbox)
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })

  test("a switch shows its error and is marked invalid", async () => {
    const { Form, useAppForm } = await loadForm()

    function Consent() {
      const form = useAppForm({
        defaultValues: { consent: false },
        validators: {
          onSubmit: ({ value }) =>
            value.consent ? undefined : { fields: { consent: "Turn it on to go on." } },
        },
      })

      return (
        <Form form={form}>
          <form.AppField name="consent">
            {field => <field.SwitchField label="Email me" description="Once a week." />}
          </form.AppField>
        </Form>
      )
    }

    const view = await render(<Consent />)
    await submitForm()

    const control = document.querySelector<HTMLElement>('[role="switch"]')
    const describedBy = control?.getAttribute("aria-describedby")?.split(" ") ?? []
    expect(control?.getAttribute("aria-invalid")).toBe("true")
    expect(describedBy).toHaveLength(2)
    expect(document.getElementById(describedBy[1] ?? "")?.textContent).toBe("Turn it on to go on.")
    expect(document.activeElement).toBe(control)

    await view.unmount()
  })

  test("an unpicked radio-card field shows its error and focuses a card", async () => {
    const { Form, useAppForm } = await loadForm()

    function Plan() {
      const form = useAppForm({
        defaultValues: { plan: "" },
        validators: {
          onSubmit: ({ value }) => (value.plan ? undefined : { fields: { plan: "Pick a plan." } }),
        },
      })

      return (
        <Form form={form}>
          <form.AppField name="plan">
            {field => (
              <field.RadioCardField
                label="Plan"
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                ]}
              />
            )}
          </form.AppField>
        </Form>
      )
    }

    const view = await render(<Plan />)
    await submitForm()

    const group = document.querySelector<HTMLElement>('[role="radiogroup"]')
    expect(group?.getAttribute("aria-invalid")).toBe("true")
    expect(
      document.getElementById(group?.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe("Pick a plan.")
    expect(document.activeElement?.getAttribute("role")).toBe("radio")

    await view.unmount()
  })

  test("a field under a reason stays reachable, reads the reason and cannot change", async () => {
    const { Form, useAppForm } = await loadForm()
    const { TooltipProvider } = await import("./tooltip")
    const { act } = await import("react")
    const reason = "Only an admin can change this."
    let values: { name: string; model: string; focus: string } | undefined

    function Settings() {
      const form = useAppForm({
        defaultValues: { name: "Blog", model: "last", focus: "traffic" },
        listeners: {
          onChange: ({ formApi }) => {
            values = formApi.state.values
          },
        },
      })

      return (
        <Form form={form}>
          <form.AppField name="name">
            {field => <field.TextField label="Name" disabledReason={reason} />}
          </form.AppField>
          <form.AppField name="model">
            {field => (
              <field.SelectField
                label="Model"
                items={{ last: "Last touch", first: "First touch" }}
                disabledReason={reason}
              />
            )}
          </form.AppField>
          <form.AppField name="focus">
            {field => (
              <field.RadioCardField
                label="Focus"
                options={[
                  { value: "traffic", label: "Traffic" },
                  { value: "revenue", label: "Revenue" },
                ]}
                disabledReason={reason}
              />
            )}
          </form.AppField>
        </Form>
      )
    }

    const view = await render(
      <TooltipProvider>
        <Settings />
      </TooltipProvider>,
    )

    const input = document.querySelector<HTMLInputElement>("input[name='name']")
    const trigger = document.querySelector<HTMLElement>('[role="combobox"]')
    const radios = document.querySelectorAll<HTMLElement>('[role="radio"]')
    for (const control of [input, trigger, radios[0]]) {
      if (!control) throw new Error("No control")
      expect(control.hasAttribute("disabled")).toBe(false)
      expect(control.tabIndex).toBe(0)
      const ids = control.getAttribute("aria-describedby")?.split(" ") ?? []
      expect(ids.map(id => document.getElementById(id)?.textContent)).toContain(reason)
    }
    expect(input?.getAttribute("aria-disabled")).toBe("true")
    expect(input?.readOnly).toBe(true)
    expect(trigger?.getAttribute("aria-disabled")).toBe("true")
    // The radios' group is read-only instead: the arrow keys skip a radio marked disabled.
    const group = document.querySelector('[role="radiogroup"]')
    expect(group?.getAttribute("aria-readonly")).toBe("true")

    await act(async () => {
      trigger?.click()
      radios[1]?.click()
      radios[0]?.focus()
      radios[0]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
      )
    })
    expect(document.activeElement === radios[1]).toBe(true)
    expect(document.querySelector('[role="listbox"]') === null).toBe(true)
    expect(values).toBeUndefined()

    await view.unmount()
  })

  test("a card under its own reason reads it and cannot be picked, beside one that can", async () => {
    const { Form, useAppForm } = await loadForm()
    const { TooltipProvider } = await import("./tooltip")
    const { act } = await import("react")
    const reason = "Only an admin can give write access."

    function Access() {
      const form = useAppForm({ defaultValues: { access: "read" } })

      return (
        <Form form={form}>
          <form.AppField name="access">
            {field => (
              <field.RadioCardField
                label="Access"
                options={[
                  { value: "read", label: "Read only" },
                  { value: "write", label: "Read and write", disabledReason: reason },
                ]}
              />
            )}
          </form.AppField>
        </Form>
      )
    }

    const view = await render(
      <TooltipProvider>
        <Access />
      </TooltipProvider>,
    )

    const [read, write] = document.querySelectorAll<HTMLElement>('[role="radio"]')
    function readDescription(radio?: HTMLElement) {
      const ids = radio?.getAttribute("aria-describedby")?.split(" ") ?? []
      return ids.map(id => document.getElementById(id)?.textContent)
    }
    expect(readDescription(write)).toContain(reason)
    expect(readDescription(read)).not.toContain(reason)

    await act(async () => {
      write?.click()
    })
    expect(read?.getAttribute("aria-checked")).toBe("true")
    expect(write?.getAttribute("aria-checked")).toBe("false")

    await view.unmount()
  })
})
