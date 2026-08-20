import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("filters out falsy values", () => {
    // Widened past literal types so the falsy branches stay live code.
    const maybe = Boolean(false)
    const zero = Number(0)
    expect(cn("foo", maybe && "bar", undefined, null, "", zero && "baz")).toBe(
      "foo"
    )
  })

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-4", "px-2")).toBe("px-2")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("handles conditional classes", () => {
    const active = Boolean(true)
    const disabled = Boolean(false)
    expect(cn("base", active && "active", disabled && "disabled")).toBe(
      "base active"
    )
  })

  it("handles arrays", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz")
  })

  it("handles nested arrays", () => {
    expect(cn(["foo", ["bar", ["baz"]]])).toBe("foo bar baz")
  })

  it("handle objects", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz")
  })

  it("returns an empty string for no inputs", () => {
    expect(cn()).toBe("")
  })

  it("handles duplicate class strings", () => {
    expect(cn("foo", "foo")).toBe("foo foo")
  })

  it("handles complex class value combinations", () => {
    expect(
      cn("p-4", { "m-2": true, "m-4": false }, ["text-sm", "font-bold"])
    ).toBe("p-4 m-2 text-sm font-bold")
  })
})
