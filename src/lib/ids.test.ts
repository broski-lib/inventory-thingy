import { describe, it, expect } from "vitest"
import {
  generateUlid,
  isUlid,
  ulidTimestamp,
  generateShortId,
  generateQrCode,
  isShortId,
} from "@/lib/ids"

describe("generateUlid", () => {
  it("returns a 26-character string", () => {
    const id = generateUlid()
    expect(id).toHaveLength(26)
  })

  it("produces strings matching the Crockford base32 alphabet", () => {
    const id = generateUlid()
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it("generates unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUlid()))
    expect(ids.size).toBe(100)
  })

  it("is deterministic when given a fixed timestamp", () => {
    const d = new Date("2024-01-01T00:00:00.000Z")
    // The time portion must be deterministic; randomness varies
    const id1 = generateUlid(d)
    const id2 = generateUlid(d)
    expect(id1.slice(0, 10)).toBe(id2.slice(0, 10))
    // But full id should differ due to randomness
    expect(id1).not.toBe(id2)
  })

  it("produces sortable time-prefixed ids", () => {
    const early = generateUlid(new Date("2020-01-01T00:00:00.000Z"))
    const late = generateUlid(new Date("2024-01-01T00:00:00.000Z"))
    expect(early < late).toBe(true)
  })

  it("throws for negative timestamps", () => {
    expect(() => generateUlid(new Date(-1))).toThrow("invalid timestamp")
  })

  it("throws for NaN timestamp", () => {
    expect(() => generateUlid(new Date("not a date"))).toThrow(
      "invalid timestamp"
    )
  })

  it("uses current time by default", () => {
    const before = Date.now()
    const id = generateUlid()
    const ts = ulidTimestamp(id)
    expect(ts).toBeInstanceOf(Date)
    const after = Date.now()
    expect(ts!.getTime()).toBeGreaterThanOrEqual(before)
    expect(ts!.getTime()).toBeLessThanOrEqual(after)
  })
})

describe("isUlid", () => {
  it("returns true for valid ULIDs", () => {
    expect(isUlid(generateUlid())).toBe(true)
  })

  it("returns false for strings with invalid characters", () => {
    expect(isUlid("IIIIIIIIIIIIIIIIIIIIIIIIII")).toBe(false)
    expect(isUlid("LLLLLLLLLLLLLLLLLLLLLLLLLL")).toBe(false)
    expect(isUlid("UUUUUUUUUUUUUUUUUUUUUUUUUU")).toBe(false)
    expect(isUlid("OOOOOOOOOOOOOOOOOOOOOOOOOO")).toBe(false)
  })

  it("returns false for wrong length strings", () => {
    expect(isUlid("0123456789ABCDEFGHJKMNPQ")).toBe(false)
    expect(isUlid("0123456789ABCDEFGHJKMNPQRSTVWXYZ")).toBe(false)
    expect(isUlid("")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isUlid(null)).toBe(false)
    expect(isUlid(undefined)).toBe(false)
    expect(isUlid(123)).toBe(false)
    expect(isUlid({})).toBe(false)
    expect(isUlid([])).toBe(false)
    expect(isUlid(true)).toBe(false)
  })
})

describe("ulidTimestamp", () => {
  it("extracts the creation timestamp from a ULID", () => {
    const d = new Date("2023-06-15T12:00:00.000Z")
    const id = generateUlid(d)
    const extracted = ulidTimestamp(id)
    expect(extracted).toBeInstanceOf(Date)
    expect(extracted!.getTime()).toBe(d.getTime())
  })

  it("returns null for invalid ULIDs", () => {
    expect(ulidTimestamp("not-a-ulid")).toBeNull()
    expect(ulidTimestamp("IIIIIIIIIIIIIIIIIIIIIIIIII")).toBeNull()
    expect(ulidTimestamp("")).toBeNull()
  })

  it("returns null for non-string values", () => {
    expect(ulidTimestamp(null as unknown as string)).toBeNull()
    expect(ulidTimestamp(undefined as unknown as string)).toBeNull()
    expect(ulidTimestamp(123 as unknown as string)).toBeNull()
  })
})

describe("generateShortId", () => {
  it("returns a string in XXXX-XXXX format", () => {
    const id = generateShortId()
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
  })

  it("has the correct length", () => {
    expect(generateShortId()).toHaveLength(9)
  })

  it("generates unique short IDs", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateShortId()))
    expect(ids.size).toBe(1000)
  })
})

describe("generateQrCode", () => {
  it("produces a valid short ID", () => {
    expect(isShortId(generateQrCode())).toBe(true)
  })

  it("matches the short ID format", () => {
    const qr = generateQrCode()
    expect(qr).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
  })
})

describe("isShortId", () => {
  it("returns true for valid short IDs", () => {
    expect(isShortId("X7R2-M9WP")).toBe(true)
    expect(isShortId("0000-0000")).toBe(true)
    expect(isShortId("ZZZZ-ZZZZ")).toBe(true)
  })

  it("returns false for invalid characters", () => {
    expect(isShortId("IIII-IIII")).toBe(false)
    expect(isShortId("LLLL-LLLL")).toBe(false)
    expect(isShortId("OOOO-OOOO")).toBe(false)
    expect(isShortId("UUUU-UUUU")).toBe(false)
  })

  it("returns false for wrong format", () => {
    expect(isShortId("X7R2M9WP")).toBe(false)
    expect(isShortId("X7R-2M9WP")).toBe(false)
    expect(isShortId("X7R2-M9WPX")).toBe(false)
    expect(isShortId("")).toBe(false)
    expect(isShortId("abc-defg")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isShortId(null)).toBe(false)
    expect(isShortId(undefined)).toBe(false)
    expect(isShortId(123)).toBe(false)
    expect(isShortId({})).toBe(false)
  })

  it("accepts a generated short ID", () => {
    expect(isShortId(generateShortId())).toBe(true)
  })
})

describe("randomBytes fallback (Math.random)", () => {
  it("falls back to Math.random when crypto.getRandomValues is unavailable", () => {
    const orig = (globalThis as Record<string, unknown>).crypto
    delete (globalThis as Record<string, unknown>).crypto
    try {
      // Should not throw — it falls back to Math.random
      const id = generateUlid()
      expect(id).toHaveLength(26)
      const id2 = generateShortId()
      expect(id2).toHaveLength(9)
    } finally {
      ;(globalThis as Record<string, unknown>).crypto = orig
    }
  })
})
