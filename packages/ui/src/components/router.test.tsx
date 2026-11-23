import { describe, expect, test } from "bun:test"
import { z } from "zod"
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

describe("RouterPagedDataTable", () => {
  test("writes a new view into the route's params, keeping the page's own", async () => {
    const { act } = await import("react")
    const { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } =
      await import("@tanstack/react-router")
    const { createDataTableColumnHelper } = await import("../lib/data-table-state")
    const { createDataTableSearch } = await import("../lib/data-table-search")
    const { RouterPagedDataTable } = await import("./router")
    const { TableCell } = await import("./table")
    const { click } = await import("../test-dom")

    interface Account {
      id: string
      name: string
    }

    const table = createDataTableSearch({ perPage: 25 })
    const helper = createDataTableColumnHelper<Account>()
    const columns = helper.columns([
      helper.accessor("name", {
        header: "Name",
        cell: ({ getValue }) => <TableCell>{getValue()}</TableCell>,
      }),
    ])

    function List() {
      const search = listRoute.useSearch()

      return (
        <RouterPagedDataTable
          aria-label="Accounts"
          columns={columns}
          getRowId={account => account.id}
          table={table}
          search={search}
          query={{
            data: { items: [{ id: "user_1", name: "Ada" }], total: 60 },
            error: null,
            isPending: false,
            isPlaceholderData: false,
            refetch: () => {},
          }}
          views={{
            param: "status",
            label: "Account views",
            options: [
              { value: "all", label: "All" },
              { value: "staff", label: "Staff" },
            ],
          }}
          empty={{ icon: <svg />, title: "No accounts yet" }}
        />
      )
    }

    const rootRoute = createRootRoute()
    const listRoute = createRoute({
      path: "/",
      getParentRoute: () => rootRoute,
      validateSearch: table.schema.extend({
        status: z.enum(["staff"]).optional().catch(undefined),
        tab: z.string().optional(),
      }),
      component: List,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([listRoute]),
      history: createMemoryHistory({ initialEntries: ["/?page=2&tab=notes"] }),
    })

    const view = await render(<RouterProvider router={router} />)
    await act(() => router.load())

    const staff = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(
      tab => tab.textContent === "Staff",
    )
    if (!staff) throw new Error("No Staff tab")
    await click(staff)
    expect(router.state.location.search).toEqual({ status: "staff", tab: "notes" })
    expect(router.history.length).toBe(2)

    await view.unmount()
  })
})
