export type QrImageOptions = {
  width: number
  margin: number
}

const cache = new Map<string, Promise<string>>()

/**
 * Render a QR code to a cached blob object URL. Blob URLs are cheaper for
 * the browser to decode than data URLs (faster print, less memory), and
 * memoizing by code+size means re-renders are instant — the expensive canvas
 * work happens once per session. The qrcode library is imported lazily so it
 * stays out of the initial bundle.
 */
export function getQrImage(
  code: string,
  opts: QrImageOptions
): Promise<string> {
  const key = `${code}|${opts.width}|${opts.margin}`
  let promise = cache.get(key)
  if (!promise) {
    promise = render(code, opts)
    cache.set(key, promise)
  }
  return promise
}

async function render(code: string, opts: QrImageOptions): Promise<string> {
  const qr = await import("qrcode")
  const canvas = document.createElement("canvas")
  await qr.toCanvas(canvas, code, opts)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob))
      else reject(new Error("Failed to render QR code"))
    }, "image/png")
  })
}
