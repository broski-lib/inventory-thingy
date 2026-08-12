import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  buildImageKey,
  buildImageUrl,
  ImageUploadError,
  putItemImage,
  getItemImage,
  deleteItemImage,
} from "@/lib/storage"
import { setMockImages } from "../__mocks__/cloudflare-workers"

describe("buildImageKey", () => {
  it("returns an org-scoped key with the correct structure", () => {
    const key = buildImageKey("org_abc", "item_xyz", "image/jpeg")
    expect(key).toMatch(
      /^orgs\/org_abc\/items\/item_xyz\/[0-9A-HJKMNP-TV-Z]{26}\.jpg$/
    )
  })

  it("uses .png extension for PNG content type", () => {
    const key = buildImageKey("org_abc", "item_xyz", "image/png")
    expect(key).toMatch(/\.png$/)
  })

  it("uses .webp extension for WebP content type", () => {
    const key = buildImageKey("org_abc", "item_xyz", "image/webp")
    expect(key).toMatch(/\.webp$/)
  })

  it("uses .jpg for unknown content types", () => {
    const key = buildImageKey("org_abc", "item_xyz", "image/gif")
    expect(key).toMatch(/\.jpg$/)
  })

  it("produces unique keys on successive calls", () => {
    const key1 = buildImageKey("org_abc", "item_xyz", "image/jpeg")
    const key2 = buildImageKey("org_abc", "item_xyz", "image/jpeg")
    expect(key1).not.toBe(key2)
  })
})

describe("buildImageUrl", () => {
  it("wraps the key in /api/images/", () => {
    expect(buildImageUrl("orgs/foo/items/bar/ABC.jpg")).toBe(
      "/api/images/orgs/foo/items/bar/ABC.jpg"
    )
  })

  it("handles empty string key", () => {
    expect(buildImageUrl("")).toBe("/api/images/")
  })
})

describe("ImageUploadError", () => {
  it("constructs with message and default 400 status", () => {
    const err = new ImageUploadError("bad image")
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe("bad image")
    expect(err.status).toBe(400)
  })

  it("accepts custom status code", () => {
    const err = new ImageUploadError("not found", 404)
    expect(err.status).toBe(404)
  })
})

describe("putItemImage", () => {
  beforeEach(() => {
    setMockImages({
      put: vi.fn().mockResolvedValue(undefined),
    })
  })

  it("rejects unsupported image types", async () => {
    await expect(
      putItemImage("org_1", "item_1", new Uint8Array(10), "image/gif")
    ).rejects.toThrow("Unsupported image type")
  })

  it("rejects images over 8MB", async () => {
    const big = new Uint8Array(9 * 1024 * 1024)
    await expect(
      putItemImage("org_1", "item_1", big, "image/jpeg")
    ).rejects.toThrow("Image too large")
  })

  it("rejects empty payload", async () => {
    await expect(
      putItemImage("org_1", "item_1", new Uint8Array(0), "image/jpeg")
    ).rejects.toThrow("Empty image payload")
  })

  it("uploads valid images and returns metadata", async () => {
    const body = new Uint8Array(1024)
    const result = await putItemImage("org_1", "item_1", body, "image/png")
    expect(result).toHaveProperty("key")
    expect(result).toHaveProperty("contentType", "image/png")
    expect(result).toHaveProperty("size", 1024)
    expect(result.key).toMatch(/\.png$/)
  })

  it("accepts ArrayBuffer", async () => {
    const body = new Uint8Array(512).buffer
    const result = await putItemImage("org_1", "item_1", body, "image/webp")
    expect(result.contentType).toBe("image/webp")
  })
})

describe("getItemImage", () => {
  it("throws for keys outside the org scope", async () => {
    await expect(
      getItemImage("org_1", "orgs/other_org/items/x/ABC.jpg")
    ).rejects.toThrow("Forbidden")
  })

  it("calls bucket.get for valid org-scoped keys", async () => {
    const mockGet = vi.fn().mockResolvedValue(null)
    setMockImages({ get: mockGet })
    await getItemImage("org_1", "orgs/org_1/items/x/ABC.jpg")
    expect(mockGet).toHaveBeenCalledWith("orgs/org_1/items/x/ABC.jpg")
  })
})

describe("deleteItemImage", () => {
  it("does nothing for empty key", async () => {
    const mockDelete = vi.fn()
    setMockImages({ delete: mockDelete })
    await deleteItemImage("org_1", "")
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("throws for keys outside the org scope", async () => {
    await expect(
      deleteItemImage("org_1", "orgs/other_org/items/x/ABC.jpg")
    ).rejects.toThrow("Forbidden")
  })

  it("calls bucket.delete for valid keys", async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined)
    setMockImages({ delete: mockDelete })
    await deleteItemImage("org_1", "orgs/org_1/items/x/ABC.jpg")
    expect(mockDelete).toHaveBeenCalledWith("orgs/org_1/items/x/ABC.jpg")
  })

  it("swallows bucket delete errors", async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error("R2 down"))
    setMockImages({ delete: mockDelete })
    await expect(
      deleteItemImage("org_1", "orgs/org_1/items/x/ABC.jpg")
    ).resolves.toBeUndefined()
  })
})
