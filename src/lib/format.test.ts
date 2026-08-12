import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { formatRelative, pluralize } from "@/lib/format"

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for dates less than 60 seconds ago', () => {
    expect(formatRelative(new Date("2024-06-15T11:59:30.000Z"))).toBe(
      "just now"
    )
    expect(formatRelative(new Date("2024-06-15T11:59:01.000Z"))).toBe(
      "just now"
    )
    expect(formatRelative(new Date("2024-06-15T12:00:00.000Z"))).toBe(
      "just now"
    )
  })

  it("returns minutes for dates under an hour", () => {
    expect(formatRelative(new Date("2024-06-15T11:58:00.000Z"))).toBe("2m ago")
    expect(formatRelative(new Date("2024-06-15T11:50:00.000Z"))).toBe("10m ago")
    expect(formatRelative(new Date("2024-06-15T11:01:00.000Z"))).toBe("59m ago")
  })

  it("returns hours for dates under 24 hours", () => {
    expect(formatRelative(new Date("2024-06-15T11:00:00.000Z"))).toBe("1h ago")
    expect(formatRelative(new Date("2024-06-15T06:00:00.000Z"))).toBe("6h ago")
    expect(formatRelative(new Date("2024-06-14T13:00:00.000Z"))).toBe("23h ago")
  })

  it("returns days for dates under 7 days", () => {
    expect(formatRelative(new Date("2024-06-14T12:00:00.000Z"))).toBe("1d ago")
    expect(formatRelative(new Date("2024-06-12T12:00:00.000Z"))).toBe("3d ago")
    expect(formatRelative(new Date("2024-06-09T12:00:00.000Z"))).toBe("6d ago")
  })

  it("returns a short date for older dates", () => {
    const result = formatRelative(new Date("2024-01-15T12:00:00.000Z"))
    expect(result).toContain("Jan")
    expect(result).toContain("15")
  })

  it("accepts string dates", () => {
    expect(formatRelative("2024-06-15T11:58:00.000Z")).toBe("2m ago")
  })

  it("correctly rounds half minutes up", () => {
    expect(formatRelative(new Date("2024-06-15T11:59:30.000Z"))).toBe(
      "just now"
    )
  })
})

describe("pluralize", () => {
  it("returns singular for count of 1", () => {
    expect(pluralize(1, "item")).toBe("item")
    expect(pluralize(1, "box")).toBe("box")
  })

  it("appends 's' for count other than 1 when no plural given", () => {
    expect(pluralize(0, "item")).toBe("items")
    expect(pluralize(2, "item")).toBe("items")
    expect(pluralize(100, "item")).toBe("items")
  })

  it("returns the provided plural form", () => {
    expect(pluralize(2, "person", "people")).toBe("people")
    expect(pluralize(0, "child", "children")).toBe("children")
    expect(pluralize(5, "mouse", "mice")).toBe("mice")
  })

  it("returns the provided plural even for count of 0", () => {
    expect(pluralize(0, "sheep", "sheep")).toBe("sheep")
  })
})
