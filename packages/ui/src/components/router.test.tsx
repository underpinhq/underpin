import { describe, expect, test } from "bun:test"
import { registerDom, render } from "../test-dom"

registerDom()

describe("useDataTableRoute", () => {
  test("reads and writes a table whose params are renamed, with no type argument", async () => {
    const { act } = await import("react")
    const { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } =
      await import("@tanstack/react-router")
    const { createDataTableSearch } = await import("../lib/data-table-search")
    const { useDataTableRoute } = await import("./router")

    const table = createDataTableSearch({ keys: { query: "search" } })
    let props: ReturnType<typeof useDataTableRoute> | undefined

    function List() {
      const search = listRoute.useSearch()
      // The call type checks only when the hook infers the renamed keys on its own.
      props = useDataTableRoute(table, search)
      return null
    }

    const rootRoute = createRootRoute()
    const listRoute = createRoute({
      path: "/",
      getParentRoute: () => rootRoute,
      validateSearch: table.schema.extend({}),
      component: List,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([listRoute]),
      history: createMemoryHistory({ initialEntries: ["/?search=acme"] }),
    })

    const view = await render(<RouterProvider router={router} />)
    await act(() => router.load())
    expect(props?.state.search).toBe("acme")

    await act(async () =>
      props?.onStateChange({ ...props.state, search: "beta" }, { replace: false }),
    )
    expect(router.state.location.search).toEqual({ search: "beta" })
    expect(router.history.length).toBe(1)

    await view.unmount()
  })
})
