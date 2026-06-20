import { env } from "cloudflare:workers"

const KEY_PREFIX = "orgs"
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 8 * 1024 * 1024

export type UploadedImage = {
  key: string
  contentType: string
  size: number
}

export class ImageUploadError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function extForType(contentType: string): "jpg" | "png" | "webp" {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "jpg"
}

function bucket(): R2Bucket {
  return env.ITEM_IMAGES
}

export function buildImageKey(
  orgId: string,
  itemId: string,
  contentType: string
): string {
  const ext = extForType(contentType)
  const ulid = crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase()
  return `${KEY_PREFIX}/${orgId}/items/${itemId}/${ulid}.${ext}`
}

export function buildImageUrl(key: string): string {
  return `/api/images/${key}`
}

function assertKeyInOrg(key: string, orgId: string): void {
  if (!key.startsWith(`${KEY_PREFIX}/${orgId}/`)) {
    throw new ImageUploadError("Forbidden", 403)
  }
}

export async function putItemImage(
  orgId: string,
  itemId: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<UploadedImage> {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new ImageUploadError(
      `Unsupported image type: ${contentType}. Use JPEG, PNG, or WebP.`,
      415
    )
  }
  const size = body.byteLength
  if (size > MAX_BYTES) {
    throw new ImageUploadError(
      `Image too large (${Math.round(size / 1024)} KB > ${
        MAX_BYTES / 1024 / 1024
      } MB).`,
      413
    )
  }
  if (size === 0) {
    throw new ImageUploadError("Empty image payload.", 400)
  }
  const key = buildImageKey(orgId, itemId, contentType)
  const b = bucket()
  await b.put(key, body, {
    httpMetadata: { contentType, cacheControl: "private, max-age=3600" },
  })
  return { key, contentType, size }
}

export async function getItemImage(
  orgId: string,
  key: string
): Promise<R2ObjectBody | null> {
  assertKeyInOrg(key, orgId)
  const b = bucket()
  return await b.get(key)
}

export async function deleteItemImage(
  orgId: string,
  key: string
): Promise<void> {
  if (!key) return
  assertKeyInOrg(key, orgId)
  const b = bucket()
  try {
    await b.delete(key)
  } catch {
    // Best-effort cleanup: leaving an orphan in R2 is non-fatal
    // for the user's request. The next garbage-collection run
    // (or an explicit operator sweep) can clean it up later.
  }
}
