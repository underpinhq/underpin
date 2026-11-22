import { describe, expect, test } from "bun:test"
import { listAxeViolations, registerDom, render } from "../test-dom"

registerDom()

describe("AuthCard", () => {
  test("puts the title, error, providers, form and footer in reading order", async () => {
    const { AuthCard } = await import("./auth-card")

    const view = await render(
      <AuthCard
        title="Sign in"
        description="Welcome back."
        error={<p>Wrong password.</p>}
        providers={<button type="button">Continue with GitHub</button>}
        footer={
          <>
            No account? <a href="/sign-up">Sign up</a>
          </>
        }
      >
        <p>Form</p>
      </AuthCard>,
    )

    expect(document.querySelector("h1")?.textContent).toBe("Sign in")
    expect(document.body.textContent).toBe(
      "Sign inWelcome back.Wrong password.Continue with GitHubFormNo account? Sign up",
    )
    expect(await listAxeViolations()).toEqual([])

    await view.unmount()
  })
})

describe("AuthPage", () => {
  test("puts the app's logo in a band above the card, in the page's main landmark", async () => {
    const { AuthCard, AuthPage } = await import("./auth-card")

    const view = await render(
      <AuthPage logo={<a href="https://example.com">Example</a>} background={<svg aria-hidden />}>
        <AuthCard title="Sign in" />
      </AuthPage>,
    )

    expect(document.querySelector("header a")?.textContent).toBe("Example")
    expect(document.querySelector("header svg")).not.toBeNull()
    expect(document.querySelector("main h1")?.textContent).toBe("Sign in")

    await view.unmount()
  })

  test("renders its column as the element passed, for a layout with its own main", async () => {
    const { AuthCard, AuthPage } = await import("./auth-card")

    const view = await render(
      <main>
        <AuthPage logo={<span>Example</span>} render={<div />}>
          <AuthCard title="Sign in" />
        </AuthPage>
      </main>,
    )

    expect(document.querySelectorAll("main")).toHaveLength(1)
    expect(document.getElementById("main")).toBeNull()

    await view.unmount()
  })
})
