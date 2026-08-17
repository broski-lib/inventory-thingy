import { describe, it, expect } from "vitest"
import {
  PRINT_SIZE_PX,
  PRINT_SIZE_ORDER,
  TAGS_PER_PAGE,
  RACK_ROWS_PER_PAGE,
  chunkByPage,
  chunkTagsByPage,
} from "@/lib/print-sheet"
import type { PrintSize } from "@/lib/constants"

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

describe("chunkByPage", () => {
  it("splits a list into fixed-size pages", () => {
    expect(chunkByPage([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ])
  })

  it("leaves the last page short when the list doesn't divide evenly", () => {
    expect(chunkByPage([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("returns no pages for an empty list", () => {
    expect(chunkByPage([], RACK_ROWS_PER_PAGE)).toEqual([])
  })
})

describe("chunkTagsByPage", () => {
  const tag = (printSize: PrintSize, n: number) => ({ printSize, n })

  it("never mixes sizes on a page", () => {
    const pages = chunkTagsByPage([
      tag("small", 1),
      tag("medium", 1),
      tag("small", 2),
    ])
    expect(pages).toHaveLength(3)
    expect(pages[0].map((t) => t.printSize)).toEqual(["small"])
    expect(pages[1].map((t) => t.printSize)).toEqual(["medium"])
    expect(pages[2].map((t) => t.printSize)).toEqual(["small"])
  })

  it("caps each page at the size's per-page capacity", () => {
    const many = Array.from({ length: TAGS_PER_PAGE.small + 1 }, (_, i) =>
      tag("small", i)
    )
    const pages = chunkTagsByPage(many)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toHaveLength(TAGS_PER_PAGE.small)
    expect(pages[1]).toHaveLength(1)
  })

  it("uses the size's own capacity per page", () => {
    const mixed = [
      ...Array.from({ length: TAGS_PER_PAGE.large }, (_, i) => tag("large", i)),
      ...Array.from({ length: 2 }, (_, i) => tag("small", i)),
    ]
    const pages = chunkTagsByPage(mixed)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toHaveLength(TAGS_PER_PAGE.large)
    expect(pages[1]).toHaveLength(2)
  })
})
