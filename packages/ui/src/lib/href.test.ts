import { describe, expect, test } from "bun:test"
import { parseHref } from "./href"

describe("parseHref", () => {
  test("splits a path, its query string and its fragment", () => {
    expect(parseHref("/admin/users?page=2&sort=email#top")).toEqual({
      pathname: "/admin/users",
      search: "?page=2&sort=email",
      hash: "top",
    })
  })

  test("leaves out the query string and fragment when the href has none", () => {
    expect(parseHref("/admin/users/u_1")).toEqual({
      pathname: "/admin/users/u_1",
      search: "",
      hash: undefined,
    })
    expect(parseHref("/admin/users/u_1#sites")).toEqual({
      pathname: "/admin/users/u_1",
      search: "",
      hash: "sites",
    })
  })
})
