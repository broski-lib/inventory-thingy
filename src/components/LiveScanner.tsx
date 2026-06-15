import { useCallback, useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import type { QrcodeErrorCallback, QrcodeSuccessCallback } from "html5-qrcode"

type LiveScannerProps = {
  active: boolean
  paused: boolean
  onDetected: (text: string) => void | Promise<void>
  onError?: (message: string) => void
  onStatusChange?: (status: LiveScannerStatus) => void
}

export type LiveScannerStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "paused"
  | "denied"
  | "error"
  | "stopped"

const ELEMENT_ID = "live-qr-reader"

export function LiveScanner({
  active,
  paused,
  onDetected,
  onError,
  onStatusChange,
}: LiveScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [status, setStatus] = useState<LiveScannerStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const onDetectedRef = useRef(onDetected)
  const busyRef = useRef(false)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const updateStatus = useCallback(
    (next: LiveScannerStatus, msg?: string | null) => {
      setStatus(next)
      if (msg !== undefined) setErrorMessage(msg)
      onStatusChange?.(next)
    },
    [onStatusChange]
  )

  useEffect(() => {
    if (!active) return

    let cancelled = false
    updateStatus("starting")
    setErrorMessage(null)

    const scanner = new Html5Qrcode(ELEMENT_ID, /* verbose */ false)
    scannerRef.current = scanner

    const onSuccess: QrcodeSuccessCallback = (decodedText) => {
      if (busyRef.current) return
      busyRef.current = true
      void (async () => {
        try {
          await onDetectedRef.current(decodedText)
        } finally {
          // Small debounce so the same code isn't re-decoded instantly
          setTimeout(() => {
            busyRef.current = false
          }, 1200)
        }
      })()
    }

    const onFailure: QrcodeErrorCallback = () => {
      // No-op: html5-qrcode fires this for every frame without a code
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onSuccess,
        onFailure
      )
      .then(() => {
        if (cancelled) {
          void scanner.stop().catch(() => {})
          return
        }
        updateStatus("scanning")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        if (/permission|denied|notallowed/i.test(message)) {
          updateStatus(
            "denied",
            "Camera access denied. Allow camera in your browser settings."
          )
        } else if (/notfound|no\scamera/i.test(message)) {
          updateStatus("error", "No camera found on this device.")
        } else {
          updateStatus("error", message)
        }
        onError?.(message)
      })

    return () => {
      cancelled = true
      busyRef.current = false
      const ref = scannerRef.current
      scannerRef.current = null
      if (ref) {
        try {
          const state = ref.getState()
          if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
            void ref.stop().catch(() => {})
          } else {
            ref.clear()
          }
        } catch {
          try {
            ref.clear()
          } catch {
            /* noop */
          }
        }
      }
      updateStatus("stopped")
    }
  }, [active, updateStatus])

  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner) return
    if (paused) {
      try {
        scanner.pause(true)
        updateStatus("paused")
      } catch {
        /* noop */
      }
    } else if (status === "paused") {
      try {
        scanner.resume()
        updateStatus("scanning")
      } catch {
        /* noop */
      }
    }
  }, [paused, status, updateStatus])

  return (
    <div className="space-y-2">
      <div
        id={ELEMENT_ID}
        className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black [&_div]:!border-none [&_img]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />
      {status === "starting" && (
        <p className="text-center text-xs text-muted-foreground">
          Starting camera…
        </p>
      )}
      {status === "denied" && (
        <p className="text-center text-xs text-destructive">{errorMessage}</p>
      )}
      {status === "error" && (
        <p className="text-center text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
