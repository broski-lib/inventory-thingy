import { describe, it, expect } from "vitest"
import {
  isAcceptedImage,
  ImageProcessError,
  makePreviewUrl,
  revokePreviewUrl,
} from "@/lib/image-upload"

function makeFile(type: string, size = 1024): File {
  return new File(["x".repeat(size)], "test.jpg", { type })
}

describe("isAcceptedImage", () => {
  it("accepts JPEG images", () => {
    expect(isAcceptedImage(makeFile("image/jpeg"))).toBe(true)
  })

  it("accepts PNG images", () => {
    expect(isAcceptedImage(makeFile("image/png"))).toBe(true)
  })

  it("accepts WebP images", () => {
    expect(isAcceptedImage(makeFile("image/webp"))).toBe(true)
  })

  it("accepts HEIC images", () => {
    expect(isAcceptedImage(makeFile("image/heic"))).toBe(true)
  })

  it("accepts HEIF images", () => {
    expect(isAcceptedImage(makeFile("image/heif"))).toBe(true)
  })

  it("rejects unsupported image types", () => {
    expect(isAcceptedImage(makeFile("image/gif"))).toBe(false)
    expect(isAcceptedImage(makeFile("image/bmp"))).toBe(false)
    expect(isAcceptedImage(makeFile("image/svg+xml"))).toBe(false)
    expect(isAcceptedImage(makeFile("application/pdf"))).toBe(false)
  })

  it("accepts files with empty type (permissive fallback)", () => {
    expect(isAcceptedImage(makeFile(""))).toBe(true)
  })
})

describe("ImageProcessError", () => {
  it("constructs with a message", () => {
    const err = new ImageProcessError("bad image")
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe("bad image")
  })
})

describe("makePreviewUrl", () => {
  it("returns a blob URL string", () => {
    const file = new File(["hello"], "test.png", { type: "image/png" })
    const url = makePreviewUrl(file)
    expect(url).toMatch(/^blob:/)
    URL.revokeObjectURL(url)
  })
})

describe("revokePreviewUrl", () => {
  it("does not throw for valid blob URLs", () => {
    const file = new File(["hello"], "test.png", { type: "image/png" })
    const url = URL.createObjectURL(file)
    expect(() => revokePreviewUrl(url)).not.toThrow()
  })

  it("does not throw for invalid URLs", () => {
    expect(() => revokePreviewUrl("not-a-valid-url")).not.toThrow()
  })

  it("does not throw for empty string", () => {
    expect(() => revokePreviewUrl("")).not.toThrow()
  })
})
