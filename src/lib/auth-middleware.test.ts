import { describe, it, expect, vi } from "vitest"
import { canEditItem, assertCanEditItem } from "@/lib/auth-middleware"
import type { HasFn } from "@/lib/auth-middleware"

function makeHas(result: boolean): HasFn {
  return vi.fn().mockReturnValue(result)
}

describe("canEditItem", () => {
  it("returns true when requiredRole is null", () => {
    const has = makeHas(false)
    expect(canEditItem(has, null)).toBe(true)
  })

  it("returns true when requiredRole is undefined", () => {
    const has = makeHas(false)
    expect(canEditItem(has, undefined)).toBe(true)
  })

  it("calls has() with the required role", () => {
    const has = makeHas(true)
    canEditItem(has, "org:admin")
    expect(has).toHaveBeenCalledWith({ role: "org:admin" })
  })

  it("returns true when has() grants the role", () => {
    const has = makeHas(true)
    expect(canEditItem(has, "org:admin")).toBe(true)
  })

  it("returns false when has() denies the role", () => {
    const has = makeHas(false)
    expect(canEditItem(has, "org:admin")).toBe(false)
  })
})

describe("assertCanEditItem", () => {
  it("does not throw when the user can edit", () => {
    const has = makeHas(true)
    expect(() => assertCanEditItem(has, "org:admin")).not.toThrow()
  })

  it("does not throw when requiredRole is null", () => {
    const has = makeHas(false)
    expect(() => assertCanEditItem(has, null)).not.toThrow()
  })

  it("throws when the user cannot edit", () => {
    const has = makeHas(false)
    expect(() => assertCanEditItem(has, "org:admin")).toThrow(
      "This item can only be updated by org:admin"
    )
  })
})
