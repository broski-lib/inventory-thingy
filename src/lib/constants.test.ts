import { describe, it, expect } from "vitest"
import {
  ITEM_STATUSES,
  ITEM_CONDITIONS,
  ITEM_KINDS,
  PRINT_SIZES,
  TAG_COLORS,
  ACTIVITY_ACTIONS,
  STOCK_STATUS_FILTERS,
  STOCK_SORTS,
  DEFAULT_STOCK_SORT,
} from "@/lib/constants"

describe("ITEM_STATUSES", () => {
  it("contains expected statuses", () => {
    expect(ITEM_STATUSES).toContain("Available")
    expect(ITEM_STATUSES).toContain("In Storage")
    expect(ITEM_STATUSES).toContain("Reserved")
    expect(ITEM_STATUSES).toContain("Staged")
    expect(ITEM_STATUSES).toContain("Repair")
    expect(ITEM_STATUSES).toContain("Retired")
    expect(ITEM_STATUSES).toContain("Pending Tag")
  })

  it("has 7 statuses", () => {
    expect(ITEM_STATUSES).toHaveLength(7)
  })
})

describe("ITEM_CONDITIONS", () => {
  it("contains all conditions", () => {
    expect(ITEM_CONDITIONS).toEqual(["Excellent", "Good", "Worn", "Repair"])
  })
})

describe("ITEM_KINDS", () => {
  it("contains unit and bulk kinds", () => {
    expect(ITEM_KINDS).toEqual(["unit", "bulk"])
  })
})

describe("PRINT_SIZES", () => {
  it("contains small, medium, large", () => {
    expect(PRINT_SIZES).toEqual(["small", "medium", "large"])
  })
})

describe("TAG_COLORS", () => {
  it("has 9 colors", () => {
    expect(TAG_COLORS).toHaveLength(9)
  })

  it("each color has a name and hex value", () => {
    for (const color of TAG_COLORS) {
      expect(color).toHaveProperty("name")
      expect(color).toHaveProperty("value")
      expect(typeof color.value).toBe("string")
      expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it("has expected color names", () => {
    const names = TAG_COLORS.map((c) => c.name)
    expect(names).toContain("Red")
    expect(names).toContain("Blue")
    expect(names).toContain("Green")
    expect(names).toContain("Gray")
  })
})

describe("ACTIVITY_ACTIONS", () => {
  it("contains all expected actions", () => {
    expect(ACTIVITY_ACTIONS).toContain("created")
    expect(ACTIVITY_ACTIONS).toContain("updated")
    expect(ACTIVITY_ACTIONS).toContain("deleted")
    expect(ACTIVITY_ACTIONS).toContain("checked_out")
    expect(ACTIVITY_ACTIONS).toContain("checked_in")
    expect(ACTIVITY_ACTIONS).toContain("reported_damaged")
    expect(ACTIVITY_ACTIONS).toContain("moved")
    expect(ACTIVITY_ACTIONS).toContain("condition_changed")
  })

  it("has 8 actions", () => {
    expect(ACTIVITY_ACTIONS).toHaveLength(8)
  })
})

describe("STOCK_STATUS_FILTERS", () => {
  it("contains All plus specific filterable statuses", () => {
    expect(STOCK_STATUS_FILTERS).toContain("All")
    expect(STOCK_STATUS_FILTERS).toContain("Available")
    expect(STOCK_STATUS_FILTERS).toContain("Staged")
    expect(STOCK_STATUS_FILTERS).toContain("Repair")
    expect(STOCK_STATUS_FILTERS).toContain("Pending Tag")
  })

  it("matches item status subset", () => {
    for (const filter of STOCK_STATUS_FILTERS) {
      if (filter !== "All") {
        expect(ITEM_STATUSES).toContain(filter)
      }
    }
  })
})

describe("STOCK_SORTS", () => {
  it("has 8 sort options", () => {
    expect(STOCK_SORTS).toHaveLength(8)
  })

  it("each sort has id and label", () => {
    for (const sort of STOCK_SORTS) {
      expect(sort).toHaveProperty("id")
      expect(sort).toHaveProperty("label")
      expect(typeof sort.id).toBe("string")
      expect(typeof sort.label).toBe("string")
    }
  })

  it("DEFAULT_STOCK_SORT is a valid sort id", () => {
    const ids = STOCK_SORTS.map((s) => s.id)
    expect(ids).toContain(DEFAULT_STOCK_SORT)
    expect(DEFAULT_STOCK_SORT).toBe("updated_desc")
  })
})
