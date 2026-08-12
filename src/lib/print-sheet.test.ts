import { describe, it, expect } from "vitest"
import { PRINT_SIZE_PX } from "@/lib/print-sheet"

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
