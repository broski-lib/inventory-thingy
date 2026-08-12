import { describe, it, expect } from "vitest"
import { parsePage, parsePageSize } from "@/lib/pagination"

describe("parsePage", () => {
  it("returns the number for positive integers", () => {
    expect(parsePage(1)).toBe(1)
    expect(parsePage(42)).toBe(42)
  })

  it("returns the floor for float numbers", () => {
    expect(parsePage(3.7)).toBe(3)
    expect(parsePage(1.1)).toBe(1)
  })

  it("parses numeric strings", () => {
    expect(parsePage("5")).toBe(5)
    expect(parsePage("100")).toBe(100)
  })

  it("returns undefined for zero", () => {
    expect(parsePage(0)).toBeUndefined()
    expect(parsePage("0")).toBeUndefined()
  })

  it("returns undefined for negative numbers", () => {
    expect(parsePage(-1)).toBeUndefined()
    expect(parsePage("-5")).toBeUndefined()
  })

  it("returns undefined for non-numeric strings", () => {
    expect(parsePage("abc")).toBeUndefined()
    expect(parsePage("page1")).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(parsePage("")).toBeUndefined()
  })

  it("returns undefined for null and undefined", () => {
    expect(parsePage(null)).toBeUndefined()
    expect(parsePage(undefined)).toBeUndefined()
  })

  it("returns undefined for booleans", () => {
    expect(parsePage(true)).toBeUndefined()
    expect(parsePage(false)).toBeUndefined()
  })

  it("returns undefined for NaN", () => {
    expect(parsePage(NaN)).toBeUndefined()
  })

  it("returns Infinity for Infinity (Math.floor passes it through)", () => {
    expect(parsePage(Infinity)).toBe(Infinity)
  })
})

describe("parsePageSize", () => {
  const ALLOWED_SIZES = [10, 25, 50, 100] as const

  it("returns the parsed number when in the allowed list", () => {
    expect(parsePageSize(10, ALLOWED_SIZES)).toBe(10)
    expect(parsePageSize("50", ALLOWED_SIZES)).toBe(50)
    expect(parsePageSize(100, ALLOWED_SIZES)).toBe(100)
  })

  it("returns undefined when not in the allowed list", () => {
    expect(parsePageSize(5, ALLOWED_SIZES)).toBeUndefined()
    expect(parsePageSize("30", ALLOWED_SIZES)).toBeUndefined()
    expect(parsePageSize(200, ALLOWED_SIZES)).toBeUndefined()
  })

  it("returns undefined for null and undefined", () => {
    expect(parsePageSize(null, ALLOWED_SIZES)).toBeUndefined()
    expect(parsePageSize(undefined, ALLOWED_SIZES)).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(parsePageSize("", ALLOWED_SIZES)).toBeUndefined()
  })

  it("returns undefined for non-numeric strings", () => {
    expect(parsePageSize("abc", ALLOWED_SIZES)).toBeUndefined()
  })

  it("handles a single-element allowed list", () => {
    expect(parsePageSize(25, [25])).toBe(25)
    expect(parsePageSize(10, [25])).toBeUndefined()
  })
})
