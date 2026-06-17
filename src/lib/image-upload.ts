const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.82
const MAX_INPUT_BYTES = 12 * 1024 * 1024

export type CompressedImage = {
  file: File
  width: number
  height: number
  originalSize: number
  compressedSize: number
}

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

export function isAcceptedImage(file: File): boolean {
  if (!file.type) return true
  return ACCEPTED_TYPES.has(file.type)
}

export class ImageProcessError extends Error {
  constructor(message: string) {
    super(message)
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageProcessError("Could not decode image."))
    }
    img.src = url
  })
}

function drawToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new ImageProcessError("Canvas 2D context unavailable.")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, 0, 0, width, height)
  return { canvas, width, height }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageProcessError("Could not encode compressed image."))
          return
        }
        resolve(blob)
      },
      type,
      quality
    )
  })
}

async function tryBitmapWithOrientation(
  file: File
): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null
  try {
    return await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions)
  } catch {
    return null
  }
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessError(
      `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${
        MAX_INPUT_BYTES / 1024 / 1024
      } MB.`
    )
  }
  if (!isAcceptedImage(file)) {
    throw new ImageProcessError("Unsupported image format.")
  }

  const originalSize = file.size
  const bitmap = await tryBitmapWithOrientation(file)
  const { canvas, width, height } = bitmap
    ? drawToCanvas(bitmap, bitmap.width, bitmap.height)
    : await (async () => {
        const img = await loadImage(file)
        return drawToCanvas(img, img.naturalWidth, img.naturalHeight)
      })()
  if (bitmap) bitmap.close()

  const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY)
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, "") + ".jpg",
    { type: "image/jpeg", lastModified: Date.now() }
  )

  return {
    file: compressedFile,
    width,
    height,
    originalSize,
    compressedSize: compressedFile.size,
  }
}

export function makePreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

export function revokePreviewUrl(url: string): void {
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}
