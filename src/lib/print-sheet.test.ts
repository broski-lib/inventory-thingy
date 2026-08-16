import { describe, it, expect } from "vitest"
import { PRINT_SIZE_PX, PRINT_SIZE_ORDER } from "@/lib/print-sheet"

describe("PRINT_SIZE_PX", () => {
  it("has expected dimensions", () => {
    expect(PRINT_SIZE_PX.small).toBe(80)
    expect(PRINT_SIZE_PX.medium).toBe(160)
    expect(PRINT_SIZE_PX.large).toBe(200)
  })

  it("only has small, medium, and large keys", () => {
    const keys = Object.keys(PRINT_SIZE_PX)
    expect(keys).toEqual(["small", "medium", "large"])
  })

  it("all sizes increase in order", () => {
    expect(PRINT_SIZE_PX.small).toBeLessThan(PRINT_SIZE_PX.medium)
    expect(PRINT_SIZE_PX.medium).toBeLessThan(PRINT_SIZE_PX.large)
  })
})

describe("PRINT_SIZE_ORDER", () => {
  it("ranks every print size uniquely", () => {
    const keys = Object.keys(PRINT_SIZE_ORDER)
    expect(keys.sort()).toEqual(["large", "medium", "small"])
    expect(new Set(Object.values(PRINT_SIZE_ORDER)).size).toBe(keys.length)
  })

  it("groups same-sized tags together when used as a sort key", () => {
    const items = [
      { qrCode: "A", printSize: "small" },
      { qrCode: "B", printSize: "large" },
      { qrCode: "C", printSize: "medium" },
      { qrCode: "D", printSize: "large" },
    ] as const
    const sorted = [...items].sort(
      (a, b) =>
        PRINT_SIZE_ORDER[a.printSize] - PRINT_SIZE_ORDER[b.printSize] ||
        a.qrCode.localeCompare(b.qrCode)
    )
    expect(sorted.map((i) => i.printSize)).toEqual([
      "large",
      "large",
      "medium",
      "small",
    ])
  })
})
